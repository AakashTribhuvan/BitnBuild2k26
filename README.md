# FairDrop

FairDrop is a full-stack demo for fair access to high-demand event tickets and travel. The Next.js frontend is in [`frontend/`](./frontend/); the Express API is in [`backend/`](./backend/).

## Run locally

Prerequisites: Docker Desktop with Compose and Node.js 20+.

1. Copy `.env.example` to `.env` in the repository root.
2. Optionally configure `GOOGLE_CLIENT_ID` and add `http://localhost:3000` as an authorized JavaScript origin in Google Cloud. Email/password login works without Google sign-in.
   `DEMO_AUTH_ENABLED` defaults to `false`; set it to `true` only for a local/public demo that needs the clearly labeled, non-admin demo sign-in fallback when Google is unavailable.
3. Start the stack:

   ```powershell
   .\start.bat
   ```

4. Open `http://localhost:3000`. The API health endpoint is `http://localhost:4000/health`.

Local demo accounts: `user@fairdrop.com` / `user123` and `admin@fairdrop.com` / `admin123`. Do not use these credentials or the Compose development secrets for deployment.

## What works

- Email/password, Google sign-in, and an opt-in non-admin demo-account fallback
- Server-backed queue admission, seat inventory, transactional seat holds and expiry
- Searchable event catalog, categories, compact featured cards and related browsing
- One-time QR-based **payment simulation**: opening the URL confirms a mock reservation only. It is not a UPI request, does not open a bank app and never transfers money.
- Admin operations and PostgreSQL-backed data, with Redis rate limiting

## Development checks

```powershell
cd backend
npm ci
npm run build

cd ..\frontend
npm ci
npm run typecheck
npm run build
```

The local k6 comparison between human-like and scripted queue traffic is documented in [`tests/load/README.md`](./tests/load/README.md), and its aggregate report appears at `/simulations`. The runner is local-only; never point load tests or public tunnels at production or real user data.

See the [frontend documentation](./frontend/README.md) and [backend documentation](./backend/README_BACKEND.md) for API contracts and implementation details.
