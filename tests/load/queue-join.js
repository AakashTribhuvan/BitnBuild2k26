import http from "k6/http";
import { sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
const EVENT_ID = __ENV.EVENT_ID;
const DURATION = __ENV.DURATION || "20s";
const HUMAN_VUS = Number(__ENV.HUMAN_VUS || 1);
const BOT_VUS = Number(__ENV.BOT_VUS || 1);
const BOT_POLLS = Number(__ENV.BOT_POLLS || 5);

if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE_URL)) {
  throw new Error("Load tests are local-only; BASE_URL must use localhost or 127.0.0.1.");
}
if (!EVENT_ID) {
  throw new Error("Set EVENT_ID to the UUID of the local test event.");
}

const durationMatch = /^(\d+)(s|m)$/.exec(DURATION);
const durationSeconds = durationMatch
  ? Number(durationMatch[1]) * (durationMatch[2] === "m" ? 60 : 1)
  : 0;
if (durationSeconds < 1 || durationSeconds > 300) {
  throw new Error("DURATION must be between 1s and 5m.");
}
if (
  !Number.isSafeInteger(HUMAN_VUS) ||
  !Number.isSafeInteger(BOT_VUS) ||
  HUMAN_VUS < 1 ||
  BOT_VUS < 1 ||
  HUMAN_VUS + BOT_VUS > 10
) {
  throw new Error("HUMAN_VUS and BOT_VUS must be positive integers totaling at most 10.");
}
if (!Number.isSafeInteger(BOT_POLLS) || BOT_POLLS < 1 || BOT_POLLS > 10) {
  throw new Error("BOT_POLLS must be an integer between 1 and 10.");
}

const tokens = JSON.parse(open("./tests/load/tokens.json"));
const humanTokens = tokens.human;
const botTokens = tokens.bot;
if (
  !Array.isArray(humanTokens) ||
  humanTokens.length < HUMAN_VUS ||
  humanTokens.some((token) => typeof token !== "string" || token.length === 0) ||
  !Array.isArray(botTokens) ||
  botTokens.length < BOT_VUS ||
  botTokens.some((token) => typeof token !== "string" || token.length === 0)
) {
  throw new Error("tokens.json needs one valid, distinct JWT per configured human and bot VU.");
}
if (new Set([...humanTokens, ...botTokens]).size !== humanTokens.length + botTokens.length) {
  throw new Error("Each VU must use a different synthetic-account JWT across both cohorts.");
}

const humanJoins = new Counter("human_queue_joins");
const botJoins = new Counter("bot_queue_joins");
const humanStatusOk = new Counter("human_queue_status_ok");
const botStatusOk = new Counter("bot_queue_status_ok");
const humanErrors = new Counter("human_queue_errors");
const botErrors = new Counter("bot_queue_errors");
const botThrottles = new Counter("bot_queue_throttles");
const humanLatency = new Trend("human_queue_status_latency", true);
const botLatency = new Trend("bot_queue_status_latency", true);

export const options = {
  scenarios: {
    human_like: {
      executor: "constant-vus",
      vus: HUMAN_VUS,
      duration: DURATION,
      exec: "humanLike",
    },
    scripted_burst: {
      executor: "constant-vus",
      vus: BOT_VUS,
      duration: DURATION,
      exec: "scriptedBurst",
    },
  },
  thresholds: {
    human_queue_errors: ["count<1"],
    bot_queue_errors: ["count<1"],
  },
};

const headersFor = (token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

function joinOnce(token, isBot) {
  const response = http.post(
    `${BASE_URL}/queue/join`,
    JSON.stringify({ eventId: EVENT_ID }),
    { headers: headersFor(token), tags: { cohort: isBot ? "bot" : "human", operation: "join" } }
  );
  if (response.status === 200 || response.status === 201) {
    (isBot ? botJoins : humanJoins).add(1);
    return true;
  }
  if (isBot && response.status === 429) {
    botThrottles.add(1);
    return false;
  }
  (isBot ? botErrors : humanErrors).add(1);
  return false;
}

function pollStatus(token, isBot) {
  const response = http.get(
    `${BASE_URL}/queue/status?eventId=${encodeURIComponent(EVENT_ID)}`,
    { headers: headersFor(token), tags: { cohort: isBot ? "bot" : "human", operation: "status" } }
  );
  const latency = isBot ? botLatency : humanLatency;
  const successfulPolls = isBot ? botStatusOk : humanStatusOk;
  const errors = isBot ? botErrors : humanErrors;
  latency.add(response.timings.duration);

  if (response.status === 200) {
    successfulPolls.add(1);
  } else if (isBot && response.status === 429) {
    botThrottles.add(1);
  } else {
    errors.add(1);
  }
}

let humanJoined = false;
export function humanLike() {
  const token = humanTokens[(__VU - 1) % humanTokens.length];
  if (!humanJoined) {
    humanJoined = joinOnce(token, false);
    if (!humanJoined) return;
  }
  sleep(2 + Math.random() * 3);
  pollStatus(token, false);
}

let botJoined = false;
export function scriptedBurst() {
  const token = botTokens[(__VU - 1) % botTokens.length];
  if (!botJoined) {
    botJoined = joinOnce(token, true);
    if (!botJoined) return;
  }
  for (let poll = 0; poll < BOT_POLLS; poll += 1) {
    pollStatus(token, true);
    sleep(0.1);
  }
}

function count(data, name) {
  return data.metrics[name] ? data.metrics[name].values.count : 0;
}

function trend(data, name, key) {
  const metric = data.metrics[name];
  return metric ? Math.round(metric.values[key]) : 0;
}

export function handleSummary(data) {
  return {
    stdout: `
=== Local queue traffic comparison ===
Human-like: joins=${count(data, "human_queue_joins")}, successful polls=${count(data, "human_queue_status_ok")}, errors=${count(data, "human_queue_errors")}, poll avg/p95=${trend(data, "human_queue_status_latency", "avg")}/${trend(data, "human_queue_status_latency", "p(95)")}ms
Scripted:   joins=${count(data, "bot_queue_joins")}, successful polls=${count(data, "bot_queue_status_ok")}, errors=${count(data, "bot_queue_errors")}, throttles=${count(data, "bot_queue_throttles")}, poll avg/p95=${trend(data, "bot_queue_status_latency", "avg")}/${trend(data, "bot_queue_status_latency", "p(95)")}ms
The cohorts are traffic patterns for comparison, not a bot-detection verdict.
========================================
`,
  };
}
