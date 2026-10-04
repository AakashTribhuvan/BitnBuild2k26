import { Router } from 'express';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { simulationStartLimiter } from '../middleware/rateLimit';
import { query } from '../config/database';

const router = Router();
const execFileAsync = promisify(execFile);
let simulationRunning = false;

type Settings = {
  humanUsers: number;
  botUsers: number;
  seatCount: number;
  durationSeconds: number;
  humanPollSeconds: number;
  botPollSeconds: number;
};

function parseSettings(body: unknown): Settings | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  const numeric = (key: string) => typeof value[key] === 'number' ? value[key] as number : Number.NaN;
  const settings: Settings = {
    humanUsers: numeric('humanUsers'),
    botUsers: numeric('botUsers'),
    seatCount: numeric('seatCount'),
    durationSeconds: numeric('durationSeconds'),
    humanPollSeconds: numeric('humanPollSeconds'),
    botPollSeconds: numeric('botPollSeconds'),
  };
  if (!Number.isInteger(settings.humanUsers) || settings.humanUsers < 1
    || !Number.isInteger(settings.botUsers) || settings.botUsers < 0
    || settings.humanUsers + settings.botUsers > 50
    || !Number.isInteger(settings.seatCount) || settings.seatCount < 1 || settings.seatCount > 50
    || !Number.isInteger(settings.durationSeconds) || settings.durationSeconds < 10 || settings.durationSeconds > 35
    || !Number.isFinite(settings.humanPollSeconds) || settings.humanPollSeconds < 1 || settings.humanPollSeconds > 8
    || !Number.isFinite(settings.botPollSeconds) || settings.botPollSeconds < 0.25 || settings.botPollSeconds > 2) {
    return null;
  }
  return settings;
}

function metricsCount(summary: Record<string, unknown> | undefined, metricName: string): number {
  if (!summary || !summary.metrics || typeof summary.metrics !== 'object') return 0;
  const metric = (summary.metrics as Record<string, unknown>)[metricName];
  if (!metric || typeof metric !== 'object') return 0;
  const values = (metric as Record<string, unknown>).values;
  if (!values || typeof values !== 'object') return 0;
  const count = Number((values as Record<string, unknown>).count);
  return Number.isFinite(count) ? count : 0;
}

