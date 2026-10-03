# Local load-test scenarios

These k6 scripts compare controlled synthetic traffic against your own local FairDrop stack. They are not a bot-detection test, and they must not be pointed at a public tunnel, production, or a shared environment.

## Prerequisites

- Start the local Compose stack and confirm `http://localhost:4000/health` responds.
- Install k6 locally.
- Create separate synthetic test accounts for the human-like, scripted, and admitted-seat cohorts. Use no real account data.
- Get a JWT for each account from `POST http://localhost:4000/auth/login`. Seat-hold accounts must already be admitted to the test event and must not have reached that event's purchase limit.
- Keep the test event and the seat used for contention separate from data you need to preserve.

Save local JWTs in `tests/load/tokens.json`. This file is ignored by Git; never commit or share it:

```json
{
  "human": ["human-test-account-jwt"],
  "bot": ["scripted-test-account-jwt"],
  "admitted": ["admitted-test-account-one-jwt", "admitted-test-account-two-jwt"]
}
```

Use a different synthetic account for every configured VU. Do not use the seeded demo credentials for a load run.

## Compare human-like and scripted queue traffic

From the backend project root:

```powershell
k6 run -e EVENT_ID=<local-event-uuid> tests/load/queue-join.js
```

Defaults are one VU per cohort for 20 seconds. The human-like cohort joins once, waits 2–5 seconds, and checks status once per iteration. The scripted cohort joins once and polls rapidly in a short burst. `handleSummary` reports successful joins/polls, errors, throttles, and queue-status latency separately.

Keep runs small. Optional overrides are bounded: `HUMAN_VUS` plus `BOT_VUS` may total at most 10; `BOT_POLLS` is at most 10 per iteration; `DURATION` is at most `5m`.

## Check contention for one seat

Choose a dedicated, available seat in an isolated local test event. Its admitted test users must each have room under the per-user purchase limit:

```powershell
k6 run -e EVENT_ID=<local-event-uuid> -e SEAT_ID=<test-seat-uuid> tests/load/seat-hold.js
```

The script starts two admitted users against the same seat, expects no more than one successful hold, and releases the winner after a short contention window. It is limited to 2–10 VUs. If the process is interrupted after a hold succeeds, the backend's normal hold-expiry job releases it when its configured hold expires.

Both scripts reject non-local API URLs and require explicit event/account inputs. Queue requests do not reserve inventory; the seat script only touches the explicitly selected test seat. Review the k6 summary and backend logs together.
