import { admitBatch } from '../services/queueService';
import { logger } from '../config/logger';
import { pool } from '../config/database';

export const run = async () => {
  try {
    // Admit users for active events
    const activeEvents = await pool.query(`SELECT id FROM events WHERE status = 'active'`);
    for (const event of activeEvents.rows) {
      const admitted = await admitBatch(event.id, 50);
      if (admitted && admitted > 0) {
        logger.info(`Admitted ${admitted} users for event ${event.id}`);
      }
    }
  } catch (error) {
    logger.error('Error admitting queue', error);
  }
};
