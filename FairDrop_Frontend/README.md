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

The backend project and `docker-compose.yml` are in `../ticket-booking-main/ticket-booking-main`. The Compose file is wired to build this frontend directory, not the duplicate frontend scaffold included with the backend.

1. Install/start Docker Desktop.
2. Set `GOOGLE_CLIENT_ID` in `../ticket-booking-main/ticket-booking-main/.env` to the Google OAuth web client ID. Leave it empty to use email/password.
3. Add `http://localhost:3000` to that Google OAuth client's **Authorized JavaScript origins**.
4. Run `../ticket-booking-main/ticket-booking-main/start.bat`, or from the backend project directory run `docker compose up --build`.
5. Open the frontend at `http://localhost:3000` and check the API at `http://localhost:4000/health`.

Compose starts PostgreSQL 16, Redis 7, the API and this Next.js app, waiting on the declared service health checks. The backend image runs migrations and demo seeding before starting the API. The demo credentials printed by `start.bat` are only for the local seeded development environment.

For temporary Cloudflare Quick Tunnel testing, set `FRONTEND_ORIGIN` to the frontend tunnel URL and `NEXT_PUBLIC_API_URL` to the API tunnel URL in the backend project's `.env`, then rebuild with `docker compose up --build -d backend frontend`. Both tunnel processes must stay running. Quick Tunnel URLs change when recreated, so update the values and rebuild after a restart. These links are public; do not expose real user data. Google sign-in also requires adding the current frontend tunnel URL as an authorized JavaScript origin in Google Cloud.

For local frontend development without Compose, keep the backend's allowed origin set to `http://localhost:3000`, and run the Next.js app and API on their respective ports.

```powershell
npm run typecheck
npm run build
npm start
```

Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the same Google Identity Services web client ID configured as `GOOGLE_CLIENT_ID` in the backend. The API validates the Google ID token with `google-auth-library`, links/creates the account and issues the FairDrop JWT.

## Current frontend scope

- Discovery loads live events from `GET /events` when the API is online and clearly labelled preview listings when it is offline. Live UUIDs are retained for subsequent queue and booking requests.
- Event pages, queue joins/status, seat inventory and holds use the backend's actual `/events`, `/queue`, `/seats` and `/reservations` routes.
- Email/password registration is followed by `/auth/login` because the backend's registration route does not issue a JWT. Google sign-in sends the GIS `credential` to `/auth/google`; email/password remains an explicit fallback if Google cannot load or complete authentication.
- Queue joining requires an account; successful sign-in returns the user to the event. Queue status is polled from `/queue/status?eventId=...`.
- Seat inventory is fetched from `/seats?eventId=...` after admission, and one seat is held transactionally through `/seats/hold` for the backend's 10-minute window. Checkout reloads the server-owned reservation after navigation/refresh, shows its remaining time, and can release the hold with `/seats/hold/:seatId`; the server expires holds independently of the browser.
- Checkout supports **mock payments only**. It can show a UPI-style QR that opens a one-time FairDrop demo URL; opening that URL records a simulated success and the checkout device polls the server for confirmation. This does not open a bank app, request money, or transfer funds. The same-device demo action remains available, and the API is the only authority for reservation confirmation.
- The operations page reads `/admin/stats`, `/admin/orders` and `/admin/flags`, and invokes `/queue/shuffle`. Admin authorization is enforced by the API, never by client-side role checks.
- API/network/authentication failures are shown to the user rather than converted into successful-looking demo bookings.

## Backend and infrastructure boundary

The supplied backend source, migrations, seed, Redis jobs, health check and Compose stack are in `../ticket-booking-main/ticket-booking-main`. The Compose frontend build context now points to this Next.js application. Backend/API implementation details and exact frontend routes are in [`api-contract.json`](./api-contract.json).

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
- `/events/[eventId]` — event details and queue entry
- `/events/[eventId]/queue` — queue status and admission
- `/events/[eventId]/seats` — API-gated seat inventory and reservation
- `/checkout` — mock payment intent, optional QR simulation, and server-verified order status
- `/demo-pay/[token]` — clearly labeled scan-to-complete payment simulation
- `/login` — email/password and optional Google sign-in
- `/admin` — admin operations via protected API routes

Event photography is kept locally in `public/images/`; runtime pages do not hotlink an external image service.
