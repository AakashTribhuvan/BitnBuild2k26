# FairDrop

FairDrop is a full-stack demo for fair access to high-demand event tickets. The frontend is in [`FairDrop_Frontend/`](./FairDrop_Frontend/); the Express API and Docker Compose stack are in [`ticket-booking-main/ticket-booking-main/`](./ticket-booking-main/ticket-booking-main/).

## Run locally

Prerequisites: Docker Desktop with Compose and Node.js 20+.

1. Copy `ticket-booking-main/ticket-booking-main/.env.example` to `.env` in that same directory.
2. Optionally configure `GOOGLE_CLIENT_ID` and add `http://localhost:3000` as an authorized JavaScript origin in Google Cloud. Email/password login works without Google sign-in.
3. Start the stack:

   ```powershell
   cd ticket-booking-main/ticket-booking-main
   .\start.bat
   ```

4. Open `http://localhost:3000`. The API health endpoint is `http://localhost:4000/health`.

Local demo accounts: `user@fairdrop.com` / `user123` and `admin@fairdrop.com` / `admin123`. Do not use these credentials or the Compose development secrets for deployment.

## What works

- Email/password and optional Google sign-in
- Server-backed queue admission, seat inventory, transactional seat holds and expiry
- Mock checkout with a one-time QR payment simulation
- Admin operations and PostgreSQL-backed data, with Redis rate limiting

**Payments are simulated only.** The QR is not a UPI request, does not open a banking app, and never transfers money. Do not enter real payment details.

For frontend development, validation, and route details, see the [frontend README](./FairDrop_Frontend/README.md). Backend, Compose, and local load-test documentation are in the [stack README](./ticket-booking-main/ticket-booking-main/README.md) and [`tests/load/README.md`](./ticket-booking-main/ticket-booking-main/tests/load/README.md).
