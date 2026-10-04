# FairDrop frontend

FairDrop is a fair-access booking experience for high-demand events and travel. This frontend uses the requested Next.js 15, React 18, TypeScript and Tailwind CSS stack.

## Stack

- Next.js 15 App Router and React 18
- TypeScript and Tailwind CSS
- Axios for API requests; React Hook Form for authentication forms
- Lucide React icons
- Google Identity Services in the browser; Google ID-token verification and FairDrop JWT issuance belong to the API
- Node.js 20 is the target runtime

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The frontend calls the Express API directly at `http://localhost:4000`. The frontend and API ports match the supplied Compose stack and the Google OAuth JavaScript origin.

## Run the frontend and backend together

The Express backend is in `../backend`; the root `docker-compose.yml` builds this frontend and that backend.

1. Install/start Docker Desktop.
2. Set `GOOGLE_CLIENT_ID` in the repository-root `.env` to the Google OAuth web client ID. Leave it empty to use email/password.
3. Add `http://localhost:3000` to that Google OAuth client's **Authorized JavaScript origins**.
4. Run `../start.bat`, or from the repository root run `docker compose up --build`.
5. Open the frontend at `http://localhost:3000` and check the API at `http://localhost:4000/health`.

Compose starts PostgreSQL 16, Redis 7, the API and this Next.js app, waiting on the declared service health checks. The backend image runs migrations and demo seeding before starting the API. The demo credentials printed by `start.bat` are only for the local seeded development environment.

For temporary Cloudflare Quick Tunnel testing, set `FRONTEND_ORIGIN` to the frontend tunnel URL and `NEXT_PUBLIC_API_URL` to the API tunnel URL in the repository-root `.env`, then rebuild with `docker compose up --build -d backend frontend`. Both tunnel processes must stay running. Quick Tunnel URLs change when recreated, so update the values and rebuild after a restart. These links are public; do not expose real user data. Google sign-in also requires adding the current frontend tunnel URL as an authorized JavaScript origin in Google Cloud.

For local frontend development without Compose, keep the backend's allowed origin set to `http://localhost:3000`, and run the Next.js app and API on their respective ports.

```powershell
npm run typecheck
npm run build
npm start
```

Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the same Google Identity Services web client ID configured as `GOOGLE_CLIENT_ID` in the backend. The API validates the Google ID token with `google-auth-library`, links/creates the account and issues the FairDrop JWT.

## Current frontend scope

