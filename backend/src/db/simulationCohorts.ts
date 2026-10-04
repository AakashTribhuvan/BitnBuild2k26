import { randomUUID } from 'crypto';
import { pool } from '../config/database';
import { signToken } from '../utils/token';

const configuration = () => {
  const humanCount = Number.parseInt(process.env.SIMULATION_HUMAN_USERS || '25', 10);
  const botCount = Number.parseInt(process.env.SIMULATION_BOT_USERS || '25', 10);
  const seatCount = Number.parseInt(process.env.SIMULATION_SEAT_COUNT || '15', 10);
  const maxWaitSeconds = Number.parseInt(process.env.SIMULATION_MAX_WAIT_SECONDS || '35', 10);
  const humanPollSeconds = Number.parseFloat(process.env.SIMULATION_HUMAN_POLL_SECONDS || '3');
  const botPollSeconds = Number.parseFloat(process.env.SIMULATION_BOT_POLL_SECONDS || '0.5');
  if (!Number.isInteger(humanCount) || humanCount < 1 || !Number.isInteger(botCount) || botCount < 0
    || humanCount + botCount > 50 || !Number.isInteger(seatCount) || seatCount < 1 || seatCount > 50
    || !Number.isInteger(maxWaitSeconds) || maxWaitSeconds < 10 || maxWaitSeconds > 40
    || !Number.isFinite(humanPollSeconds) || humanPollSeconds < 1 || humanPollSeconds > 8
    || !Number.isFinite(botPollSeconds) || botPollSeconds < 0.25 || botPollSeconds > 2) {
    throw new Error('Simulation configuration exceeds the validated local limits');
  }
  return { humanCount, botCount, seatCount, maxWaitSeconds, humanPollSeconds, botPollSeconds };
};

const requireRunId = () => {
  const runId = process.env.SIMULATION_RUN_ID || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
    throw new Error('SIMULATION_RUN_ID must be a UUID');
  }
  return runId;
};

