import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', async (req, res, next) => {
  try {
    const { eventId } = req.query;
    const seatStats = await query('SELECT status, COUNT(*) FROM seats WHERE event_id = $1 GROUP BY status', [eventId]);
    const queueStats = await query('SELECT status, COUNT(*) FROM queue_entries WHERE event_id = $1 GROUP BY status', [eventId]);
    res.json({ seats: seatStats.rows, queue: queueStats.rows });
  } catch (error) { next(error); }
});

router.get('/flags', async (req, res, next) => {
  try {
    const flags = await query('SELECT * FROM risk_flags ORDER BY created_at DESC LIMIT 100');
    res.json(flags.rows);
  } catch (error) { next(error); }
});

router.get('/orders', async (req, res, next) => {
  try {
    const orders = await query('SELECT * FROM reservations ORDER BY created_at DESC LIMIT 100');
    res.json(orders.rows);
  } catch (error) { next(error); }
});

export default router;
