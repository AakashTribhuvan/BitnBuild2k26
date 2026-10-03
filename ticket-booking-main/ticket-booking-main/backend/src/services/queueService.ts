import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';

export const joinQueue = async (userId: string, eventId: string) => {
  const token = uuidv4();
  const res = await query(
    `INSERT INTO queue_entries (user_id, event_id, token, status)
     VALUES ($1, $2, $3, 'waiting')
     ON CONFLICT (user_id, event_id) DO UPDATE SET token = EXCLUDED.token
     RETURNING *`,
    [userId, eventId, token]
  );
  return res.rows[0];
};

export const shuffleQueue = async (eventId: string) => {
  const users = await query('SELECT id FROM queue_entries WHERE event_id = $1 AND status = \'waiting\'', [eventId]);
  let array = users.rows.map(r => r.id);
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  
  for (let i = 0; i < array.length; i++) {
    await query('UPDATE queue_entries SET queue_order = $1 WHERE id = $2', [i + 1, array[i]]);
  }
  return array.length;
};

export const admitBatch = async (eventId: string, batchSize: number) => {
  const result = await query(`
    UPDATE queue_entries 
    SET status = 'admitted', admitted_at = NOW()
    WHERE id IN (
      SELECT id FROM queue_entries 
      WHERE event_id = $1 AND status = 'waiting' AND queue_order IS NOT NULL
      ORDER BY queue_order ASC 
      LIMIT $2
    )
    RETURNING id
  `, [eventId, batchSize]);
  return result.rowCount;
};

export const getQueueStatus = async (userId: string, eventId: string) => {
  const res = await query(
    `SELECT entry.status, entry.queue_order, entry.admitted_at,
      CASE WHEN entry.queue_order IS NULL THEN NULL ELSE (
        SELECT COUNT(*) FROM queue_entries ahead
        WHERE ahead.event_id = entry.event_id AND ahead.status = 'waiting'
          AND ahead.queue_order <= entry.queue_order
      ) END AS position,
      (SELECT COUNT(*) FROM queue_entries waiting
        WHERE waiting.event_id = entry.event_id AND waiting.status = 'waiting'
      ) AS total_waiting
     FROM queue_entries entry
     WHERE entry.user_id = $1 AND entry.event_id = $2`,
    [userId, eventId]
  );
  return res.rows[0] || null;
};