async function provision() {
  const runId = requireRunId();
  const config = configuration();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eventResult = await client.query(
      `INSERT INTO events (name, total_seats, status, purchase_limit_per_user)
       VALUES ($1, $2, 'active', 1) RETURNING id`,
      [`FairDrop Simulation ${runId.slice(0, 8)}`, config.seatCount],
    );
    const eventId = eventResult.rows[0].id as string;
    await client.query(
      `INSERT INTO seats (event_id, seat_number, status)
       SELECT $1, seat_number, 'available' FROM generate_series(1, $2) seat_number`,
      [eventId, config.seatCount],
    );

    const cohorts = {
      human: [] as string[],
      bot: [] as string[],
    };
    for (const [cohort, count] of [['human', config.humanCount], ['bot', config.botCount]] as const) {
      for (let index = 0; index < count; index++) {
        const userId = randomUUID();
        const tag = `${runId.replace(/-/g, '')}-${String(index + 1).padStart(2, '0')}`;
        await client.query(
          `INSERT INTO users (id, email, password_hash, name, google_sub, is_verified)
           VALUES ($1, $2, 'simulation-only', $3, $4, TRUE)`,
          [
            userId,
            `sim-${cohort}-${tag}@example.invalid`,
            `Synthetic ${cohort} ${index + 1}`,
            `simulation-${cohort}-${tag}`,
          ],
        );
        cohorts[cohort].push(signToken({ userId, isAdmin: false }));
      }
    }
    await client.query('COMMIT');
    process.stdout.write(JSON.stringify({ runId, eventId, human: cohorts.human, bot: cohorts.bot }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function finalize() {
  const runId = requireRunId();
  const config = configuration();
  const success = process.env.SIMULATION_SUCCESS === 'true';
  const requestCount = Math.max(0, Number.parseInt(process.env.SIMULATION_REQUEST_COUNT || '0', 10));
  const requestErrors = Math.max(0, Number.parseInt(process.env.SIMULATION_REQUEST_ERRORS || '0', 10));
  const durationSeconds = Math.max(0, Number.parseInt(process.env.SIMULATION_DURATION_SECONDS || '0', 10));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fixtureResult = await client.query(
      `SELECT event.id, event.name
       FROM events event
       WHERE event.name = $1 AND event.status = 'active'
       FOR UPDATE`,
      [`FairDrop Simulation ${runId.slice(0, 8)}`],
    );
    const event = fixtureResult.rows[0];
    if (!event) throw new Error('The synthetic simulation event could not be found');

    const cohorts = await client.query(
      `SELECT
         CASE WHEN user_account.email LIKE 'sim-human-%' THEN 'human' ELSE 'bot' END AS cohort,
         COUNT(*)::integer AS participant_count,
         COUNT(*) FILTER (WHERE entry.status = 'admitted')::integer AS admitted_count,
         COALESCE(ROUND(AVG(entry.human_score)), 0)::integer AS average_score
       FROM queue_entries entry
       JOIN users user_account ON user_account.id = entry.user_id
       WHERE entry.event_id = $1
         AND (user_account.email LIKE $2 OR user_account.email LIKE $3)
       GROUP BY cohort`,
      [event.id, `sim-human-${runId.replace(/-/g, '')}-%`, `sim-bot-${runId.replace(/-/g, '')}-%`],
    );
    const metrics = Object.fromEntries(
      cohorts.rows.map((row) => [row.cohort, {
        count: Number(row.participant_count),
        admitted: Number(row.admitted_count),
        averageScore: Number(row.average_score),
      }]),
    ) as Record<string, { count: number; admitted: number; averageScore: number }>;
    const batchResult = await client.query(
      `SELECT COALESCE(MAX(admitted_count), 0)::integer AS maximum,
              COUNT(*)::integer AS batch_count
       FROM queue_batches WHERE event_id = $1`,
      [event.id],
    );
    const human = metrics.human ?? { count: 0, admitted: 0, averageScore: 0 };
    const bot = metrics.bot ?? { count: 0, admitted: 0, averageScore: 0 };
    const maximumBatchAdmitted = Number(batchResult.rows[0].maximum);
    const status = success && human.count === config.humanCount && bot.count === config.botCount
      && requestErrors === 0 && maximumBatchAdmitted <= 15 ? 'completed' : 'incomplete';

    await client.query(
      `INSERT INTO simulation_runs
         (id, event_name, status, human_count, bot_count, human_admitted,
          bot_admitted, human_average_score, bot_average_score,
          maximum_batch_admitted, batch_count, request_count, request_errors,
          duration_seconds, seat_count, configuration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        runId, event.name, status, human.count, bot.count, human.admitted, bot.admitted,
        human.averageScore, bot.averageScore, maximumBatchAdmitted,
        Number(batchResult.rows[0].batch_count), requestCount, requestErrors, durationSeconds,
        config.seatCount, JSON.stringify({
          humanUsers: config.humanCount,
          botUsers: config.botCount,
          seatCount: config.seatCount,
          maxWaitSeconds: config.maxWaitSeconds,
          humanPollSeconds: config.humanPollSeconds,
          botPollSeconds: config.botPollSeconds,
        }),
      ],
    );

    await client.query('DELETE FROM queue_batches WHERE event_id = $1', [event.id]);
    await client.query('DELETE FROM risk_flags WHERE event_id = $1', [event.id]);
    await client.query('DELETE FROM queue_entries WHERE event_id = $1', [event.id]);
    await client.query('DELETE FROM seats WHERE event_id = $1', [event.id]);
    await client.query('DELETE FROM events WHERE id = $1', [event.id]);
    await client.query(
      `DELETE FROM users WHERE email LIKE $1 OR email LIKE $2`,
      [`sim-human-${runId.replace(/-/g, '')}-%`, `sim-bot-${runId.replace(/-/g, '')}-%`],
    );
    await client.query('COMMIT');

    process.stdout.write(JSON.stringify({
      runId,
      status,
      humanCount: human.count,
      botCount: bot.count,
      humanAdmitted: human.admitted,
      botAdmitted: bot.admitted,
      humanAverageScore: human.averageScore,
      botAverageScore: bot.averageScore,
      maximumBatchAdmitted,
      batchCount: Number(batchResult.rows[0].batch_count),
      requestCount,
      requestErrors,
      durationSeconds,
      seatCount: config.seatCount,
      configuration: {
        humanUsers: config.humanCount,
        botUsers: config.botCount,
        seatCount: config.seatCount,
        maxWaitSeconds: config.maxWaitSeconds,
        humanPollSeconds: config.humanPollSeconds,
        botPollSeconds: config.botPollSeconds,
      },
    }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    const mode = process.argv[2];
    if (mode === 'provision') await provision();
    else if (mode === 'finalize') await finalize();
    else throw new Error('Specify provision or finalize');
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Simulation fixture failed'}\n`);
  process.exitCode = 1;
});
