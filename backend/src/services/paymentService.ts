import { pool } from '../config/database';
import { createHash, randomBytes } from 'crypto';
import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../utils/apiError';

export const createPaymentIntent = async (reservationIds: string[], userId: string) => {
  if (!reservationIds.length || reservationIds.length > 10 || new Set(reservationIds).size !== reservationIds.length) {
    throw new ApiError('Choose between one and ten distinct reservations', 400);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reservations = await client.query(
      `SELECT reservation.id, reservation.event_id FROM reservations reservation
       JOIN seats seat ON seat.id = reservation.seat_id
       WHERE reservation.id = ANY($1::uuid[]) AND reservation.user_id = $2
         AND reservation.status = 'pending' AND reservation.expires_at > NOW()
         AND seat.status = 'held' AND seat.held_by_user_id = $2 AND seat.hold_expires_at > NOW()
       ORDER BY reservation.id
       FOR UPDATE OF reservation, seat`,
      [reservationIds, userId],
    );
    if (reservations.rows.length !== reservationIds.length) {
      throw new ApiError('One or more reservations are missing, expired, or do not belong to this user', 409);
    }
    if (new Set(reservations.rows.map((reservation) => reservation.event_id)).size !== 1) {
      throw new ApiError('All reservations in a payment must belong to the same event', 400);
    }

    const paymentIntentId = `pi_${uuidv4()}`;
    const scanToken = randomBytes(32).toString('hex');
    const scanTokenHash = createHash('sha256').update(scanToken).digest('hex');
    const result = await client.query(
      `INSERT INTO payments (reservation_id, user_id, amount, payment_intent_id, mock_scan_token_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, payment_intent_id, amount, status, created_at`,
      [reservationIds[0], userId, 550 * reservationIds.length, paymentIntentId, scanTokenHash],
    );
    await client.query(
      `INSERT INTO payment_reservations (payment_id, reservation_id)
       SELECT $1, unnest($2::uuid[])`,
      [result.rows[0].id, reservationIds],
    );
    await client.query('COMMIT');
    return { ...result.rows[0], scan_token: scanToken };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

type PendingPayment = { id: string; reservation_id: string; user_id: string };

async function confirmPendingPayment(client: PoolClient, payment: PendingPayment) {
  const expectedResult = await client.query(
    `SELECT COUNT(*)::integer AS count FROM payment_reservations WHERE payment_id = $1`,
    [payment.id],
  );
  const expectedCount = Number(expectedResult.rows[0].count) || 1;
  const reservationResult = await client.query(
    `SELECT reservation.id, reservation.seat_id FROM reservations reservation
     LEFT JOIN payment_reservations grouped ON grouped.reservation_id = reservation.id
     WHERE (grouped.payment_id = $1 OR
       (NOT EXISTS (SELECT 1 FROM payment_reservations WHERE payment_id = $1) AND reservation.id = $2))
       AND reservation.user_id = $3 AND reservation.status = 'pending' AND reservation.expires_at > NOW()
     ORDER BY reservation.id
     FOR UPDATE OF reservation`,
    [payment.id, payment.reservation_id, payment.user_id],
  );
  if (reservationResult.rows.length !== expectedCount) return false;

  const seatIds = reservationResult.rows.map((reservation) => reservation.seat_id as string);
  const seatResult = await client.query(
    `UPDATE seats SET status = 'sold', hold_expires_at = NULL
     WHERE id = ANY($1::uuid[]) AND held_by_user_id = $2
       AND status = 'held' AND hold_expires_at > NOW()
     RETURNING id`,
    [seatIds, payment.user_id],
  );
  if (seatResult.rows.length !== seatIds.length) return false;

  await client.query(
    `UPDATE payments SET status = 'succeeded', mock_scan_token_hash = NULL WHERE id = $1`,
    [payment.id],
  );
  await client.query(
    `UPDATE payments SET mock_scan_token_hash = NULL
     WHERE reservation_id = ANY($1::uuid[]) AND id <> $2`,
    [reservationResult.rows.map((reservation) => reservation.id), payment.id],
  );
  await client.query(
    `UPDATE reservations SET status = 'confirmed' WHERE id = ANY($1::uuid[])`,
    [reservationResult.rows.map((reservation) => reservation.id)],
  );
  return true;
}

export const processMockScan = async (scanToken: string) => {
  if (!/^[a-f0-9]{64}$/.test(scanToken)) return false;

  const tokenHash = createHash('sha256').update(scanToken).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const paymentResult = await client.query(
      `SELECT id, reservation_id, user_id FROM payments
       WHERE mock_scan_token_hash = $1 AND status = 'pending'
       FOR UPDATE`,
      [tokenHash],
    );
    const payment = paymentResult.rows[0] as PendingPayment | undefined;
    if (!payment) {
      await client.query('ROLLBACK');
      return false;
    }

    if (!await confirmPendingPayment(client, payment)) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query('COMMIT');
    return payment.reservation_id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const processWebhook = async (paymentIntentId: string, status: string, userId?: string) => {
  if (status !== 'succeeded' && status !== 'failed') {
    throw new Error('Unsupported payment status');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const paymentResult = await client.query(
      `SELECT id, reservation_id, user_id, status FROM payments
       WHERE payment_intent_id = $1 AND ($2::uuid IS NULL OR user_id = $2)
       FOR UPDATE`,
      [paymentIntentId, userId || null],
    );
    const payment = paymentResult.rows[0];
    if (!payment || payment.status !== 'pending') {
      await client.query('ROLLBACK');
      return false;
    }

    if (status === 'failed') {
      await client.query(
        `UPDATE payments SET status = 'failed', mock_scan_token_hash = NULL WHERE id = $1`,
        [payment.id],
      );
      await client.query('COMMIT');
      return true;
    }

    if (!await confirmPendingPayment(client, payment)) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
