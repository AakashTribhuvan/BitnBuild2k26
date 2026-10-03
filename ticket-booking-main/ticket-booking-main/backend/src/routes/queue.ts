import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { joinQueueLimiter } from '../middleware/rateLimit';
import * as queueService from '../services/queueService';

const router = Router();

router.post('/join', authenticate, joinQueueLimiter, async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const entry = await queueService.joinQueue(req.user!.userId, eventId);
    res.json(entry);
  } catch (error) { next(error); }
});

router.get('/status', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.query;
    const status = await queueService.getQueueStatus(req.user!.userId, eventId as string);
    res.json(status);
  } catch (error) { next(error); }
});

router.post('/shuffle', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const shuffledCount = await queueService.shuffleQueue(eventId);
    res.json({ success: true, count: shuffledCount });
  } catch (error) { next(error); }
});

export default router;
