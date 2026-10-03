import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import queueRoutes from './routes/queue';
import seatsRoutes from './routes/seats';
import reservationsRoutes from './routes/reservations';
import paymentsRoutes from './routes/payments';
import adminRoutes from './routes/admin';

import * as expireHoldsJob from './jobs/expireHolds';
import * as admitQueueJob from './jobs/admitQueue';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORSORIGIN || '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/events', eventsRoutes);
app.use('/queue', queueRoutes);
app.use('/seats', seatsRoutes);
app.use('/reservations', reservationsRoutes);
app.use('/payments', paymentsRoutes);
app.use('/admin', adminRoutes);

app.use(errorHandler);

// Cron jobs
cron.schedule('* * * * *', () => {
  expireHoldsJob.run();
});

cron.schedule('*/5 * * * *', () => {
  // admit batch every 5 mins or so
  admitQueueJob.run();
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
