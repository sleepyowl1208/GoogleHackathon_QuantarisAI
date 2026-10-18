#!/bin/bash
# Starts the API and the web app in one container. If either stops, the container stops, so Cloud Run restarts it.
set -e
ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
[ -f "$ROOT/apps/api/main.py" ] || ROOT=/app
cd "$ROOT"
"${PYTHON:-python3}" -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 &
API=$!
trap 'kill $API $WEB 2>/dev/null' TERM INT

# The web app is started only once the API answers. Cloud Run sends traffic as soon as the web port is open, and a request
# that arrived before the API was up would fail with "can't reach the design service".
for _ in $(seq 1 120); do
  kill -0 $API 2>/dev/null || { echo "API stopped while starting" >&2; exit 1; }
  "${PYTHON:-python3}" -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=1)" 2>/dev/null && break
  sleep 0.5
done

cd apps/web
./node_modules/.bin/next start -p "${PORT:-8080}" -H 0.0.0.0 &
WEB=$!
wait -n
kill $API $WEB 2>/dev/null || true
exit 1
