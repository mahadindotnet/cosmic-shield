# Architecture

## Overview

Cosmic Shield is a **monolithic Next.js application**: the astronaut dashboard and JSON APIs share one codebase and deploy as a single service.

```
┌─────────────────────────────────────────────────────────┐
│  Browser (astronaut dashboard)                          │
│  Zustand state · Recharts · module interactions         │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────┐
│  Next.js App Router                                     │
│  /dashboard          UI                                 │
│  /api/crew/[id]      Crew vitals + escalation payload   │
│  /api/assistant/chat Co-pilot (tool-grounded)           │
│  /api/vision/*       Bristol + SANS classifiers       │
│  /api/check-in       Behavioral log persistence         │
└───────────┬─────────────────────┬───────────────────────┘
            │                     │
   ┌────────▼────────┐   ┌────────▼────────┐
   │ Rules engine    │   │ Drizzle + SQLite │
   │ + NASA JSON     │   │ check-ins, audit │
   └─────────────────┘   └──────────────────┘
```

## Data flow: gather → evaluate → act

1. **Gather** — Vitals tiles, sleep/stress, radiation curve, module inputs (SANS, Bristol, check-in, hydration).
2. **Evaluate** — `evaluateEscalation()` compares live values and trends to `data/rules/thresholds.json` and NASA-informed baselines.
3. **Act** — UI shows Watch/Escalate banner, recommended countermeasures, and co-pilot explanations; Escalate tier implies flight surgeon handoff with evidence JSON attached in the model.

## Crew demo scenarios

Four seeded crew profiles (`lib/demo/crew-profiles.ts`):

- **Reyes** — Cardiovascular drift + radiation watch patterns  
- **Okafor** — Sleep debt + elevated stress watch  
- **Lindqvist** — Nominal baseline  
- **Tanaka** — GI log (Bristol type 6) without full escalation — demonstrates ladder discrimination  

## Extensibility

- Swap SQLite for Postgres by changing Drizzle driver and `DATABASE_URL`.
- Replace co-pilot backend with an external LLM while keeping the same tool interface (`lib/ai/tools.ts`).
- Deploy vision routes with ONNX Runtime in a sidecar when models are trained.
