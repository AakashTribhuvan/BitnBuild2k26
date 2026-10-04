import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { holdSeatLimiter } from '../middleware/rateLimit';
import * as seatService from '../services/seatService';
import { query } from '../config/database';

const router = Router();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isAdmitted = async (userId: string, eventId: string) => {
  const result = await query(
    `SELECT 1 FROM queue_entries
     WHERE user_id = $1 AND event_id = $2 AND status = 'admitted'
       AND admission_consumed_at IS NULL AND admission_expires_at > NOW()`,
    [userId, eventId]
  );
  return result.rows.length > 0;
};

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.query;
    if (typeof eventId !== 'string') return res.status(400).json({ error: 'eventId is required' });
    if (!(await isAdmitted(req.user!.userId, eventId))) {
      return res.status(403).json({ error: 'Queue admission required' });
    }
    const seats = await seatService.getEventSeats(eventId);
    const event = await query('SELECT purchase_limit_per_user FROM events WHERE id = $1', [eventId]);
    res.json({ seats, purchaseLimit: Number(event.rows[0]?.purchase_limit_per_user ?? 2) });
  } catch (error) { next(error); }
});

router.get('/available', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.query;
    if (typeof eventId !== 'string') return res.status(400).json({ error: 'eventId is required' });
    if (!(await isAdmitted(req.user!.userId, eventId))) {
      return res.status(403).json({ error: 'Queue admission required' });
    }
    const seats = await seatService.getAvailableSeats(eventId);
    res.json(seats);
  } catch (error) { next(error); }
});

router.post('/hold', authenticate, holdSeatLimiter, async (req, res, next) => {
  try {
    const { eventId, seatId, seatIds } = req.body;
    if (typeof eventId !== 'string' || !uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'A valid eventId is required' });
    }
    const requestedSeatIds = seatIds === undefined ? [seatId] : seatIds;
    if (!Array.isArray(requestedSeatIds) || requestedSeatIds.length < 1 || requestedSeatIds.length > 10
      || requestedSeatIds.some((id: unknown) => typeof id !== 'string' || !uuidPattern.test(id))) {
      return res.status(400).json({ error: 'Choose between one and ten valid seat IDs' });
    }
    if (req.body.captchaToken !== undefined && typeof req.body.captchaToken !== 'string') {
      return res.status(400).json({ error: 'captchaToken must be a string' });
    }
    const reservations = await seatService.holdSeats(
      req.user!.userId,
      eventId,
      requestedSeatIds as string[],
      req.body.captchaToken,
    );
    res.json({ reservations });
  } catch (error) {
    next(error);
  }
});

router.delete('/hold/:seatId', authenticate, async (req, res, next) => {
  try {
    const released = await seatService.releaseSeat(req.user!.userId, req.params.seatId);
    if (!released) return res.status(404).json({ error: 'Active hold not found' });
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
