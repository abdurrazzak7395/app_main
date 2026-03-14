# SVP Token Panel

Monorepo project for a **token-input based** custom panel around the PACC / SVP protected APIs.

## What this project does

- Lets each user create their own account in **your** system
- Lets each user paste a valid **SVP bearer token** that they obtained through the official flow
- Encrypts and stores that token on the backend
- Validates the token by calling a protected SVP endpoint
- Exposes a clean backend API for the main protected endpoints from the shared Postman collection
- Provides a Next.js frontend dashboard to call those backend endpoints from your own UI

## What this project does NOT do

- It does **not** automate official login
- It does **not** solve or bypass reCAPTCHA
- It does **not** collect OTP from the official site
- It expects the user to already have a valid bearer token from the official flow

## Repo structure

- `backend/` Express API server
- `frontend/` Next.js dashboard for Vercel

## Quick start

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Default backend URL: `http://localhost:4000`

### 2) Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Default frontend URL: `http://localhost:3000`

## Backend environment

Create `backend/.env` from `.env.example`.

Important values:

- `PORT=4000`
- `FRONTEND_URL=http://localhost:3000`
- `SESSION_SECRET=change-me`
- `APP_ENCRYPTION_KEY=` 64 hex chars for AES-256-GCM
- `SVP_API_BASE_URL=https://svp-international-api.pacc.sa/api/v1`
- `SVP_LOCALE=en`
- `RAILWAY_PRIVATE_DOMAIN=appmain.railway.internal` (optional Private DNS in Railway)
- PostgreSQL env (Railway):
  - `DATABASE_PUBLIC_URL=postgresql://postgres:JxBIZgHLproVsElpxPrjftWOTevhfvCH@shuttle.proxy.rlwy.net:48062/railway`
  - `DATABASE_URL=postgresql://postgres:JxBIZgHLproVsElpxPrjftWOTevhfvCH@shuttle.proxy.rlwy.net:48062/railway`
  - `PGDATA=/var/lib/postgresql/data/pgdata`
  - `PGDATABASE=railway`
  - `PGHOST=shuttle.proxy.rlwy.net`
  - `PGPASSWORD=JxBIZgHLproVsElpxPrjftWOTevhfvCH`
  - `PGPORT=48062`
  - `PGUSER=postgres`
  - `POSTGRES_DB=railway`
  - `POSTGRES_PASSWORD=JxBIZgHLproVsElpxPrjftWOTevhfvCH`
  - `POSTGRES_USER=postgres`
  - `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=60`
  - `SSL_CERT_DAYS=820`

Direct psql connect:
```bash
PGPASSWORD=JxBIZgHLproVsElpxPrjftWOTevhfvCH psql -h shuttle.proxy.rlwy.net -U postgres -p 48062 -d railway
```

Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Frontend environment

Create `frontend/.env.local` from `.env.example`.

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` (local)
- `NEXT_PUBLIC_API_BASE_URL=https://appmain-production.up.railway.app` (Railway production)
- `NEXT_PUBLIC_API_BASE_URL=https://pacc-booking.vercel.app` (Vercel frontend)

## Deploy notes

### Railway deployment setup

1. Install Railway CLI: `npm install -g railway`
2. From repo root run: `railway init` and connect to your Railway project.
3. Create a Railway setup file (already added): `railway.json`.
4. Ensure backend env in Railway contains:
   - `PORT=4000`
   - `FRONTEND_URL=http://localhost:3000`
   - `SESSION_SECRET`
   - `APP_ENCRYPTION_KEY` (64 hex chars)
   - `SVP_API_BASE_URL=https://svp-international-api.pacc.sa/api/v1`
   - `SVP_LOCALE=en`
   - `RAILWAY_PRIVATE_DOMAIN=appmain.railway.internal` (optional)
5. Set frontend env:
   - `NEXT_PUBLIC_API_BASE_URL=https://appmain-production.up.railway.app`

### Backend

Works well on Railway, Render, Fly.io, VPS, or any Node host.

This starter uses SQLite (`backend/data/app.db`). For real production:

- mount a persistent volume, or
- replace SQLite with PostgreSQL/MySQL

### Frontend

Deploy `frontend/` to Vercel.

#### Vercel setup

1. Install Vercel CLI (optional): `npm i -g vercel`
2. From repo root run: `vercel login` then `vercel` and choose this project.
3. When prompted, set project root to `frontend`.
4. Set environment variables in Vercel:
   - `NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com`
5. Deploy with `vercel --prod`.

> If you use monorepo settings, configure Vercel to use `frontend` as the root directory and build command `npm run build`.

## Main backend endpoints

### App auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Token management

- `POST /api/token/save`
- `GET /api/token/status`
- `DELETE /api/token`
- `GET /api/pacc/validate-token`

### PACC / SVP proxy endpoints

- `GET /api/pacc/permissions`
- `GET /api/pacc/occupations`
- `GET /api/pacc/certificate-price`
- `GET /api/pacc/verification-requests`
- `GET /api/pacc/exam-constraints`
- `GET /api/pacc/feature-flags`
- `GET /api/pacc/notifications`
- `GET /api/pacc/payments/validate-pending`
- `GET /api/pacc/exam-sessions/available-dates`
- `GET /api/pacc/exam-sessions`
- `GET /api/pacc/exam-sessions/:id`
- `POST /api/pacc/temporary-seats`
- `GET /api/pacc/balance/:userId`
- `GET /api/pacc/reservations`
- `GET /api/pacc/reservations/:id`
- `GET /api/pacc/reservations/validate`
- `POST /api/pacc/reservations`
- `POST /api/pacc/reservation-credits/use`
- `GET /api/pacc/tickets/:id/pdf`
- `DELETE /api/pacc/logout-official`

## Security notes

- App users authenticate to **your** backend using secure sessions
- SVP bearer tokens are encrypted at rest with AES-256-GCM
- Do not store bearer tokens in the browser localStorage
- Use HTTPS in production
- Rotate any real tokens that were exposed in previous shared files