router.post('/run', authenticate, simulationStartLimiter, async (req, res, next) => {
  if (process.env.SIMULATIONS_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Website-triggered simulations are disabled' });
  }
  const settings = parseSettings(req.body);
  if (!settings) {
    return res.status(400).json({
      error: 'Use 1–50 human-like users, 0–49 scripted users (50 total maximum), 1–50 seats, a 10–35 second duration, and supported polling intervals.',
    });
  }
  if (simulationRunning) return res.status(409).json({ error: 'A simulation is already running. Try again when it finishes.' });

  simulationRunning = true;
  try {
    const account = await query('SELECT is_demo, is_admin FROM users WHERE id = $1', [req.user!.userId]);
    if (!account.rows[0]?.is_demo && !account.rows[0]?.is_admin) {
      simulationRunning = false;
      return res.status(403).json({ error: 'Only a demo or admin account can start a local simulation.' });
    }
  } catch (error) {
    simulationRunning = false;
    return next(error);
  }

  const runId = randomUUID();
  let directory: string;
  try {
    directory = await mkdtemp(path.join(os.tmpdir(), 'fairdrop-simulation-'));
  } catch (error) {
    simulationRunning = false;
    return next(error);
  }
  const tokenPath = path.join(directory, 'tokens.json');
  const summaryPath = path.join(directory, 'summary.json');
  const runEnv = {
    ...process.env,
    SIMULATION_RUN_ID: runId,
    SIMULATION_HUMAN_USERS: String(settings.humanUsers),
    SIMULATION_BOT_USERS: String(settings.botUsers),
    SIMULATION_SEAT_COUNT: String(settings.seatCount),
    SIMULATION_MAX_WAIT_SECONDS: String(settings.durationSeconds + 5),
    SIMULATION_HUMAN_POLL_SECONDS: String(settings.humanPollSeconds),
    SIMULATION_BOT_POLL_SECONDS: String(settings.botPollSeconds),
  };
  const startedAt = Date.now();
  let fixtureProvisioned = false;
  let runResult: Record<string, unknown> | undefined;
  let runError: unknown;
  try {
    const fixtureScript = path.resolve(__dirname, '../db/simulationCohorts.js');
    const provision = await execFileAsync(process.execPath, [fixtureScript, 'provision'], {
      env: runEnv,
      timeout: 20_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    fixtureProvisioned = true;
    const fixture = JSON.parse(provision.stdout) as { runId?: string; eventId?: string; human?: string[]; bot?: string[] };
    if (fixture.runId !== runId || !fixture.eventId || !Array.isArray(fixture.human) || !Array.isArray(fixture.bot)) {
      throw new Error('The simulation fixture returned invalid setup data');
    }
    await writeFile(tokenPath, JSON.stringify({ human: fixture.human, bot: fixture.bot }), { mode: 0o600 });

    const scriptPath = path.resolve(__dirname, '../../load/cohort-simulation.js');
    const k6Env = {
      ...process.env,
      BASE_URL: 'http://127.0.0.1:4000',
      EVENT_ID: fixture.eventId,
      HUMAN_USERS: String(settings.humanUsers),
      BOT_USERS: String(settings.botUsers),
      MAX_WAIT_SECONDS: String(settings.durationSeconds + 5),
      HUMAN_POLL_SECONDS: String(settings.humanPollSeconds),
      BOT_POLL_SECONDS: String(settings.botPollSeconds),
      TOKENS_PATH: tokenPath,
      SUMMARY_PATH: summaryPath,
    };
    try {
      await execFileAsync('/usr/local/bin/k6', ['run', '--quiet', scriptPath], {
        env: k6Env,
        timeout: (settings.durationSeconds + 20) * 1000,
        maxBuffer: 2 * 1024 * 1024,
      });
    } catch (error) {
      runError = error;
    }

    let summary: Record<string, unknown> | undefined;
    try {
      summary = JSON.parse(await readFile(summaryPath, 'utf8')) as Record<string, unknown>;
    } catch (error) {
      if (!runError) runError = error;
    }
    const requestErrors = metricsCount(summary, 'human_errors') + metricsCount(summary, 'bot_errors');
    const finalizeEnv = {
      ...runEnv,
      SIMULATION_SUCCESS: runError ? 'false' : 'true',
      SIMULATION_REQUEST_COUNT: String(metricsCount(summary, 'http_reqs')),
      SIMULATION_REQUEST_ERRORS: String(requestErrors),
      SIMULATION_DURATION_SECONDS: String(Math.max(1, Math.ceil((Date.now() - startedAt) / 1000))),
    };
    const finalized = await execFileAsync(process.execPath, [fixtureScript, 'finalize'], {
      env: finalizeEnv,
      timeout: 20_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    runResult = JSON.parse(finalized.stdout) as Record<string, unknown>;
  } catch (error) {
    runError = error;
  } finally {
    try {
      if (fixtureProvisioned && !runResult) {
        const fixtureScript = path.resolve(__dirname, '../db/simulationCohorts.js');
        await execFileAsync(process.execPath, [fixtureScript, 'finalize'], {
          env: {
            ...runEnv,
            SIMULATION_SUCCESS: 'false',
            SIMULATION_DURATION_SECONDS: String(Math.max(1, Math.ceil((Date.now() - startedAt) / 1000))),
          },
          timeout: 20_000,
          maxBuffer: 2 * 1024 * 1024,
        });
      }
    } catch (cleanupError) {
      runError = new Error(`Simulation fixture cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : 'unknown error'}`);
    }
    try {
      await rm(directory, { recursive: true, force: true });
    } catch (cleanupError) {
      runError = new Error(`Temporary simulation files could not be removed: ${cleanupError instanceof Error ? cleanupError.message : 'unknown error'}`);
    } finally {
      simulationRunning = false;
    }
  }

  if (!runResult || (runError instanceof Error && runError.message.startsWith('Temporary simulation files could not be removed:'))) {
    return next(runError ?? new Error('Simulation did not produce a report'));
  }
  res.json({ ...runResult, ...(runError ? { message: 'The run was recorded as incomplete because k6 did not finish cleanly.' } : {}) });
});

export default router;
