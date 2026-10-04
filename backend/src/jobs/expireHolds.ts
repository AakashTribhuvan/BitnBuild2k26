import { pool } from '../config/database';
import { logger } from '../config/logger';
import type { PoolClient } from 'pg';

export const run = async () => {
  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;
    const seats = await client.query(`
      UPDATE seats 
      SET status = 'available', held_by_user_id = NULL, hold_expires_at = NULL 
      WHERE status = 'held' AND hold_expires_at <= NOW()
      RETURNING id
    `);
    const reservations = await client.query(`
      UPDATE reservations SET status = 'expired'
      WHERE status = 'pending' AND expires_at <= NOW()
      RETURNING id
    `);
    await client.query(
      `UPDATE queue_entries entry SET status = 'waiting', queue_order = NULL, admitted_at = NULL,
         admission_expires_at = NULL, admission_consumed_at = NULL
       WHERE entry.status = 'reserved'
         AND EXISTS (
           SELECT 1 FROM reservations expired
           WHERE expired.user_id = entry.user_id AND expired.event_id = entry.event_id
             AND expired.status = 'expired'
         )
         AND NOT EXISTS (
           SELECT 1 FROM reservations active
           WHERE active.user_id = entry.user_id AND active.event_id = entry.event_id
             AND active.status IN ('pending', 'confirmed')
         )`,
    );
    await client.query('COMMIT');
    transactionStarted = false;

    if (seats.rowCount && seats.rowCount > 0) {
      logger.info(`Released ${seats.rowCount} expired seat holds`);
    }
    if (reservations.rowCount && reservations.rowCount > 0) {
      logger.info(`Expired ${reservations.rowCount} pending reservations`);
    }
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error rolling back expired holds transaction', rollbackError);
      }
    }
    logger.error('Error expiring holds', error);
  } finally {
    client?.release();
  }
};
