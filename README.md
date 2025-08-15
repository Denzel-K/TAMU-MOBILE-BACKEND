# TAMU Mobile Backend

A Node/Express backend powering the TAMU Mobile App. This README covers setup from clone to running in development and for external testers using ngrok, including the free static domain. It also explains how this service connects to the mobile app.

## Table of Contents
- Prerequisites
- Project Structure
- Quick Start (Clone → Run)
- Environment Variables
- Running in Development
- Using ngrok (Stable HTTPS)
- CORS Configuration
- Health Checks & Debugging
- How This Backend Connects to the Mobile App

## Prerequisites
- Node.js LTS and npm
- (Optional) ngrok account and CLI for external testing
- Access to your MongoDB database

## Project Structure
- `src/server.ts` — Express server entry (listens on `0.0.0.0:${PORT}`)
- `scripts/start-ngrok.sh` — Helper to start ngrok and update envs in both repos
- `.env.example` — Template for required environment variables (copy to `.env`)

## Quick Start (Clone → Run)
1) Install dependencies
```bash
npm install
```

2) Create `.env`
Copy `.env.example` to `.env` and fill values:
```bash
cp .env.example .env
```

Minimum required values:
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=<your-mongodb-uri>
# CORS: include your mobile app origins (local dev, Expo, and/or ngrok & Vercel)
CORS_ORIGINS=https://<your-ngrok-domain>.ngrok-free.app,https://<your-vercel-app>.vercel.app
# Other secrets (JWT, email, Cloudinary, etc.)
JWT_SECRET=<random-strong-secret>
```

3) Start the server
```bash
npm run build && npm start
```
The server listens on `http://0.0.0.0:5000`.

## Environment Variables
Key variables used by the server:
- `PORT` — Defaults to `5000`.
- `MONGODB_URI` — MongoDB connection string.
- `CORS_ORIGINS` — Comma-separated list of allowed origins (production/testing).
- `CORS_ORIGIN` — Single-origin fallback.
- `NODE_ENV` — `development` or `production`.
- `JWT_SECRET`, `EMAIL_*`, `CLOUDINARY_*` — as needed by your features.

See `.env.example` for the full list and guidance.

## Running in Development
- Start the server in one terminal:
```bash
npm run build && npm start
```
- For local-only testing (same LAN), point the mobile app to your machine’s IP:
  - `EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:5000` (the app auto-appends `/api`).

## Using ngrok (Stable HTTPS)
For testers off your LAN, expose the backend with ngrok.

- Recommended: reserve a free static domain in the ngrok dashboard (e.g. `my-app.ngrok-free.app`).
- Authenticate on the backend machine: `ngrok config add-authtoken <token>`.
- Start ngrok:
```bash
ngrok http --url=my-app.ngrok-free.app 5000
```
- Or use the helper script to start and update envs in both repos:
```bash
# Uses NGROK_STATIC_DOMAIN when set, falls back to ephemeral
export NGROK_STATIC_DOMAIN=my-app.ngrok-free.app
bash scripts/start-ngrok.sh
# If a tunnel is already running, only update envs:
bash scripts/start-ngrok.sh --update-only
```
- This will update:
  - `../TAMU-MOBILE-APP/.env` → `EXPO_PUBLIC_API_BASE_URL=https://my-app.ngrok-free.app`
  - `./.env` → `CORS_ORIGINS` to include the ngrok and Vercel URLs

## CORS Configuration
CORS is configured in `src/server.ts`.
- Use `CORS_ORIGINS` (comma-separated) for production/testing.
- The script preserves existing Vercel origin entries when updating.

## Health Checks & Debugging
- If available, test a health endpoint (e.g. `/health`) through the tunnel:
```bash
curl https://my-app.ngrok-free.app/health
```
- Common issues:
  - `ERR_NGROK_108`: another ngrok session active — kill others in dashboard or `pkill ngrok`.
  - CORS blocked: ensure the mobile/Vercel origins are listed in `CORS_ORIGINS`.

## How This Backend Connects to the Mobile App
- The mobile app reads `EXPO_PUBLIC_API_BASE_URL` and calls `https://.../api/*`.
- Ensure your backend routes are mounted under `/api` (the app appends `/api`).
- Keep `CORS_ORIGINS` aligned with the app’s origins (ngrok static domain and Vercel URL).
- See the app repo at `../TAMU-MOBILE-APP/` for its environment and build instructions.
