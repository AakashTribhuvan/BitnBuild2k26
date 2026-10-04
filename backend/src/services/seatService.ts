import { pool } from '../config/database';
import { isTurnstileConfigured, verifyTurnstile } from './captchaService';
import { ApiError } from '../utils/apiError';

export const holdSeats = async (userId: string, eventId: string, seatIds: string[], captchaToken?: string) => {
  if (!seatIds.length || new Set(seatIds).size !== seatIds.length) {
    throw new ApiError('Choose one or more distinct seats', 400);
  }
  const holdMinutes = Number.parseInt(process.env.SEAT_HOLD_MINUTES || '10', 10);
  if (!Number.isSafeInteger(holdMinutes) || holdMinutes < 1) {
    throw new Error('Seat hold duration must be a positive whole number of minutes');
  }

  const attempt = await pool.query(
    `UPDATE queue_entries
     SET behavior_signals = jsonb_set(
       behavior_signals,
       '{reservation_attempts}',
       to_jsonb(COALESCE((behavior_signals->>'reservation_attempts')::integer, 0) + 1),
       true
     )
     WHERE user_id = $1 AND event_id = $2 AND status = 'admitted'
       AND admission_consumed_at IS NULL AND admission_expires_at > NOW()
     RETURNING human_score, captcha_verified`,
    [userId, eventId],
  );
  if (!attempt.rows[0]) throw new ApiError('Your admission pass expired. Rejoin the queue for another chance.', 403);

  if (Number(attempt.rows[0].human_score) < 45 && isTurnstileConfigured()) {
    const verified = await verifyTurnstile(captchaToken, true, 'seat_hold');
    if (verified && !attempt.rows[0].captcha_verified) {
      await pool.query(
        `UPDATE queue_entries SET captcha_verified = TRUE WHERE user_id = $1 AND event_id = $2`,
        [userId, eventId],
      );
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const admission = await client.query(
      `SELECT 1 FROM queue_entries
       WHERE user_id = $1 AND event_id = $2 AND status = 'admitted'
         AND admission_consumed_at IS NULL AND admission_expires_at > NOW()
       FOR UPDATE`,
      [userId, eventId]
    );
    if (admission.rows.length === 0) {
      throw new ApiError('You must be admitted to the queue before holding a seat', 403);
    }

    const userLock = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (userLock.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }

    // Check purchase limit
    const limitRes = await client.query(
      `SELECT COUNT(*) FROM reservations
       WHERE user_id = $1 AND event_id = $2 AND status IN ('pending','confirmed')`,
      [userId, eventId]
    );
    const eventRes = await client.query('SELECT purchase_limit_per_user FROM events WHERE id = $1', [eventId]);
    const limit = eventRes.rows[0]?.purchase_limit_per_user || 2;
    if (parseInt(limitRes.rows[0].count, 10) + seatIds.length > limit) {
      throw new ApiError('Purchase limit exceeded', 409);
    }

    // Lock in stable order so concurrent multi-seat selections cannot deadlock.
    const seatRes = await client.query(
      `SELECT id FROM seats
       WHERE id = ANY($1::uuid[]) AND event_id = $2 AND status = 'available'
       ORDER BY id
       FOR UPDATE`,
      [seatIds, eventId]
    );
    if (seatRes.rows.length !== seatIds.length) {
      throw new ApiError('Seat not available', 409);
    }

    await client.query(
      `UPDATE seats
       SET status = 'held', held_by_user_id = $1,
           hold_expires_at = NOW() + ($3 * INTERVAL '1 minute')
       WHERE id = ANY($2::uuid[])`,
      [userId, seatIds, holdMinutes]
    );

    const res = await client.query(
      `INSERT INTO reservations (user_id, event_id, seat_id, status, expires_at)
       SELECT $1, $2, seat_id, 'pending', NOW() + ($4 * INTERVAL '1 minute')
       FROM unnest($3::uuid[]) AS seat_id
       RETURNING *`,
      [userId, eventId, seatIds, holdMinutes]
    );

    await client.query(
      `UPDATE queue_entries SET status = 'reserved', admission_consumed_at = NOW()
       WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId],
    );

    await client.query('COMMIT');
    const reservationsBySeat = new Map(res.rows.map((reservation) => [reservation.seat_id as string, reservation]));
    return seatIds.map((seatId) => reservationsBySeat.get(seatId)!);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const holdSeat = async (userId: string, eventId: string, seatId: string, captchaToken?: string) => {
  const reservations = await holdSeats(userId, eventId, [seatId], captchaToken);
  return reservations[0];
};

export const releaseSeat = async (userId: string, seatId: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE seats
       SET status = 'available', held_by_user_id = NULL, hold_expires_at = NULL
       WHERE id = $1 AND held_by_user_id = $2 AND status = 'held'
       RETURNING id`,
      [seatId, userId]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(
      `UPDATE reservations SET status = 'cancelled'
       WHERE seat_id = $1 AND user_id = $2 AND status = 'pending'`,
      [seatId, userId]
    );
    await client.query(
      `UPDATE queue_entries entry SET status = 'waiting', queue_order = NULL, admitted_at = NULL,
         admission_expires_at = NULL, admission_consumed_at = NULL
       FROM reservations reservation
       WHERE reservation.seat_id = $1 AND reservation.user_id = $2
         AND entry.user_id = reservation.user_id AND entry.event_id = reservation.event_id
         AND reservation.status = 'cancelled'
         AND NOT EXISTS (
           SELECT 1 FROM reservations active
           WHERE active.user_id = entry.user_id AND active.event_id = entry.event_id
             AND active.status IN ('pending', 'confirmed')
         )`,
      [seatId, userId],
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getAvailableSeats = async (eventId: string) => {
  const res = await pool.query(
    `SELECT id, seat_number, status FROM seats
     WHERE event_id = $1 AND status = 'available' ORDER BY seat_number`,
    [eventId]
  );
  return res.rows;
};

export const getEventSeats = async (eventId: string) => {
  const res = await pool.query(
    'SELECT id, seat_number, status FROM seats WHERE event_id = $1 ORDER BY seat_number',
    [eventId]
  );
  return res.rows;
};
