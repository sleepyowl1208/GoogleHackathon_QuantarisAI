#!/bin/bash
# Starts the API and the web app in one container. If either stops, the container stops, so Cloud Run restarts it.
set -e
ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
[ -f "$ROOT/apps/api/main.py" ] || ROOT=/app
cd "$ROOT"
"${PYTHON:-python3}" -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 &
API=$!
cd apps/web
./node_modules/.bin/next start -p "${PORT:-8080}" -H 0.0.0.0 &
WEB=$!
trap 'kill $API $WEB 2>/dev/null' TERM INT
wait -n
kill $API $WEB 2>/dev/null || true
exit 1
