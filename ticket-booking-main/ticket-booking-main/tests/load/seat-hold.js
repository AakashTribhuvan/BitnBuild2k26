import http from "k6/http";
import { sleep } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
const EVENT_ID = __ENV.EVENT_ID;
const SEAT_ID = __ENV.SEAT_ID;
const VUS = Number(__ENV.VUS || 2);
const HOLD_WINDOW_SECONDS = Number(__ENV.HOLD_WINDOW_SECONDS || 5);

if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE_URL)) {
  throw new Error("Load tests are local-only; BASE_URL must use localhost or 127.0.0.1.");
}
if (!EVENT_ID || !SEAT_ID) {
  throw new Error("Set EVENT_ID and SEAT_ID to a dedicated local test event and seat.");
}
if (!Number.isSafeInteger(VUS) || VUS < 2 || VUS > 10) {
  throw new Error("VUS must be an integer between 2 and 10.");
}
if (!Number.isSafeInteger(HOLD_WINDOW_SECONDS) || HOLD_WINDOW_SECONDS < 1 || HOLD_WINDOW_SECONDS > 10) {
  throw new Error("HOLD_WINDOW_SECONDS must be an integer between 1 and 10.");
}

const tokens = JSON.parse(open("./tests/load/tokens.json"));
const admittedTokens = tokens.admitted;
if (
  !Array.isArray(admittedTokens) ||
  admittedTokens.length < VUS ||
  admittedTokens.some((token) => typeof token !== "string" || token.length === 0)
) {
  throw new Error("tokens.json needs one valid, distinct admitted-user JWT per VU.");
}
if (new Set(admittedTokens).size !== admittedTokens.length) {
  throw new Error("Each seat-hold VU must use a different admitted test-account JWT.");
}

const successfulHolds = new Counter("successful_seat_holds");
const expectedConflicts = new Counter("expected_seat_conflicts");
const successfulReleases = new Counter("successful_seat_releases");
const unexpectedHoldFailures = new Counter("unexpected_seat_hold_failures");
const unexpectedReleaseFailures = new Counter("unexpected_seat_release_failures");

export const options = {
  scenarios: {
    same_seat_contention: {
      executor: "per-vu-iterations",
      vus: VUS,
      iterations: 1,
      maxDuration: "30s",
      gracefulStop: "15s",
    },
  },
  thresholds: {
    successful_seat_holds: ["count<2"],
    successful_seat_releases: ["count>0"],
    unexpected_seat_hold_failures: ["count<1"],
    unexpected_seat_release_failures: ["count<1"],
  },
};

export default function () {
  const token = admittedTokens[__VU - 1];
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const response = http.post(
    `${BASE_URL}/seats/hold`,
    JSON.stringify({ eventId: EVENT_ID, seatId: SEAT_ID }),
    { headers, tags: { operation: "hold" } }
  );

  if (response.status === 200 || response.status === 201) {
    successfulHolds.add(1);
    sleep(HOLD_WINDOW_SECONDS);
    const release = http.del(`${BASE_URL}/seats/hold/${encodeURIComponent(SEAT_ID)}`, null, {
      headers,
      tags: { operation: "release" },
    });
    if (release.status === 200) {
      successfulReleases.add(1);
    } else {
      unexpectedReleaseFailures.add(1);
    }
  } else if (response.status === 400 && response.json("error") === "Seat not available") {
    expectedConflicts.add(1);
  } else {
    unexpectedHoldFailures.add(1);
  }
}

function count(data, name) {
  return data.metrics[name] ? data.metrics[name].values.count : 0;
}

export function handleSummary(data) {
  const holds = count(data, "successful_seat_holds");
  return {
    stdout: `
=== Local same-seat contention ===
Successful holds: ${holds}
Expected unavailable-seat conflicts: ${count(data, "expected_seat_conflicts")}
Successful releases: ${count(data, "successful_seat_releases")}
Unexpected hold/release failures: ${count(data, "unexpected_seat_hold_failures")}/${count(data, "unexpected_seat_release_failures")}
Oversell invariant: ${holds <= 1 ? "PASS (at most one concurrent holder)" : "FAIL"}
The successful hold is released automatically after the contention window.
==================================
`,
  };
}
