import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM reservations WHERE user_id = $1 ORDER BY created_at DESC', [req.user!.userId]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT reservation.id, reservation.status, reservation.expires_at, reservation.created_at,
         reservation.seat_id, seat.seat_number, reservation.event_id, event.name AS event_name,
         payment.amount, payment.status AS payment_status, payment.payment_intent_id,
         COALESCE(payment.booked_seats,
           json_build_array(json_build_object('reservation_id', reservation.id, 'seat_id', seat.id, 'seat_number', seat.seat_number))
         ) AS booked_seats
       FROM reservations reservation
       LEFT JOIN seats seat ON seat.id = reservation.seat_id
       LEFT JOIN events event ON event.id = reservation.event_id
       LEFT JOIN LATERAL (
         SELECT payment.amount, payment.status, payment.payment_intent_id,
           (SELECT json_agg(json_build_object(
             'reservation_id', grouped_reservation.id,
             'seat_id', grouped_seat.id,
             'seat_number', grouped_seat.seat_number
           ) ORDER BY grouped_seat.seat_number)
            FROM payment_reservations grouped_link
            JOIN reservations grouped_reservation ON grouped_reservation.id = grouped_link.reservation_id
            JOIN seats grouped_seat ON grouped_seat.id = grouped_reservation.seat_id
            WHERE grouped_link.payment_id = payment.id) AS booked_seats
         FROM payments payment
         WHERE payment.reservation_id = reservation.id ORDER BY payment.created_at DESC LIMIT 1
       ) payment ON TRUE
       WHERE reservation.id = $1 AND reservation.user_id = $2`,
      [req.params.id, req.user!.userId],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

export default router;
