import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { mockScanLimiter, paymentIntentLimiter } from '../middleware/rateLimit';
import * as paymentService from '../services/paymentService';

const router = Router();

router.post('/create-intent', authenticate, paymentIntentLimiter, async (req, res, next) => {
  try {
    const { reservationId } = req.body;
    const payment = await paymentService.createPaymentIntent(reservationId, req.user!.userId);
    res.json(payment);
  } catch (error) { next(error); }
});

router.post('/webhook', async (req, res, next) => {
  try {
    const { payment_intent_id, status } = req.body;
    const processed = await paymentService.processWebhook(payment_intent_id, status);
    if (!processed) return res.status(409).json({ error: 'Payment could not be processed' });
    res.json({ received: true, processed });
  } catch (error) { next(error); }
});

router.post('/mock-scan/:token', mockScanLimiter, async (req, res, next) => {
  try {
    const reservationId = await paymentService.processMockScan(req.params.token);
    if (!reservationId) {
      return res.status(409).json({ error: 'This demo payment QR is invalid, expired, or already used' });
    }
    res.json({ success: true, reservationId, simulated: true });
  } catch (error) { next(error); }
});

router.post('/mock-success', authenticate, async (req, res, next) => {
  try {
    const { payment_intent_id } = req.body;
    const processed = await paymentService.processWebhook(payment_intent_id, 'succeeded', req.user!.userId);
    if (!processed) return res.status(409).json({ error: 'Payment could not be processed' });
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
