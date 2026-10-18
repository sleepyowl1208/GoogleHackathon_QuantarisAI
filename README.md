# QuantarisAI

**AI manufacturing intelligence for Bharat.** Plan a factory, find where to build it, and run it cleaner, in English or Hindi.

Manufacturing is one of the pillars of Bharat, but a new factory often starts with a guess: what to build, where, and how to keep it clean. An existing one often cannot see where it loses water, material and money. QuantarisAI replaces the guess with a researched, sourced plan, and then works from the owner's own photos and records.

<img width="2880" height="1620" alt="image" src="https://github.com/user-attachments/assets/c356e787-0e7d-40c1-83a6-8c7f25a4640a" />


## What it does

### Starting a new factory

- **Describe it in your own words**, or just say what you have: "100 kg of coconut husk a day in Kerala", "40 cows in Anand". If you have not chosen a product, the AI picks the best fit and explains why.
- **A 3D plant** with the steps and machines, raw material arriving whole at the gate, product leaving the dock, workers, smoke, and a small farm beside the gate when the raw material is a crop. Edit it by voice or text.
- **Best location**: ranked real areas in your city (industrial estates, agro parks, village clusters) with reasons, sources, and pins on a map.
- **Sourcing and costs**: nearest suppliers first, indicative machine prices, land options, and typical productivity, each with a link to its source or a note that none was found.

### Improving an existing factory

- **Upload photos or a layout** of your plant or its waste, and say what you want ("this is my waste, what next, how do I control pollution?").
- The AI reads them and returns the **current process as it understands it, the problem areas, improvement ideas, and an improved layout** to compare with the current one.

### For both

- **Reuse & save**: three plain cards for water, smoke and heat, and waste. Each shows Today, Fix, Result, what the recovered material is reused for, and a first step.
- **Plant AI**: machine health, production (OEE and bottleneck), quality drift, a 13-week demand forecast, and smoke and treated water **with and without AI control**.
- **Your data**: upload daily records as a CSV and get water, energy and waste per unit, the gap against your own best days, unusual days, and the saving from reuse, recovery and leak fixes.
- **Ask the AI**: a copilot that explains the numbers and recommends actions, quoting only numbers that were computed.
- **Photo inspection**: Gemini vision looks for visible defects in a product photo.
- **English and Hindi**, voice and text, optional hand control, and a printable report.

### Honest by design

Every claim is labelled **fact, assumption, calculation, idea to validate, simulation or unknown**. Nothing is faked.

## How we use Google services

| Service | What for |
| --- | --- |
| **Gemini API** | Text and structured answers for the agents; **Google Search grounding** for real places, suppliers and practices; **vision** for plant, waste and product photos; **image generation** for step illustrations; **Veo** for video, on request |
| **Google Maps Platform** | Maps JavaScript API for the sourcing and best-location maps; Geocoding and Places APIs for places and addresses |
| **Cloud Run** | Runs the app as one Docker container |
| **Cloud Build** | Builds a new image on every commit |
| **Artifact Registry** | Stores the container images |

## Quick start

You need Python 3.11+, Node 20+, and a Gemini API key from <https://aistudio.google.com/apikey>.

```sh
# one-time setup
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
(cd apps/web && npm install)
cp .env.example .env.local            # put your key in GEMINI_API_KEY (this file is gitignored)
cp apps/web/.env.example apps/web/.env.local

# start the API (:8000) and the web app (:3000)
make dev
```

Open <http://localhost:3000>. Or start them separately:

```sh
.venv/bin/python -m uvicorn apps.api.main:app --port 8000 --reload   # or: cd apps/api && ../../.venv/bin/python -m uvicorn main:app --reload
cd apps/web && npm run dev
```

Never paste a key into chat, a commit or a screenshot. `.env.local` is gitignored.

### Settings

| Variable | Needed? | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `GEMINI_MODEL` | No | Text model (has a default) |
| `GOOGLE_MAPS_BROWSER_KEY` | No | Google Maps in the browser; restrict it to your site's web address. Without it, maps use OpenStreetMap |
| `GOOGLE_MAPS_SERVER_KEY` | No | Google Geocoding and Places on the server; restrict it to those APIs |

### Try it with sample data

Open **Plant AI → Your data** and load a sample plant (dairy, coconut husk to coir, steel re-rolling mill, egg packing, pickle, switchgear, textile dyeing). Each has a planted problem for the AI to find. Your own CSV needs `date` and `units`; `water_m3`, `effluent_m3`, `energy_kwh` and `waste_kg` are optional, and column names are matched by their words. Regenerate the samples with `make samples`.

## Tests

```sh
make test                                                        # backend
cd apps/web && npm run typecheck && npm run lint && npm test    # frontend
```

## Deploy to Google Cloud

The app ships as one container (`Dockerfile`) that serves the website and the API. See [`infrastructure/gcp/DEPLOY.md`](infrastructure/gcp/DEPLOY.md) for the Cloud Run commands, the Google Maps keys, and what to watch before going public.

```sh
docker build -t quantaris . && docker run --rm -p 8080:8080 --env-file .env.local quantaris
```

## Project layout

| Path | What |
| --- | --- |
| `apps/api/agents` | The AI agents: design, existing plant, research, costs, practices, reuse, best location, copilot, inspection, edit, translate |
| `apps/api/ops` | Plant analytics (maintenance, OEE, forecast, emissions) and the water, energy and waste balance |
| `apps/api/domain` | Request and response contracts, strictly bounded |
| `apps/web/components` | The chat app, tabs, and the 3D scene (plant, people, farm, smoke) |
| `docs/product/AI_OPERATIONS.md` | What runs on which data |
| `infrastructure/` | Docker start script and Cloud Run guide |

## Limits today

- Machine, production, quality and demand numbers are **simulated** until a real plant's CSV is loaded.
- Prices are indicative web figures, not quotes. Location ranking is AI judgement, and some places cannot be pinned.
- Photo inspection and photo analysis are judgements from an image, not measurements.
- People, animals and machines in 3D are stylised. Hand control is untested with a real hand.
- Nothing is stored on the server; chats stay in the browser.
- Not built yet: Google login, a database, and a plant-data pipeline.
