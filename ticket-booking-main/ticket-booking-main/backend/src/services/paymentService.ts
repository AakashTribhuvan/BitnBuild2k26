import { pool } from '../config/database';
import { createHash, randomBytes } from 'crypto';
import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export const createPaymentIntent = async (reservationId: string, userId: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reservation = await client.query(
      `SELECT reservation.id FROM reservations reservation
       JOIN seats seat ON seat.id = reservation.seat_id
       WHERE reservation.id = $1 AND reservation.user_id = $2
         AND reservation.status = 'pending' AND reservation.expires_at > NOW()
         AND seat.status = 'held' AND seat.held_by_user_id = $2 AND seat.hold_expires_at > NOW()
       FOR UPDATE OF reservation, seat`,
      [reservationId, userId]
    );
    if (reservation.rows.length === 0) {
      throw new Error('Reservation is missing, expired, or does not belong to this user');
    }
    const paymentIntentId = `pi_${uuidv4()}`;
    const scanToken = randomBytes(32).toString('hex');
    const scanTokenHash = createHash('sha256').update(scanToken).digest('hex');
    const result = await client.query(
      `INSERT INTO payments (reservation_id, user_id, amount, payment_intent_id, mock_scan_token_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING payment_intent_id, amount, status, created_at`,
      [reservationId, userId, 550, paymentIntentId, scanTokenHash]
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
  const reservationResult = await client.query(
    `SELECT id, seat_id FROM reservations
     WHERE id = $1 AND user_id = $2 AND status = 'pending' AND expires_at > NOW()
     FOR UPDATE`,
    [payment.reservation_id, payment.user_id]
  );
  const reservation = reservationResult.rows[0];
  if (!reservation) return false;

  const seatResult = await client.query(
    `UPDATE seats SET status = 'sold', hold_expires_at = NULL
     WHERE id = $1 AND held_by_user_id = $2 AND status = 'held' AND hold_expires_at > NOW()
     RETURNING id`,
    [reservation.seat_id, payment.user_id]
  );
  if (seatResult.rows.length === 0) return false;

  await client.query(
    `UPDATE payments SET status = 'succeeded', mock_scan_token_hash = NULL
     WHERE id = $1`,
    [payment.id]
  );
  await client.query(
    `UPDATE payments SET mock_scan_token_hash = NULL
     WHERE reservation_id = $1 AND id <> $2`,
    [payment.reservation_id, payment.id]
  );
  await client.query(`UPDATE reservations SET status = 'confirmed' WHERE id = $1`, [reservation.id]);
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
      [tokenHash]
    );
    const payment = paymentResult.rows[0] as PendingPayment | undefined;
    if (!payment) {
      await client.query('ROLLBACK');
      return false;
    }

    const confirmed = await confirmPendingPayment(client, payment);
    if (!confirmed) {
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
      [paymentIntentId, userId || null]
    );
    const payment = paymentResult.rows[0];
    if (!payment || payment.status !== 'pending') {
      await client.query('ROLLBACK');
      return false;
    }

    if (status === 'failed') {
      await client.query(
        `UPDATE payments SET status = 'failed', mock_scan_token_hash = NULL WHERE id = $1`,
        [payment.id]
      );
      await client.query('COMMIT');
      return true;
    }

    const confirmed = await confirmPendingPayment(client, {
      id: payment.id,
      reservation_id: payment.reservation_id,
      user_id: payment.user_id,
    });
    if (!confirmed) {
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
