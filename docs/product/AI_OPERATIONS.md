# AI operations layer

How QuantarisAI turns operational data into insights, recommendations and actions (the hackathon problem statement). Everything is labelled with where its numbers come from.

## What runs, and on what data

| Capability | Endpoint | Data it uses | Method |
|---|---|---|---|
| Predictive maintenance, production (OEE, bottleneck, what-if), quality drift, demand forecast, supply risk, smoke and effluent with and without AI | `POST /api/ops` | **Simulated** plant data, seeded by the plant design | Ordinary statistics: least-squares trend, z-score, time-to-limit, back-tested trend-plus-season forecast. No model call. |
| Water, energy, waste balance, best-quartile gap, unusual days, reuse/leak/recovery levers | `POST /api/balance` | **The owner's own daily CSV** (or a bundled sample) | Arithmetic only |
| Operations copilot | `POST /api/ops-brief` | The computed numbers above, written out as facts | Gemini quotes only those facts; output is bounded and checked |
| Visual quality inspection | `POST /api/inspect` | One uploaded product photo | Gemini vision; a verdict with a listed defect is never "pass" |

## Sample data
`apps/api/ops/sample_data.py` generates three made-up plants (dairy, switchgear, textile dyeing), each with a planted problem (stuck valve, scrap rise after a tool change, long night rinse cycles). Regenerate with `python3 -m apps.api.ops.sample_data`; files land in `apps/web/public/samples/`.

## Honest limits
- The Plant AI tab's machine, production, quality, demand, smoke and effluent numbers are simulated. Real savings are unknown until a real plant's data is loaded.
- CSV only (no Excel yet). Column names are matched by their words, litres are converted to m³.
- Inspection is a judgement from one photo and is not measured for accuracy.
- Google Cloud backbone (BigQuery, Pub/Sub, Dataflow, Vertex AI, Cloud Storage, Cloud Run) is **not used yet**; `.env.example` lists placeholder names only.
