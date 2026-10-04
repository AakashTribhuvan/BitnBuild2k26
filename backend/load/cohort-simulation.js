import http from "k6/http";
import { Counter, Trend } from "k6/metrics";
import exec from "k6/execution";
import { sleep } from "k6";

const BASE_URL = (__ENV.BASE_URL || "http://host.docker.internal:4000").replace(/\/+$/, "");
const EVENT_ID = __ENV.EVENT_ID;
const HUMAN_VUS = Number(__ENV.HUMAN_USERS || 25);
const BOT_VUS = Number(__ENV.BOT_USERS || 25);
const MAX_WAIT_SECONDS = Number(__ENV.MAX_WAIT_SECONDS || 35);
const HUMAN_POLL_SECONDS = Number(__ENV.HUMAN_POLL_SECONDS || 3);
const BOT_POLL_SECONDS = Number(__ENV.BOT_POLL_SECONDS || 0.5);
const TOKENS_PATH = __ENV.TOKENS_PATH || "./tests/load/tokens.json";
const SUMMARY_PATH = __ENV.SUMMARY_PATH;
const AUTH_SCHEME = "Bearer";

if (!/^http:\/\/(localhost|127\.0\.0\.1|host\.docker\.internal)(:\d+)?$/i.test(BASE_URL)) {
  throw new Error("The cohort simulation is local-only; BASE_URL must point to this machine.");
}
if (!EVENT_ID) {
  throw new Error("The local synthetic simulation event ID is required.");
}
if (!SUMMARY_PATH) {
  throw new Error("Set SUMMARY_PATH to an isolated local results file.");
}
if (!Number.isInteger(HUMAN_VUS) || HUMAN_VUS < 1 || !Number.isInteger(BOT_VUS) || BOT_VUS < 0
  || HUMAN_VUS + BOT_VUS > 50 || !Number.isInteger(MAX_WAIT_SECONDS) || MAX_WAIT_SECONDS < 10
  || MAX_WAIT_SECONDS > 40 || !Number.isFinite(HUMAN_POLL_SECONDS) || HUMAN_POLL_SECONDS < 1
  || HUMAN_POLL_SECONDS > 8 || !Number.isFinite(BOT_POLL_SECONDS) || BOT_POLL_SECONDS < 0.25
  || BOT_POLL_SECONDS > 2) {
  throw new Error("Simulation settings exceed the validated local limits.");
}

const tokens = JSON.parse(open(TOKENS_PATH));
if (
  !Array.isArray(tokens.human) ||
  tokens.human.length !== HUMAN_VUS ||
  !Array.isArray(tokens.bot) ||
  tokens.bot.length !== BOT_VUS ||
  new Set([...tokens.human, ...tokens.bot]).size !== HUMAN_VUS + BOT_VUS
) {
  throw new Error("Provide exactly 25 distinct synthetic tokens per cohort.");
}

const humanJoins = new Counter("human_joins");
const botJoins = new Counter("bot_joins");
const humanAdmissions = new Counter("human_admissions");
const botAdmissions = new Counter("bot_admissions");
const humanErrors = new Counter("human_errors");
const botErrors = new Counter("bot_errors");
const humanLatency = new Trend("human_status_latency", true);
const botLatency = new Trend("bot_status_latency", true);

const scenarios = {
  human_like: {
    executor: "per-vu-iterations",
    vus: HUMAN_VUS,
    iterations: 1,
    maxDuration: `${MAX_WAIT_SECONDS + 5}s`,
    exec: "humanLike",
  },
};
const thresholds = {
  human_errors: ["count<1"],
  human_admissions: ["count<=15"],
};
if (BOT_VUS > 0) {
  scenarios.scripted_automation = {
    executor: "per-vu-iterations",
    vus: BOT_VUS,
    iterations: 1,
    maxDuration: `${MAX_WAIT_SECONDS + 5}s`,
    exec: "scriptedAutomation",
  };
  thresholds.bot_errors = ["count<1"];
  thresholds.bot_admissions = ["count<=15"];
}

