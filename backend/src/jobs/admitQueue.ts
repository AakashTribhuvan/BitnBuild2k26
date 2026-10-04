import { admitBatch } from '../services/queueService';
import { logger } from '../config/logger';
import { pool } from '../config/database';

export const run = async () => {
  try {
    const activeEvents = await pool.query(`SELECT id FROM events WHERE status = 'active'`);
    for (const event of activeEvents.rows) {
      const batch = await admitBatch(event.id);
      if (batch.candidateCount > 0) {
        logger.info(`Queue batch for event ${event.id}: ${batch.admittedCount}/${batch.candidateCount} admitted`);
      }
    }
  } catch (error) {
    logger.error('Error admitting queue', error);
  }
};