- Discovery keeps live `GET /events` listings alongside clearly marked preview scenarios, whether the API is online or offline. Live UUIDs are retained for subsequent queue and booking requests; previews never appear as live inventory.
- Event pages, queue joins/status, seat inventory and holds use the backend's actual `/events`, `/queue`, `/seats` and `/reservations` routes. The global category bar stays available on every route; category query parameters are applied when navigating between tabs.
- Email/password registration is followed by `/auth/login` because the backend's registration route does not issue a JWT. Google sign-in uses the standard Google Identity Services button and sends its credential to `/auth/google` for API verification. The button disables automatic account selection and resizes with its container; Google still decides whether an active session requires the account chooser or a password prompt. If Google sign-in fails, the UI attempts the separate `/auth/demo` flow; the backend issues a non-admin demo JWT only when `DEMO_AUTH_ENABLED=true`. The header marks this session with a turquoise “A” avatar and labels it as a demo account.
- Queue joining requires Google sign-in by default, and the API verifies Turnstile when configured and required. The waiting room reserves no ticket. Every 10 seconds the backend runs score-weighted random selection for at most 15 expiring admission passes, further limited by available seats; a pass can create one transactional hold. Coarse activity signals are not proof of bot activity and cannot guarantee detection.
- Seat inventory is fetched from `/seats?eventId=...` after admission, and one seat is held transactionally through `/seats/hold` for the backend's 10-minute window. Low-score attempts receive an additional Turnstile challenge when configured. Checkout reloads the server-owned reservation after navigation/refresh, shows its remaining time, and can release the hold with `/seats/hold/:seatId`; the server expires holds independently of the browser.
- The discovery page groups the full preview catalogue into movie/theatre, travel, and live-event collections, alongside category shortcuts and live search. Cards disclose preview listings and their illustrative capacity/layout. Search and category links filter the same event catalog; they do not imply separate real-world ticket suppliers.
- The home page positions FairDrop as a queueing/reservation API for ticketing and travel operators; its event listings are demonstration clients. The API flow and mock-payment limitations are disclosed on the page.
- Preview event details link to venue-specific illustrative seat plans (paired bus/train seating, cinema center aisles, curved theatre rows, stadium stands, and concert sections). Preview seats cannot be held or purchased. Live events continue to use API inventory and actual seat IDs; the seat map changes its arrangement based on the event layout without dropping API inventory.
- Checkout supports **mock payments only**. It can show a QR that opens a one-time FairDrop demo URL; opening that URL records a simulated success and the checkout device polls the server for confirmation. This does not open a bank app, request money, or transfer funds. The same-device demo action remains available, and the API is the only authority for reservation confirmation.
- Successful payment redirects to `/confirmation/[reservationId]`, which reloads the booking details from the authenticated API instead of trusting checkout/browser state.
- The header's **Live backend** link opens `/live-operations` in a new tab. It polls the public `/queue/overview` endpoint for aggregate inventory and recent admission batches only; no account identifiers or individual behavior data are returned.
- The header's **Simulations** link opens `/simulations` in a new tab. Its k6 comparison report is produced by `../tests/load/run-cohort-simulation.ps1`, which creates a temporary 15-seat event and 50 synthetic accounts locally, then persists only group-level outcome metrics.
- The admin operations page reads `/admin/stats`, `/admin/orders` and `/admin/flags`. Admin authorization is enforced by the API, never by client-side role checks.
- API/network failures remain visible if both Google and the explicitly enabled demo-session endpoint are unavailable. Demo sign-in is labeled and separate from Google identity; it does not imply Google verification, and bookings still require server-side reservation and payment confirmation.

## Backend and infrastructure boundary

The backend source, migrations, seed, Redis jobs and health check are in `../backend`. The root Compose file builds this Next.js app from `./frontend` and the API from `./backend`. Backend/API implementation details and exact frontend routes are in [`api-contract.json`](./api-contract.json).

- Node.js 20, Express and TypeScript, backed by PostgreSQL 16 and Redis 7.
- Startup migrations and demo-event/account seeds.
- Email/password and Google sign-in, API-issued JWT sessions, and role-protected admin routes.
- Redis-backed rate limiting/caching and background batch queue admission; PostgreSQL transactions for reservations, payment results and audit records.
- Queue admission, seat inventory/holds, expiry/release and purchase-limit enforcement on the server.
- A one-time, reservation-bound QR simulation for mock payments; no real payment provider, UPI integration, or card collection.
- Admin views for sale statistics, reservations and risk flags.
- Docker Compose for the complete backend/frontend deployment with health checks.

The API has development-only success actions at `/payments/mock-success` and `/payments/mock-scan/:token`; the frontend does not call `/payments/webhook`. The QR contains a one-time FairDrop URL, not a UPI payment URI. No real payment provider is integrated.

## Application routes

- `/` and `/events` — preview discovery and search
- `/events/[eventId]` — live event details and queue entry, or clearly marked preview details
- `/events/[eventId]/queue` — queue status and admission
- `/events/[eventId]/seats` — illustrative seat maps for preview listings; API-gated live inventory and reservation for real events
- `/checkout` — mock payment intent, optional QR simulation, and server-verified order status
- `/confirmation/[reservationId]` — server-verified booking confirmation
- `/live-operations` — public aggregate-only queue and inventory dashboard
- `/simulations` — public aggregate-only k6 traffic comparison report and local run instructions
- `/demo-pay/[token]` — clearly labeled scan-to-complete payment simulation
- `/login` — email/password and optional Google sign-in
- `/admin` — admin operations via protected API routes

Event photography is kept locally in `public/images/`; runtime pages do not hotlink an external image service.