export const options = { scenarios, thresholds };

function headersFor(token) {
  return {
    Authorization: `${AUTH_SCHEME} ${token}`,
    "Content-Type": "application/json",
  };
}

function join(token, cohort) {
  const isBot = cohort === "bot";
  const response = http.post(
    `${BASE_URL}/queue/join`,
    JSON.stringify({
      eventId: EVENT_ID,
      activity: isBot
        ? { activeSeconds: 0, manualRefreshes: 80 }
        : { activeSeconds: 20, manualRefreshes: 0 },
    }),
    { headers: headersFor(token), tags: { cohort, operation: "join" } },
  );
  if (response.status === 200 || response.status === 201) {
    (isBot ? botJoins : humanJoins).add(1);
    return true;
  }
  console.error(`${cohort} join failed with HTTP ${response.status}: ${response.body}`);
  (isBot ? botErrors : humanErrors).add(1);
  return false;
}

function waitForAdmission(token, cohort, startedAt) {
  const isBot = cohort === "bot";
  const expiresAt = Date.now() + MAX_WAIT_SECONDS * 1000;
  while (Date.now() < expiresAt) {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const response = http.get(
      `${BASE_URL}/queue/status?eventId=${encodeURIComponent(EVENT_ID)}`
        + `&activeSeconds=${isBot ? 0 : elapsedSeconds + 20}`
        + `&manualRefreshes=${isBot ? 80 : 0}`,
      { headers: headersFor(token), tags: { cohort, operation: "status" } },
    );
    (isBot ? botLatency : humanLatency).add(response.timings.duration);
    if (response.status !== 200) {
      (isBot ? botErrors : humanErrors).add(1);
      sleep(isBot ? BOT_POLL_SECONDS : HUMAN_POLL_SECONDS + Math.random() * 0.4);
      continue;
    }
    const status = response.json("status");
    if (status === "admitted") {
      (isBot ? botAdmissions : humanAdmissions).add(1);
      return;
    }
    sleep(isBot ? BOT_POLL_SECONDS : HUMAN_POLL_SECONDS + Math.random() * 0.4);
  }
}

export function humanLike() {
  const startedAt = Date.now();
  const token = tokens.human[exec.scenario.iterationInTest];
  if (join(token, "human")) waitForAdmission(token, "human", startedAt);
}

export function scriptedAutomation() {
  const startedAt = Date.now();
  const token = tokens.bot[exec.scenario.iterationInTest];
  if (join(token, "bot")) waitForAdmission(token, "bot", startedAt);
}

function metricCount(data, name) {
  return data.metrics[name] ? data.metrics[name].values.count : 0;
}

function metricValue(data, name, key) {
  return data.metrics[name] ? Math.round(data.metrics[name].values[key]) : 0;
}

export function handleSummary(data) {
  const text = [
    "=== Local FairDrop human-like vs scripted traffic ===",
    `Human-like: joins=${metricCount(data, "human_joins")}, admitted=${metricCount(data, "human_admissions")}, errors=${metricCount(data, "human_errors")}, status avg/p95=${metricValue(data, "human_status_latency", "avg")}/${metricValue(data, "human_status_latency", "p(95)")}ms`,
    `Scripted:   joins=${metricCount(data, "bot_joins")}, admitted=${metricCount(data, "bot_admissions")}, errors=${metricCount(data, "bot_errors")}, status avg/p95=${metricValue(data, "bot_status_latency", "avg")}/${metricValue(data, "bot_status_latency", "p(95)")}ms`,
    "The groups are synthetic request patterns. This is a bounded demo, not proof of real-world bot detection.",
    "==============================================",
  ].join("\n");
  return {
    stdout: `${text}\n`,
    [SUMMARY_PATH]: JSON.stringify(data),
  };
}
