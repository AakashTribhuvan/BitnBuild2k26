# FairDrop Backend API

## Endpoints

### Auth
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login to get JWT
- `POST /auth/demo` - Issue a non-admin demo session when `DEMO_AUTH_ENABLED=true` (rate limited)
- `POST /auth/verify-email` - Verify email address
- `GET /auth/me` - Get current user profile

### Events
- `GET /events` - Get all events
- `GET /events/:id` - Get event details

### Queue
- `POST /queue/join` - Join the waiting room
- `GET /queue/status` - Check queue status and provide coarse activity signals
- `GET /queue/overview` - Public, aggregate-only live operations metrics
- `GET /queue/simulation-results` - Public aggregate-only results from local k6 cohort runs
Active events process weighted, random admission batches every 10 seconds. A batch can issue at most 15 expiring passes and is further capped by available inventory minus active passes. Joining the waiting room reserves no ticket; each pass can create one transactional seat hold. Google identity is required by default for regular accounts. When `DEMO_AUTH_ENABLED=true`, clearly marked non-admin demo accounts may join without a Google identity; this switch should remain off outside an explicitly configured demo. CAPTCHA is verified server-side when Turnstile is configured and required. The score uses coarse signals and is not proof that someone is a bot.

The batch policy is intentionally fixed at 15 passes per 10-second interval. `QUEUE_GRANT_SECONDS` controls how long a pass stays valid. Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` from the same Cloudflare Turnstile widget, then set `TURNSTILE_REQUIRED=true` to enforce challenges at queue entry. If keys are absent, the dashboard explicitly reports CAPTCHA as unconfigured; do not treat the heuristic score as a replacement.

`GET /queue/overview` returns inventory counts, configuration, and recent batch aggregates only. It does not expose user IDs, email addresses, IP addresses, or per-user signals.

The controlled human-like/scripted traffic comparison is available in the website's `/simulations` page and documented in `../tests/load/README.md`. Website runs require an authenticated demo or admin account and `SIMULATIONS_ENABLED=true`; k6 targets only the backend container's loopback API. Limits are enforced server-side (one run at a time, at most 50 total users, 50 seats and 35 seconds; three starts per 15 minutes per client IP). Aggregate results are stored in `simulation_runs`; temporary event, account, token and queue data are removed after each run.

Seat selection supports a transactional multi-seat hold. A single mock payment intent covers every reservation, and the API confirms all held seats together or leaves the full group unconfirmed. The configured event purchase limit still applies.

The live operations page intentionally never collects or reveals raw user cookies, JWTs or other session secrets. It exposes only aggregate queue and inventory statistics.

### Seats
- `GET /seats/available` - Get available seats
- `POST /seats/hold` - Hold a seat temporarily
- `DELETE /seats/hold/:seatId` - Release a held seat

### Reservations
- `GET /reservations` - List user reservations
- `GET /reservations/:id` - Get reservation details

The authenticated reservation-detail response includes event/seat labels and the latest mock payment status for the booking confirmation page.

### Payments
- `POST /payments/create-intent` - Create mock payment intent
- `POST /payments/webhook` - Webhook for payment processing
- `POST /payments/mock-success` - Mock payment success for demo

### Admin
- `GET /admin/stats` - Seat and queue stats
- `GET /admin/flags` - Risk flags
- `GET /admin/orders` - View orders
