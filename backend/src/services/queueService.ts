import { randomInt, randomUUID } from 'crypto';
import { pool, query } from '../config/database';
import { isTurnstileConfigured, isTurnstileRequired, verifyTurnstile } from './captchaService';
import { ApiError } from '../utils/apiError';

type ActivitySignals = {
  activeSeconds?: number;
  manualRefreshes?: number;
};

type QueueCandidate = {
  id: string;
  user_id: string;
  human_score: number;
  captcha_verified: boolean;
  behavior_signals: Record<string, unknown>;
};

const BATCH_SIZE = 15;
const BATCH_INTERVAL_SECONDS = 10;

const configuredInteger = (name: string, fallback: number, minimum: number, maximum: number) => {
  const value = Number.parseInt(process.env[name] || String(fallback), 10);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a whole number between ${minimum} and ${maximum}`);
  }
  return value;
};

const normalizeActivity = (signals?: ActivitySignals) => ({
  activeSeconds: Math.max(0, Math.min(300, Math.floor(Number(signals?.activeSeconds) || 0))),
  manualRefreshes: Math.max(0, Math.min(100, Math.floor(Number(signals?.manualRefreshes) || 0))),
});

const scoreHumanity = (
  googleVerified: boolean,
  captchaVerified: boolean,
  activeSeconds: number,
  manualRefreshes: number,
  statusRequests: number,
  rapidRequests: number,
  reservationAttempts: number,
) => {
  let score = 20;
  if (googleVerified) score += 25;
  if (captchaVerified) score += 25;
  score += Math.min(15, Math.floor(activeSeconds / 3));
  if (manualRefreshes > 50) score -= 25;
  else if (manualRefreshes > 15) score -= 15;
  else if (manualRefreshes > 5) score -= 5;
  if (statusRequests > 100) score -= 20;
  else if (statusRequests > 50) score -= 10;
  if (rapidRequests > 10) score -= 20;
  else if (rapidRequests > 4) score -= 10;
  if (reservationAttempts > 6) score -= 25;
  else if (reservationAttempts > 3) score -= 15;
  return Math.max(0, Math.min(100, score));
};

const weightedSample = <T extends { human_score: number }>(candidates: T[], count: number) => {
  const remaining = [...candidates];
  const selected: T[] = [];
  while (remaining.length && selected.length < count) {
    const weights = remaining.map((candidate) => Math.max(1, candidate.human_score));
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    let choice = randomInt(totalWeight);
    let chosenIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      choice -= weights[i];
      if (choice < 0) {
        chosenIndex = i;
        break;
      }
    }
    selected.push(remaining.splice(chosenIndex, 1)[0]);
  }
  return selected;
};

export const joinQueue = async (
  userId: string,
  eventId: string,
  captchaToken?: string,
  requestedActivity?: ActivitySignals,
) => {
  const profile = await query('SELECT google_sub, is_demo FROM users WHERE id = $1', [userId]);
  if (!profile.rows[0]) throw new ApiError('User not found', 404);
  if (process.env.QUEUE_REQUIRE_GOOGLE !== 'false' && !profile.rows[0].google_sub && !profile.rows[0].is_demo) {
    throw new ApiError('Verified Google sign-in is required to join this waiting room', 403);
  }

  const captchaVerified = await verifyTurnstile(captchaToken, undefined, 'join_queue');
  const activity = normalizeActivity(requestedActivity);
  const score = scoreHumanity(Boolean(profile.rows[0].google_sub), captchaVerified,
    activity.activeSeconds, activity.manualRefreshes, 0, 0, 0);
  const token = randomUUID();
  const result = await query(
    `INSERT INTO queue_entries
       (user_id, event_id, token, status, captcha_verified, human_score, behavior_signals)
     VALUES ($1, $2, $3, 'waiting', $4, $5, $6::jsonb)
     ON CONFLICT (user_id, event_id) DO UPDATE
       SET token = queue_entries.token,
           status = CASE
             WHEN queue_entries.status = 'reserved' AND NOT EXISTS (
               SELECT 1 FROM reservations
               WHERE reservations.user_id = queue_entries.user_id
                 AND reservations.event_id = queue_entries.event_id
                 AND reservations.status = 'pending'
             ) THEN 'waiting'
             ELSE queue_entries.status
           END,
           admitted_at = CASE WHEN queue_entries.status = 'reserved' THEN NULL ELSE queue_entries.admitted_at END,
           admission_expires_at = CASE WHEN queue_entries.status = 'reserved' THEN NULL ELSE queue_entries.admission_expires_at END,
           admission_consumed_at = CASE WHEN queue_entries.status = 'reserved' THEN NULL ELSE queue_entries.admission_consumed_at END,
           queue_order = CASE WHEN queue_entries.status = 'reserved' THEN NULL ELSE queue_entries.queue_order END,
           captcha_verified = CASE
             WHEN queue_entries.status = 'reserved' THEN EXCLUDED.captcha_verified
             ELSE queue_entries.captcha_verified OR EXCLUDED.captcha_verified
           END,
           behavior_signals = CASE
             WHEN queue_entries.status = 'reserved' THEN EXCLUDED.behavior_signals
             ELSE queue_entries.behavior_signals || EXCLUDED.behavior_signals
           END,
           human_score = CASE
             WHEN queue_entries.status = 'reserved' THEN EXCLUDED.human_score
             ELSE GREATEST(queue_entries.human_score, EXCLUDED.human_score)
           END,
           status_requests = CASE WHEN queue_entries.status = 'reserved' THEN 0 ELSE queue_entries.status_requests END,
           rapid_requests = CASE WHEN queue_entries.status = 'reserved' THEN 0 ELSE queue_entries.rapid_requests END,
           last_status_at = CASE WHEN queue_entries.status = 'reserved' THEN NULL ELSE queue_entries.last_status_at END
     RETURNING *`,
    [userId, eventId, token, captchaVerified, score, JSON.stringify(activity)],
  );
  return result.rows[0];
};

export const admitBatch = async (eventId: string) => {
  const grantSeconds = configuredInteger('QUEUE_GRANT_SECONDS', 600, 30, 3600);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [eventId, 'weighted-admission']);

    const recentBatch = await client.query(
      `SELECT 1 FROM queue_batches
       WHERE event_id = $1 AND created_at > NOW() - INTERVAL '10 seconds'
       LIMIT 1`,
      [eventId],
    );
    if (recentBatch.rows.length) {
      await client.query('COMMIT');
      return {
        candidateCount: 0,
        admittedCount: 0,
        averageHumanScore: 0,
        admittedAverageHumanScore: 0,
        availableSeats: 0,
      };
    }

    await client.query(
      `UPDATE seats SET status = 'available', held_by_user_id = NULL, hold_expires_at = NULL
       WHERE event_id = $1 AND status = 'held' AND hold_expires_at <= NOW()`,
      [eventId],
    );
    await client.query(
      `UPDATE reservations SET status = 'expired'
       WHERE event_id = $1 AND status = 'pending' AND expires_at <= NOW()`,
      [eventId],
    );
    await client.query(
      `UPDATE queue_entries SET status = 'waiting', queue_order = NULL, admitted_at = NULL,
         admission_expires_at = NULL, admission_consumed_at = NULL
       WHERE event_id = $1 AND status = 'admitted'
         AND admission_consumed_at IS NULL AND admission_expires_at <= NOW()`,
      [eventId],
    );

    const inventory = await client.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'available')::integer AS available,
        COUNT(*) FILTER (WHERE status = 'held')::integer AS held
       FROM seats WHERE event_id = $1`,
      [eventId],
    );
    const activeGrants = await client.query(
      `SELECT COUNT(*)::integer AS count FROM queue_entries
       WHERE event_id = $1 AND status = 'admitted'
         AND admission_consumed_at IS NULL AND admission_expires_at > NOW()`,
      [eventId],
    );
    const availableSeats = Number(inventory.rows[0].available);
    const alreadyGranted = Number(activeGrants.rows[0].count);
    const openGrants = Math.max(0, availableSeats - alreadyGranted);
    const candidatesResult = await client.query(
      `SELECT id, user_id, human_score, captcha_verified, behavior_signals
       FROM queue_entries
       WHERE event_id = $1 AND status = 'waiting'
       ORDER BY joined_at, id
       FOR UPDATE`,
      [eventId],
    );
    const candidates = candidatesResult.rows as QueueCandidate[];
    const selected = weightedSample(candidates, Math.min(BATCH_SIZE, openGrants));

    if (selected.length) {
      const ids = selected.map((candidate) => candidate.id);
      await client.query(
        `UPDATE queue_entries SET status = 'admitted', admitted_at = NOW(),
           admission_expires_at = NOW() + ($2 * INTERVAL '1 second'),
           admission_consumed_at = NULL
         WHERE id = ANY($1::uuid[])`,
        [ids, grantSeconds],
      );
    }

    const averageScore = candidates.length
      ? Math.round(candidates.reduce((sum, candidate) => sum + Number(candidate.human_score), 0) / candidates.length)
      : 0;
    const admittedAverage = selected.length
      ? Math.round(selected.reduce((sum, candidate) => sum + Number(candidate.human_score), 0) / selected.length)
      : 0;
    const remaining = Math.max(0, availableSeats - alreadyGranted - selected.length);

    if (candidates.length) {
      await client.query(
        `INSERT INTO queue_batches
           (event_id, candidate_count, admitted_count, average_human_score,
            admitted_average_human_score, available_seats)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [eventId, candidates.length, selected.length, averageScore, admittedAverage, remaining],
      );

      const selectedLowScore = selected.filter((candidate) => Number(candidate.human_score) < 35);
      for (const candidate of selectedLowScore) {
        await client.query(
          `INSERT INTO risk_flags (user_id, event_id, flag_type, details)
           VALUES ($1, $2, 'low_queue_score', $3::jsonb)`,
          [candidate.user_id, eventId, JSON.stringify({
            score: candidate.human_score,
            captchaVerified: candidate.captcha_verified,
            note: 'Heuristic only; requires human review and is not a bot determination.',
          })],
        );
      }
    }

    await client.query('COMMIT');
    return {
      candidateCount: candidates.length,
      admittedCount: selected.length,
      averageHumanScore: averageScore,
      admittedAverageHumanScore: admittedAverage,
      availableSeats: remaining,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getQueueStatus = async (userId: string, eventId: string, requestedActivity?: ActivitySignals) => {
  const activity = normalizeActivity(requestedActivity);
  const updated = await query(
    `UPDATE queue_entries entry
     SET status_requests = status_requests + 1,
         rapid_requests = rapid_requests + CASE
           WHEN entry.admitted_at IS NULL AND entry.last_status_at IS NOT NULL
             AND entry.last_status_at > NOW() - INTERVAL '2 seconds' THEN 1 ELSE 0 END,
         last_status_at = NOW(),
         behavior_signals = entry.behavior_signals || $3::jsonb
     WHERE entry.user_id = $1 AND entry.event_id = $2
     RETURNING entry.*`,
    [userId, eventId, JSON.stringify(activity)],
  );
  if (!updated.rows[0]) return null;
  const entry = updated.rows[0];
  const profile = await query('SELECT google_sub FROM users WHERE id = $1', [userId]);
  const score = scoreHumanity(
    Boolean(profile.rows[0]?.google_sub),
    entry.captcha_verified,
    activity.activeSeconds || Number(entry.behavior_signals.activeSeconds || 0),
    activity.manualRefreshes || Number(entry.behavior_signals.manualRefreshes || 0),
    Number(entry.status_requests),
    Number(entry.rapid_requests),
    Number(entry.behavior_signals.reservation_attempts || 0),
  );
  await query('UPDATE queue_entries SET human_score = $1 WHERE id = $2', [score, entry.id]);

  const status = entry.status === 'admitted' && entry.admission_expires_at
    && new Date(entry.admission_expires_at).getTime() <= Date.now()
    ? 'waiting'
    : entry.status;
  const counts = await query(
    `SELECT
       (SELECT COUNT(*) FROM queue_entries WHERE event_id = $1 AND status = 'waiting')::integer AS total_waiting,
       (SELECT COUNT(*) FROM queue_entries WHERE event_id = $1 AND status = 'admitted'
         AND admission_consumed_at IS NULL AND admission_expires_at > NOW())::integer AS active_grants`,
    [eventId],
  );
  return {
    status,
    position: entry.queue_order,
    total_waiting: Number(counts.rows[0].total_waiting),
    human_score: score,
    grant_expires_at: entry.admission_expires_at,
    requires_captcha: score < 45 && isTurnstileConfigured(),
    active_grants: Number(counts.rows[0].active_grants),
  };
};

export const getOperationsOverview = async (eventId?: string) => {
  const eventResult = await query(
    `SELECT id, name, total_seats FROM events
     WHERE status = 'active' AND ($1::uuid IS NULL OR id = $1::uuid)
     ORDER BY created_at DESC LIMIT 1`,
    [eventId || null],
  );
  if (!eventResult.rows[0]) return null;
  const event = eventResult.rows[0];
  const [counts, batches] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*) FROM queue_entries WHERE event_id = $1 AND status = 'waiting')::integer AS waiting,
         (SELECT COUNT(*) FROM queue_entries WHERE event_id = $1 AND status = 'admitted'
           AND admission_consumed_at IS NULL AND admission_expires_at > NOW())::integer AS active_grants,
         (SELECT COUNT(*) FROM seats WHERE event_id = $1 AND status = 'available')::integer AS available_seats,
         (SELECT COUNT(*) FROM seats WHERE event_id = $1 AND status = 'held')::integer AS held_seats,
         (SELECT COUNT(*) FROM seats WHERE event_id = $1 AND status = 'sold')::integer AS sold_seats,
         (SELECT COUNT(*) FROM risk_flags WHERE event_id = $1)::integer AS risk_flags`,
      [event.id],
    ),
    query(
      `SELECT candidate_count, admitted_count, average_human_score,
         admitted_average_human_score, available_seats, created_at
       FROM queue_batches WHERE event_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [event.id],
    ),
  ]);
  return {
    event: { id: event.id, name: event.name, totalSeats: Number(event.total_seats) },
    counts: counts.rows[0],
    configuration: {
      batchSize: BATCH_SIZE,
      batchIntervalSeconds: BATCH_INTERVAL_SECONDS,
      grantSeconds: configuredInteger('QUEUE_GRANT_SECONDS', 600, 30, 3600),
      googleRequired: process.env.QUEUE_REQUIRE_GOOGLE !== 'false',
      turnstileConfigured: isTurnstileConfigured(),
      turnstileRequired: isTurnstileRequired(),
      scoringIsHeuristic: true,
    },
    recentBatches: batches.rows,
  };
};
