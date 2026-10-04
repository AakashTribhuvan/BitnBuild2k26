# Local k6 simulations

These k6 scripts compare controlled synthetic traffic against your own local FairDrop stack. They are not a bot-detection test, and must never be pointed at a public tunnel, production, or shared environment.

## Prerequisites

- Start the local Compose stack and confirm `http://localhost:4000/health` responds.
- Docker Desktop running. The cohort runner uses the official `grafana/k6` Docker image; no local k6 install is required.
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

## Run human-like vs. scripted traffic from the website

Open `/simulations` on the local website and sign in with a demo or admin account. Choose the cohort sizes, isolated seat count, run duration and polling intervals, then select **Run simulation**. The API creates its own temporary test event and users, runs k6 against `127.0.0.1` inside the backend container, saves the aggregate report, and removes the temporary records and tokens. Website-triggered runs are limited to one at a time, 50 users total, 50 seats, 35 seconds, and three starts per 15 minutes per client IP. Set `SIMULATIONS_ENABLED=true` in the local environment to enable the endpoint; it is disabled by default in `.env.example`.

The web-runner requires a rebuilt Docker backend image so it includes the k6 binary and script.

## Run the host-based comparison

From the repository root, run:

```powershell
.\tests\load\run-cohort-simulation.ps1
```

The runner checks that the local backend is healthy, creates one isolated active event with 15 seats and 50 synthetic accounts, and passes temporary JWTs directly to k6. By default, 25 human-like clients poll every 3–5 seconds; 25 scripted clients poll every 0.5 seconds and report a deliberately high manual-refresh signal. k6 uses `host.docker.internal` to reach the local API; it never targets either Quick Tunnel. The event has only 15 seats so the API can issue no more than 15 passes while both cohorts compete.

When the run ends, a backend helper saves only cohort-level counts, mean score, admission rate, request count/errors, and maximum admissions in one batch. It then deletes the temporary user accounts, queue entries, seats, event, and per-event batch records. JWTs and the k6 raw result file are removed by the PowerShell runner. Aggregate reports remain visible at `/simulations`.

The fairness score uses signals deliberately sent by this script, so this is an experiment showing how the configured heuristic and weighted lottery behave under these two synthetic patterns—not evidence that an adversary can be reliably identified. Results are randomized and can vary by run. A completed run checks that traffic succeeded and that no batch exceeded 15 admissions; it does not assert that every human-like user is selected or every scripted user is excluded.

## Check contention for one seat

Choose a dedicated, available seat in an isolated local test event. Its admitted test users must each have room under the per-user purchase limit:

```powershell
k6 run -e EVENT_ID=<local-event-uuid> -e SEAT_ID=<test-seat-uuid> tests/load/seat-hold.js
```

The script starts two admitted users against the same seat, expects no more than one successful hold, and releases the winner after a short contention window. It is limited to 2–10 VUs. If the process is interrupted after a hold succeeds, the backend's normal hold-expiry job releases it when its configured hold expires.

The existing queue-join and seat-hold contention scripts also reject non-local URLs and accept only explicit event/account inputs. Do not reuse the cohort runner's temporary accounts for seat-hold tests.
