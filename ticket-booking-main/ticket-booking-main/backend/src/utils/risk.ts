import { query } from '../config/database';

export const flagRisk = async (userId: string, eventId: string | null, flagType: string, details: any) => {
  try {
    await query(
      'INSERT INTO risk_flags (user_id, event_id, flag_type, details) VALUES ($1, $2, $3, $4)',
      [userId, eventId, flagType, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Failed to log risk flag', error);
  }
};
