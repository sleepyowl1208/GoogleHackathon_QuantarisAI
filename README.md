# QuantarisAI

AI manufacturing intelligence. Describe a factory in plain language (English or Hindi), or describe an existing one and upload its layout and photos. You get a researched, sourced blueprint: a 3D layout, sourcing, costs, best practices, water and waste per step, and an AI operations layer that turns plant data into insights, recommendations and actions. Every claim is labelled fact, assumption, calculation, idea to validate, simulation or unknown. Nothing is faked.

- **Backend:** FastAPI in `apps/api` (Python 3.11+). Gemini is called over REST with the standard library.
- **Frontend:** Next.js 16 and React 19 in `apps/web`. Three.js for the 3D plant, Leaflet for the map.

## Run it

You need Python 3.11+, Node 20+, and a Gemini API key from https://aistudio.google.com/apikey.

```sh
# 1. one-time setup
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
(cd apps/web && npm install)
cp .env.example .env.local          # then put your key in GEMINI_API_KEY (this file is gitignored)
cp apps/web/.env.example apps/web/.env.local

# 2. start both servers (API on :8000, web on :3000)
make dev
```

Open http://localhost:3000. Or run them in two terminals:

```sh
# API, from the project root
.venv/bin/python -m uvicorn apps.api.main:app --port 8000 --reload
# or from inside apps/api
cd apps/api && ../../.venv/bin/python -m uvicorn main:app --reload
# web
cd apps/web && npm run dev
```

Never paste a key into chat, a commit or a screenshot. `.env.local` is gitignored.

## Check it

```sh
make test                      # backend tests (unittest)
cd apps/web
npm run typecheck && npm run lint && npm test && npm run build
```

## What is where

| Path | What |
|---|---|
| `apps/api/agents` | Gemini agents: design, research, costs, practices, insights, edit, copilot, inspection |
| `apps/api/ops` | Plant analytics (maintenance, OEE, forecast, emissions) and the water/waste balance |
| `apps/api/ops/sample_data.py` | Generates the three sample plants in `apps/web/public/samples` |
| `apps/web/components/app` | The chat app and the tabs beside the 3D plant |
| `apps/web/components/blueprint` | The 3D scene, people, animals, machines, smoke |
| `docs/product/AI_OPERATIONS.md` | What runs on which data, and the honest limits |

## Honest limits

The Plant AI tab's machine, production, quality, demand, smoke and effluent numbers are simulated until a real plant's data is loaded (the Your data tab accepts a CSV). Prices are indicative web figures, not quotes. Google Cloud services (BigQuery, Vertex AI, Pub/Sub, Dataflow, Cloud Storage, Cloud Run) are not used yet.
