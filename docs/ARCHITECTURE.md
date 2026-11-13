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
│  /api/assistant/chat AI co-pilot (AI SDK tool loop)     │
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

## AI co-pilot (agent)

How a question becomes an answer (`app/api/assistant/chat/route.ts`, `lib/ai/`):

```
Chat panel (useChat)                POST /api/assistant/chat
  question ───────────────────────▶ 1. Auth (proxy.ts + getApiUser). Scope: crew → themselves;
                                       flight surgeon → crew selected on Crew admin (?crew=), or none.
                                    2. Model from AI_PROVIDER: mock (default, offline) | anthropic | ollama
                                    3. generateText({ instructions, messages, tools, stopWhen: 6 steps })
                                         ↻ model asks for tools → tools run on the server, read-only,
                                           only for the scoped crew member → results { data, source }
  tool chips  ◀── after each step ─────  (onStepEnd streams tool-input/output chunks)
                                    4. Post-check: block diagnosis/prescription, check every number
                                       against tool results, add the comms delay to ground contact
  answer      ◀── checked text ────  5. Stream the checked answer + mode metadata
```

- **Tools** (`lib/ai/tools.ts` → `lib/ai/copilot-data.ts`): `get_latest_vitals`, `get_sleep_history`, `get_radiation_status`, `get_space_weather`, `get_environment`, `get_active_alerts`, `get_reference_baseline`, `get_guidance`. They call the same data and rules code as the module pages, so the co-pilot can't disagree with the dashboard. None takes a crew ID.
- **Mock mode** (`lib/ai/mock-model.ts`, `lib/ai/intents.ts`): a real AI SDK `LanguageModelV4`. Step 1 matches the question to an intent and returns tool calls; the AI SDK runs the real tools; later steps read the results from the prompt and return follow-up calls or a filled template. So mock, Claude and Ollama share the same loop, tools, step limit and post-check.
- **Safety and disclosure:** [ai-disclosure.md](./ai-disclosure.md).

## Navigation, onboarding and notifications

- **Environment dialog** (`components/mission/environment-dialog.tsx`): crew with no mission environment see "Choose your mission environment" after login. Confirm saves it to the account (same Server Action as the top-bar picker). "Choose later" or Esc hides it for that login session only: the dismissal is stored per session in `notification_read` (key `env-prompt-later:<session issuedAt>`), so it shows again at the next login, and concurrent sessions don't affect each other. Never shown to the flight surgeon.
- **Back button** (`components/cosmic-shield/back-button.tsx`): on every page except the Health Dashboard home and `/login`. A small tracker records client-side page changes in this tab; with in-app history Back goes back, otherwise (a page opened from a link or a fresh tab) it goes to the Health Dashboard.
- **Notification bell** (`lib/notifications/`): items are computed on each request and never stored: daily check-in due, morning vitals not logged, every active Watch/Escalate (from `lib/alerts/active.ts`, the same source as the co-pilot), and a DONKI event from the last 24 h. The flight surgeon instead sees new escalations for crew (no excerpts). Only read state is stored (`notification_read`, per user); read items stay visible, greyed. Done tasks disappear by themselves, and module saves refresh the layout so the badge updates at once. The bell never waits on NASA: it uses the last live DONKI result while fresh (15 min) or the cached file, refreshing in the background. In-app only, no browser push.

### Health Dashboard summary

- **Alerts card:** every active Watch/Escalate across modules (vitals, sleep/HRV, radiation, `mind_pattern`), Escalate first, each linking to its module; "All clear" when there are none. Built by `dashboardAlertSummary()` (`lib/alerts/summary.ts`) from `activeAlertsFor()` (`lib/alerts/active.ts`), the single source also used by the bell and the co-pilot. An open `mind_safety` escalation appears to the crew member only as "Support follow-up open" (no reason, no excerpt). The flight surgeon gets a pointer to Crew admin.
- **No fake numbers:** module tiles show a real reading and its status, or "No entries yet: log your first reading" (Bone, Eyes, GI until built), "Loading…" while data streams in, or "Crew data is in Crew admin" for the flight surgeon. The streak panel's points, current and best streak, exercise days and month calendar all come from real entries (`lib/gamification`, see rules.md).

## Crew demo scenarios

Four seeded crew profiles (`lib/demo/crew-profiles.ts`):

- **Reyes** — Cardiovascular drift + radiation watch patterns  
- **Okafor** — Sleep debt + elevated stress watch  
- **Lindqvist** — Nominal baseline  
- **Tanaka** — GI log (Bristol type 6) without full escalation — demonstrates ladder discrimination  

## Extensibility

- Swap SQLite for Postgres by changing Drizzle driver and `DATABASE_URL`.
- Switch the co-pilot's model with `AI_PROVIDER` (mock, anthropic, ollama); add another AI SDK provider in `lib/ai/provider.ts` without touching the tools or the post-check.
- Deploy vision routes with ONNX Runtime in a sidecar when models are trained.
