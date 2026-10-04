import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { joinQueueLimiter, queueOverviewLimiter } from '../middleware/rateLimit';
import * as queueService from '../services/queueService';
import { query } from '../config/database';

const router = Router();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.post('/join', authenticate, joinQueueLimiter, async (req, res, next) => {
  try {
    const { eventId, captchaToken, activity } = req.body;
    if (typeof eventId !== 'string' || !uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'A valid eventId is required' });
    }
    if (captchaToken !== undefined && typeof captchaToken !== 'string') {
      return res.status(400).json({ error: 'captchaToken must be a string' });
    }
    const entry = await queueService.joinQueue(req.user!.userId, eventId, captchaToken, activity);
    res.json(entry);
  } catch (error) { next(error); }
});

router.get('/status', authenticate, async (req, res, next) => {
  try {
    const { eventId, activeSeconds, manualRefreshes } = req.query;
    if (typeof eventId !== 'string' || !uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'A valid eventId is required' });
    }
    const status = await queueService.getQueueStatus(req.user!.userId, eventId, {
      activeSeconds: Number(activeSeconds),
      manualRefreshes: Number(manualRefreshes),
    });
    if (!status) return res.status(404).json({ error: 'Queue entry not found' });
    res.json(status);
  } catch (error) { next(error); }
});

router.get('/overview', queueOverviewLimiter, async (req, res, next) => {
  try {
    const { eventId } = req.query;
    if (eventId !== undefined && (typeof eventId !== 'string' || !uuidPattern.test(eventId))) {
      return res.status(400).json({ error: 'eventId must be a valid UUID' });
    }
    const overview = await queueService.getOperationsOverview(eventId);
    if (!overview) return res.status(404).json({ error: 'No active event found' });
    res.json(overview);
  } catch (error) { next(error); }
});

router.get('/simulation-results', queueOverviewLimiter, async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, event_name, status, human_count, bot_count, human_admitted,
         bot_admitted, human_average_score, bot_average_score,
         maximum_batch_admitted, batch_count, request_count, request_errors,
         duration_seconds, seat_count, configuration, created_at
       FROM simulation_runs ORDER BY created_at DESC LIMIT 10`,
    );
    res.json({ runs: result.rows });
  } catch (error) { next(error); }
});

export default router;
