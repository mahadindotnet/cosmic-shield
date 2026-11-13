# Technology stack

This document describes **what we use** and **why**, for judges and contributors.

## Frontend

- **Next.js 16 (App Router)** — Server and client rendering, API routes, production builds.
- **React 19 + TypeScript** — Typed UI components and shared domain models.
- **Tailwind CSS 4** — Dark “mission instrument” theme, responsive layout.
- **Radix UI primitives** — Accessible dialogs, scroll areas, buttons (shadcn-style patterns).
- **Zustand** — Selected crew member, module state, client-side escalation refresh.
- **Recharts** — 14-day HR/HRV trend chart with baseline reference band.
- **Lucide React** — Consistent line icons for vitals modules.

## Backend (same Next.js app)

- **Route handlers** under `app/api/` — REST JSON for crew payloads, escalation, co-pilot chat, vision classifiers, check-ins.
- **Rules engine** (`lib/rules/engine.ts`) — Pure TypeScript evaluation of vitals + trends + module inputs → Normal / Watch / Escalate.
- **Threshold config** (`data/rules/thresholds.json`) — Adjustable limits without code changes.

## Data layer

- **Drizzle ORM** — Schema migrations and type-safe queries.
- **SQLite** (default) — Single-file database for offline hackathon demos (`data/cosmic-shield.db`, gitignored).
- **better-sqlite3** — Embedded database driver for Node.js.
- **Seed script** (`npm run db:seed`) — Loads four demo crew profiles with representative Watch scenarios.

Optional **PostgreSQL 16** via `docker-compose.yml` for deployment experiments (see README).

## NASA reference data

Derived JSON under `data/nasa/derived/`, with committed copies in `data/nasa/fixtures/` (built by `npm run data:build`):

- Inspiration4 metabolic panel baselines (OSDR OSD-575)
- Daily dose per mission environment (OSDR RadLab, plus published values)
- Recent space weather (DONKI)
- HRP risk domain index (`data/nasa/hrp-risks.json`)

Loaded by `lib/nasa/loaders.ts` (derived, then fixtures). Space weather can also be fetched live, and falls back to the cache, so the demo works offline. See docs/nasa-data-sources.md.

## Intelligent systems (in-product)

| Feature | Implementation | Role |
|---------|----------------|------|
| Mission co-pilot | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) + `lib/ai/` + `/api/assistant/chat` | Tool-calling agent over eight read-only tools; offline mock by default, Claude or Ollama via `AI_PROVIDER` (see docs/ai-disclosure.md) |
| Bristol classifier | `/api/vision/bristol` | Prototype stub ("Not analysed: prototype"); the crew member confirms the type |
| Photo handling | `sharp` + `lib/uploads/photos.ts` | Type check by signature, 5 MB limit, metadata removed, private storage under `uploads/` |
| SANS screening | `/api/vision/sans` | Ocular risk workflow; extensible to ONNX |

Details: [intelligent-systems.md](./intelligent-systems.md).

## Quality and DevOps

- **ESLint** (Next.js config) — Linting.
- **Prettier** — Formatting (optional).
- **Playwright** — E2E test: crew switch updates escalation badge.
- **MIT License** — Open-source submission.

## What we deliberately avoided for the hackathon MVP

- Microservices — single deployable app for judge reproducibility.
- Live NASA API calls at demo time — bundled references for offline venues.
- Opaque ML black boxes — rule engine is inspectable; vision endpoints return structured JSON for audit.
