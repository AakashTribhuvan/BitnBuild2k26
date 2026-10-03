import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { holdSeatLimiter } from '../middleware/rateLimit';
import * as seatService from '../services/seatService';
import { query } from '../config/database';

const router = Router();

const isAdmitted = async (userId: string, eventId: string) => {
  const result = await query(
    `SELECT 1 FROM queue_entries WHERE user_id = $1 AND event_id = $2 AND status = 'admitted'`,
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
    res.json(seats);
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
    const { eventId, seatId } = req.body;
    const reservation = await seatService.holdSeat(req.user!.userId, eventId, seatId);
    res.json(reservation);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
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
