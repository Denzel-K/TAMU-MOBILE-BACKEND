#!/usr/bin/env bash
set -euo pipefail

# This script starts ngrok for the backend (port 5000),
# discovers the public HTTPS URL, and writes it into:
# - ../TAMU-MOBILE-APP/.env     as EXPO_PUBLIC_API_BASE_URL
# - ./.env                      as CORS_ORIGINS (comma-separated, preserving existing Vercel URL if present)

BACKEND_PORT=${PORT:-5000}
MODE_START=true
if [[ "${1:-}" == "--update-only" ]]; then
  MODE_START=false
fi
BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$(cd "${BACKEND_DIR}/../TAMU-MOBILE-APP" && pwd)"
BACKEND_ENV="${BACKEND_DIR}/.env"
APP_ENV="${APP_DIR}/.env"

command -v ngrok >/dev/null 2>&1 || {
  echo "[ERROR] ngrok is not installed. Install it from https://ngrok.com/download and ensure it is in PATH." >&2
  exit 1
}

# Start ngrok if not already running on localhost:4040
if ! curl -sS http://127.0.0.1:4040/api/tunnels >/dev/null 2>&1; then
  echo "[INFO] Starting ngrok for http ${BACKEND_PORT}..."
  # Run in background; user can stop it with Ctrl+C in the spawned terminal or kill the process.
  nohup ngrok http ${BACKEND_PORT} >/dev/null 2>&1 &
  # Wait for API to become available
  for i in {1..60}; do # up to ~30s
    sleep 0.5
    if curl -sS http://127.0.0.1:4040/api/tunnels >/dev/null 2>&1; then
      break
    fi
    if [[ $i -eq 60 ]]; then
      echo "[ERROR] ngrok API (http://127.0.0.1:4040) did not become ready. Ensure ngrok is logged in: 'ngrok config add-authtoken <token>'." >&2
      exit 1
    fi
  done
fi

# Poll until an HTTPS public_url appears (tunnel may not be ready immediately)
PUBLIC_URL=""
for i in {1..60}; do # up to ~30s
  TUNNELS_JSON=$(curl -sS http://127.0.0.1:4040/api/tunnels || true)
  # Extract the first https public_url with sed (portable)
  PUBLIC_URL=$(echo "$TUNNELS_JSON" | sed -n 's/.*"public_url":"\(https:[^"]*\)".*/\1/p' | head -n1)
  if [[ -n "${PUBLIC_URL}" && "${PUBLIC_URL}" == https://* ]]; then
    break
  fi
  # If we are not allowed to start ngrok (update-only) and no tunnels appear, abort sooner
  if [[ "$MODE_START" == "false" && $i -ge 6 ]]; then
    break
  fi
  sleep 0.5
done

if [[ -z "${PUBLIC_URL}" || "${PUBLIC_URL}" != https://* ]]; then
  echo "[ERROR] No active https tunnel found from ngrok API (http://127.0.0.1:4040/api/tunnels)." >&2
  echo "Hint: You may have hit 'ERR_NGROK_108' (another agent session elsewhere)." >&2
  echo "- Visit https://dashboard.ngrok.com/agents and terminate other sessions." >&2
  echo "- Or run: pkill ngrok ; then: ngrok config add-authtoken <token> ; then: ngrok http ${BACKEND_PORT}" >&2
  echo "- After you see the https URL in the ngrok terminal, rerun: bash scripts/start-ngrok.sh --update-only" >&2
  exit 1
fi

echo "[INFO] Discovered ngrok URL: ${PUBLIC_URL}"

# Ensure env files exist
[[ -f "${APP_ENV}" ]] || touch "${APP_ENV}"
[[ -f "${BACKEND_ENV}" ]] || touch "${BACKEND_ENV}"

# Update mobile app .env -> EXPO_PUBLIC_API_BASE_URL
if grep -q '^EXPO_PUBLIC_API_BASE_URL=' "${APP_ENV}"; then
  sed -i "s#^EXPO_PUBLIC_API_BASE_URL=.*#EXPO_PUBLIC_API_BASE_URL=${PUBLIC_URL}#" "${APP_ENV}"
else
  printf "\nEXPO_PUBLIC_API_BASE_URL=%s\n" "${PUBLIC_URL}" >> "${APP_ENV}"
fi

echo "[INFO] Updated ${APP_ENV} with EXPO_PUBLIC_API_BASE_URL=${PUBLIC_URL}"

# Update backend .env -> CORS_ORIGINS (preserve any existing Vercel URL if present)
EXISTING_CORS_ORIGINS=$(grep -E '^CORS_ORIGINS=' "${BACKEND_ENV}" | head -n1 | cut -d'=' -f2- || true)
VERCEL_URL=""
if [[ -n "${EXISTING_CORS_ORIGINS}" ]]; then
  # Split by comma and filter for a vercel.app domain
  VERCEL_URL=$(echo "${EXISTING_CORS_ORIGINS}" | tr ',' '\n' | grep -Eo 'https?://[^ ]*vercel\.app' | head -n1 || true)
fi

NEW_CORS_ORIGINS="${PUBLIC_URL}"
if [[ -n "${VERCEL_URL}" ]]; then
  NEW_CORS_ORIGINS="${NEW_CORS_ORIGINS},${VERCEL_URL}"
fi

if grep -q '^CORS_ORIGINS=' "${BACKEND_ENV}"; then
  sed -i "s#^CORS_ORIGINS=.*#CORS_ORIGINS=${NEW_CORS_ORIGINS}#" "${BACKEND_ENV}"
else
  printf "\nCORS_ORIGINS=%s\n" "${NEW_CORS_ORIGINS}" >> "${BACKEND_ENV}"
fi

echo "[INFO] Updated ${BACKEND_ENV} with CORS_ORIGINS=${NEW_CORS_ORIGINS}"

echo "[DONE] ngrok is running. Public URL: ${PUBLIC_URL}"
echo "- Backend health check: ${PUBLIC_URL}/health"
echo "- Remember to restart the backend if needed so any other env changes take effect."
