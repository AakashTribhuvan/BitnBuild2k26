# FairDrop high-demand sale hardening plan

## Goal

Demonstrate that FairDrop can sell a limited inventory fairly during a simulated flash crowd, resist automated advantage, and preserve correct user, queue, reservation, and payment state. Run load and adversarial tests only against an isolated test environment with seeded test data.

## Current foundation

- PostgreSQL is the source of truth for users, events, seats, queue entries, reservations, and payments.
- Redis supports rate limiting, caching, and queue-related background work.
- Queue admission runs in batches; the browser polls server-owned queue status.
- Seat holds and payment confirmation are handled by backend routes, with mock payments only.
- Admin routes expose operational statistics and queue controls.

These are useful foundations, not proof of the required scale or fairness. The items below validate and strengthen the behavior under measured load.

## Work plan

### 1. Define a repeatable test scenario

- Create an isolated load-test Compose profile/database with a resettable event and known seat inventory.
- Make arrival rate, total virtual users, request retry behavior, session mix, and bot-like patterns configurable.
- Include normal browsing and sign-in, queue joins, refresh/reconnect, seat selection, reservation expiry, and mock payment.
- Record the exact configuration and seed state with every test result.

**Acceptance:** Anyone on the team can reset the test environment, run the same scenario, and reproduce its summary without touching development or production data.

### 2. Measure high concurrency and reliability

- Exercise simultaneous event reads, queue joins/status polls, seat reads/holds, and mock checkouts.
- Increase traffic in controlled stages, including bursts and sustained load; record the point where latency or errors exceed agreed limits.
- Measure throughput, error rate, and p50/p95/p99 latency per route, plus API, PostgreSQL, Redis, and job health.
- Set explicit service targets before declaring a supported user count; do not infer capacity from a single successful run.
- Verify health checks, graceful recovery, and useful logs when Redis or the API is unavailable.

**Acceptance:** A published test report states the tested concurrency, traffic profile, latency/error results, bottleneck, and pass/fail against agreed targets.

### 3. Validate abuse handling

- Test request floods, rapid repeated joins, duplicate submissions, scripted polling, and repeated invalid authentication/payment requests.
- Confirm rate limits are applied at the appropriate identity/IP/route boundary and do not allow simple header changes to bypass controls.
- Verify limits produce clear retry behavior and observable operational signals without logging credentials or tokens.
- Test fairness under abuse: aggressive clients must not gain queue priority or consume extra inventory.

**Acceptance:** Each configured abuse scenario has a reproducible expected outcome, measured limit behavior, and evidence that ordinary users retain a usable path.

### 4. Prove allocation and inventory integrity

- Submit competing holds for the same seat and for the final available seats.
- Retry requests after simulated timeouts and duplicate delivery; exercise hold expiry, cancellation, and payment replay.
- Check transactional locking/constraints and idempotency at the API and database boundaries.
- Reconcile event capacity against available, held, expired, released, and confirmed seats after every run.

**Acceptance:** No seat is confirmed to more than one reservation, confirmed inventory never exceeds capacity, and retries cannot duplicate a reservation or payment result.

### 5. Test session continuity and failure recovery

- Refresh, reconnect, reopen a browser, and retry after transient API/Redis disruptions.
- Confirm the same signed-in user can recover queue status and active reservation state from the server rather than relying on volatile browser-only state.
- Define what users see when a hold expires, a request outcome is unknown, or a dependency is temporarily unavailable.
- Keep credentials/session tokens out of URLs, logs, and test reports.

**Acceptance:** For each injected failure, the user-visible result is explicit and the server can safely recover or reject the operation without corrupting state.

### 6. Quantify fairness

- Define the intended queue policy precisely (randomized draw, ordered admission batches, tie-breaking, and treatment of late arrivals).
- Run the same seeded arrivals with normal and abusive clients; compare admission positions, admission rates, wait times, and successful seat allocation by cohort.
- Report the distribution and confidence/variation across repeated randomized runs; do not claim fairness based only on an average.
- Make the policy and its limitations visible to operators and users.

**Acceptance:** Reports show whether the allocation policy meets a pre-agreed fairness criterion and whether automated behavior creates a measurable advantage.

### 7. Provide operator and demo safeguards

- Expose queue depth, admitted/waiting counts, hold expiry, checkout outcomes, route latency/errors, rate-limit events, and dependency health.
- Add clear test-mode labeling and ensure mock payments cannot be mistaken for real charges.
- Document safe startup/reset/stop instructions, demo credentials, test limits, and how to interpret results.
- Keep admin controls protected and audit queue shuffles and other consequential actions.

**Acceptance:** An operator can identify a test run's health and outcomes without querying or editing production data manually.

## Suggested delivery order

1. Establish the isolated, repeatable test environment and baseline measurements.
2. Test allocation integrity and retry/idempotency before increasing traffic.
3. Add configurable concurrency/abuse scenarios and collect route/dependency metrics.
4. Compare normal and abusive cohorts against the documented queue policy.
5. Close discovered reliability gaps, rerun the same scenarios, and publish the results.

## Decisions still needed

- Target peak concurrent users and arrival burst duration.
- Acceptable p95/p99 latency and error-rate limits for each critical route.
- The exact queue fairness policy and measurable fairness threshold.
- Which failure modes must be tolerated versus reported as temporary unavailability.
- Whether the next test milestone is local-only or a controlled remote demo.
