# Technology stack

What we use and why, for judges and contributors. Versions are in `package.json` and [REFERENCES.md](./REFERENCES.md).

## Frontend

- **Next.js 16 (App Router, Cache Components)** and **React 19 + TypeScript**: pages stream their data into Suspense boundaries; entries are saved with Server Actions.
- **Tailwind CSS 4**, **Radix UI / Base UI** primitives (shadcn-style components), **Lucide** icons: the dark "mission instrument" theme, accessible dialogs and menus.
- **Recharts**: 14-day trend charts with reference bands; mini charts on the Health Dashboard.
- **Zustand**: client state for the chosen mission environment and the co-pilot panel.

## Backend (same Next.js app)

- **Server Actions** (`lib/<module>/actions.ts`): validate with **Zod**, re-check the session and role, write one row.
- **Route handlers** (`app/api/`): co-pilot chat, crew snapshot (`/api/crew/[id]`), private photos, prototype image stubs, session ping.
- **Rules**: pure TypeScript per module (`lib/<module>/rules.ts`) with thresholds in `data/rules/thresholds.json`; `lib/alerts/active.ts` is the single list of active alerts.
- **Auth**: crew ID + 6-digit PIN (`bcrypt` over an HMAC pepper), signed session cookie (`jose`), `proxy.ts` plus server-side checks.
- **Photos**: `sharp` re-encodes uploads without metadata (`lib/uploads/photos.ts`).

## Data layer

- **SQLite** via **better-sqlite3** and **Drizzle ORM**, single file `data/cosmic-shield.db` (gitignored). SQL migrations in `drizzle/` (`npm run db:migrate`).
- `npm run setup` creates `.env` (random secrets), migrates and seeds; `npm run db:seed` resets the demo (fictional accounts, 14 days of simulated entries).

## NASA reference data

Derived JSON under `data/nasa/derived/`, with committed copies in `data/nasa/fixtures/` (built by `npm run data:build`): Inspiration4 metabolic panel (OSDR OSD-575), daily dose per mission environment (OSDR RadLab plus published values) and recent space weather (DONKI, also fetched live when `NASA_API_KEY` is set, with a cache fallback). See [nasa-data-sources.md](./nasa-data-sources.md).

## Intelligent systems

| Feature | Implementation | Role |
|---------|----------------|------|
| Mission co-pilot | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) + `lib/ai/` | Tool-calling agent over eight read-only tools; offline mock by default, Claude or Ollama via `AI_PROVIDER` ([ai-disclosure.md](./ai-disclosure.md)) |
| GI and fundus image "classifiers" | `/api/vision/bristol`, `/api/vision/sans` | Prototype stubs: always "Not analysed: prototype" |

## Quality

- **Vitest** unit tests (rules, summaries, schemas, photo handling, auth, co-pilot, migrations).
- **Playwright** end-to-end tests on a separate test server and database (every module end to end, access control, the co-pilot in mock mode).
- **ESLint** and TypeScript strict mode.

## What we deliberately avoided

- Microservices: one deployable app, so judges can run it with three commands.
- Depending on live APIs at demo time: NASA data is bundled; the co-pilot runs offline by default.
- Opaque models deciding health status: every status comes from inspectable rules; image analysis is not claimed.
