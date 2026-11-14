# Intelligent systems in Cosmic Shield

What runs in the product, and how it is kept safe.

## Mission co-pilot (the only AI feature)

- **Where:** the floating button, "Ask co-pilot" on the early-warning card, and "Talk it through" on the Mind page → `POST /api/assistant/chat`.
- **What it does:** answers questions about the crew member's own alerts, vitals, sleep, radiation dose, space weather, mission environment and OSD-575 baselines, through eight read-only tools that return cited sources.
- **Models:** an offline deterministic mock by default (`AI_PROVIDER=mock`, no AI model), Claude (`anthropic`) or a local Ollama model (`ollama`).
- **Safety:** decision support only. A crisis safety check runs before any model; a server-side post-check blocks diagnosis and prescription language and checks every number against the tool results. Full details and limits: [ai-disclosure.md](./ai-disclosure.md).

## Image modules: prototype stubs

| Module | Endpoint | Output |
|--------|----------|--------|
| GI (Bristol) photo | `POST /api/vision/bristol` | Always "Not analysed: prototype", never a type or a status. The crew member chooses the Bristol type; that is what gets logged. |
| Fundus (SANS) photo | `POST /api/vision/sans` | Always "Not analysed: prototype", never a finding, confidence or status. The crew member can flag a photo for ground review (an escalation record for the flight surgeon). |

No image model is connected. Photos are stored privately with metadata removed (owner and flight surgeon only), so a trained model could later be attached behind `classifyBristolPhoto()` / `classifyFundusPhoto()`.

## Rules engine (the source of every status)

Every Normal / Watch / Escalate comes from explicit, unit-tested rules:

- One pure rules file per module (`lib/<module>/rules.ts`) and the `hrv_sleep_decline` pattern (`lib/rules/hrv-sleep-decline.ts`), evaluated on read.
- Thresholds in `data/rules/thresholds.json`, each labelled "sourced" (with its citation) or "app default".
- `lib/alerts/active.ts` collects every active alert for the bell, the dashboard, Crew admin and the co-pilot.
- Escalation records (`escalation` table) carry the reason and the evidence JSON, for the flight surgeon.

See [rules.md](./rules.md).

## Disclaimer

Cosmic Shield is a **prototype** for education and challenge demonstration. It is not cleared for clinical use in space or on Earth.
