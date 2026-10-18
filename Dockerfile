# QuantarisAI: one container serves the web app (port $PORT) and the API (inside, on 127.0.0.1:8000).
# The browser only ever calls /api on the same origin; Next.js forwards it to the API in this container.
# Build:  docker build -t quantaris .
# Run:    docker run --rm -p 8080:8080 -e GEMINI_API_KEY=... quantaris      (then open http://localhost:8080)

# ---- 1. build the web app
FROM node:22-bookworm-slim AS web
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web ./
# the old /classic and /scenarios starter pages import these files from outside apps/web, so the build needs them
COPY design/v2_full/QuantarisAI-V2-handoff/design-system/handoff /app/design/v2_full/QuantarisAI-V2-handoff/design-system/handoff
ENV QUANTARIS_API_ORIGIN=http://127.0.0.1:8000 NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev && rm -rf .next/cache

# ---- 2. run both
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./requirements.txt
COPY apps/api/requirements.txt ./apps/api/requirements.txt
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
COPY apps/__init__.py ./apps/__init__.py
COPY apps/api ./apps/api
COPY --from=web /app/apps/web ./apps/web
COPY infrastructure/docker/start.sh ./start.sh

# Run as a normal user. The API keeps a small cache (geocoding, generated clips) in /app/.quantaris-cache, which is lost when the instance stops.
RUN useradd --create-home app && mkdir -p /app/.quantaris-cache && chown -R app /app/.quantaris-cache /app/apps/web/.next && chmod +x /app/start.sh
USER app
ENV PORT=8080 PYTHON=/opt/venv/bin/python NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
EXPOSE 8080
CMD ["/app/start.sh"]
