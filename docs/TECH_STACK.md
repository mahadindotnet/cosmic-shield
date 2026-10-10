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

Static JSON under `data/nasa/`:

- Inspiration4-style baseline bands  
- RadLab sample daily dose curve  
- HRP risk domain index  

Loaded by `lib/nasa/loaders.ts` — no live API dependency during demo.

## Intelligent systems (in-product)

| Feature | Implementation | Role |
|---------|----------------|------|
| Mission co-pilot | `lib/ai/mission-copilot.ts` + `/api/assistant/chat` | Answers questions using tool-read vitals, escalation, radiation |
| Bristol classifier | `/api/vision/bristol` | GI logging; extensible to ONNX |
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
