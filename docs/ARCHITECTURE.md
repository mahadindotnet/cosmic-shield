# Architecture

## Overview

Cosmic Shield is a **single Next.js 16 application** (App Router, React 19, TypeScript): the astronaut dashboard, its Server Actions and a few JSON routes share one codebase and run as one service on a local **SQLite** database (Drizzle ORM). It works offline: NASA reference data is bundled, and the co-pilot's default mode needs no network.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Browser                                                              │
│  Module pages · Health Dashboard · bell · co-pilot panel (useChat)   │
│  Zustand: chosen mission environment, co-pilot panel state           │
└───────────────┬──────────────────────────────────────────────────────┘
                │ Server Actions (log an entry)  ·  GET pages  ·  JSON routes
┌───────────────▼──────────────────────────────────────────────────────┐
│ Next.js                                                              │
│  proxy.ts            signed-cookie check on /dashboard/* and /api/*  │
│  /dashboard/<module> vitals · sleep-stress · radiation · bone · gi · │
│                      eyes · mind · mission · admin (flight surgeon)  │
│  /api/assistant/chat co-pilot (AI SDK tool loop + post-check)        │
│  /api/crew, /api/crew/[id]   accounts; one crew member's snapshot    │
│  /api/photos/{gi,eye}/[id]   private photos (owner / flight surgeon) │
│  /api/vision/{bristol,sans}  prototype stubs: "Not analysed"         │
└───────┬───────────────────────┬──────────────────────┬───────────────┘
        │                       │                      │
┌───────▼────────┐   ┌──────────▼─────────┐   ┌────────▼──────────────┐
│ lib/<module>/  │   │ SQLite (Drizzle)   │   │ data/                 │
│ schema, rules, │◀─▶│ typed entry tables │   │ rules/thresholds.json │
│ summary, data, │   │ escalation, users, │   │ nasa/derived|fixtures │
│ actions, seed  │   │ notification_read  │   │ (OSD-575, RadLab,     │
└───────┬────────┘   └────────────────────┘   │  DONKI)               │
        │                                     └───────────────────────┘
┌───────▼──────────────────────────────────────────────────────────────┐
│ lib/alerts/active.ts: every active Watch / Escalate for one crew     │
│ member. The single source for the bell, the dashboard Alerts card,   │
│ Crew admin, /api/crew/[id] and the co-pilot's get_active_alerts.     │
└──────────────────────────────────────────────────────────────────────┘
```

## Data flow: gather → evaluate → act

1. **Gather.** The crew member logs an entry on a module page. A Server Action (`lib/<module>/actions.ts`) re-checks the session, validates with Zod (`lib/<module>/schema.ts`) and writes one row to that module's table. Photos go through `lib/uploads/photos.ts` first. The flight surgeon is view-only.
2. **Evaluate.** Rules run **on read**, never stored as a status: `lib/<module>/rules.ts` are pure functions over the crew member's own rows, with every threshold in `data/rules/thresholds.json` labelled "sourced" (with its citation) or "app default" ([rules.md](./rules.md)). `lib/<module>/summary.ts` turns rows plus rules into what the page shows: status cards, 14-day trends, history and the dashboard tile.
3. **Act.** `lib/alerts/active.ts` collects every active Watch / Escalate. The page shows the reason and non-diagnostic next steps; the bell and the dashboard list it; the co-pilot explains it with cited tools. Some events also write an **escalation record** (`escalation` table) for the flight surgeon: vitals Escalate, career dose Escalate, the crisis safety check (`mind_safety`), eyes changes on 2 Amsler tests in a row (`eye_amsler_repeat`) and a fundus photo flagged for ground review (`eye_ground_review`). The flight surgeon reviews them on **Crew admin**.

## Modules

| Module | Page | Table | Rules (all in rules.md) |
|---|---|---|---|
| Vitals | `/dashboard/vitals` | `vitals_entry` | Watch bands (app default); Escalate for SpO₂ < 90 % (WHO), glucose < 54 mg/dL (ADA), BP > 180/120 (AHA) |
| Sleep & Stress | `/dashboard/sleep-stress` | `sleep_entry` | Per-night Watch; `hrv_sleep_decline` early warning against the crew member's own 14-night baseline |
| Radiation | `/dashboard/radiation` | `dose_entry` | Daily Watch (2 × the environment's dose, app default); career total against the 600 mSv NASA-STD-3001 limit |
| Bone protection | `/dashboard/bone` | `countermeasure_entry` | `bone_exercise`: under 50 % of the weekly exercise target (ISS target sourced from NASA) |
| GI | `/dashboard/gi` | `gi_entry` | `gi_hard` / `gi_loose`: 3-day Bristol patterns (types per Lewis & Heaton 1997) |
| Eyes | `/dashboard/eyes` | `eye_screening` | `eye_amsler`: any marked square or centre dot not seen; repeat → flight surgeon |
| Mind | `/dashboard/mind` | `checkin` | `mind_pattern`: low mood or high stress 3 days running; crisis safety check on notes and chats |
| Mission | `/dashboard/mission` | `users.environment` | ISS, Lunar surface, Mars transit or Mars surface: dose, comms delay, gravity, targets |

Gamification (`lib/gamification`) computes points and the check-in streak from the same tables, once per activity per UTC day. It never changes a health status.

## Private photos

GI stool photos and fundus photos (`lib/uploads/photos.ts`): JPEG, PNG or WebP recognised by their first bytes, at most 5 MB, decoded and re-encoded with sharp so **all metadata (EXIF incl. GPS) is removed**, stored under `uploads/<kind>/<userId>/<random>` (gitignored). They are served only by `/api/photos/gi/[id]` and `/api/photos/eye/[id]`, to the owner or the flight surgeon; anyone else gets 404. The image "classifiers" are **prototype stubs** that always return "Not analysed: prototype".

## Access control

- `proxy.ts`: optimistic check of the signed session cookie on `/dashboard/*`, `/change-pin` and `/api/*`.
- Every page, Server Action and route re-reads the user from the database (`lib/auth/dal.ts`): crew act on their own data only; the flight surgeon (role `flight_surgeon`) can view every crew member but enter nothing.
- Escalation evidence (message excerpts, photo links) is readable only by the flight surgeon (`escalationsForReview`). The flight surgeon sees check-in scores, never notes.

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

- **Alerts card:** every active Watch/Escalate across modules (vitals, sleep/HRV, radiation, bone, GI, eyes, mind), Escalate first, each linking to its module (the first few are shown; the bell lists all); "All clear" when there are none. Built by `dashboardAlertSummary()` (`lib/alerts/summary.ts`) from `activeAlertsFor()` (`lib/alerts/active.ts`), the single source also used by the bell and the co-pilot. An open `mind_safety` escalation appears to the crew member only as "Support follow-up open" (no reason, no excerpt). The flight surgeon gets a pointer to Crew admin.
- **No fake numbers:** module tiles show a real reading and its status, or "No entries yet: log your first reading" (e.g. Eyes until the first test), "Loading…" while data streams in, or "Crew data is in Crew admin" for the flight surgeon. The streak panel's points, current and best streak, exercise days and month calendar all come from real entries (`lib/gamification`, see rules.md).

### Stale sessions

A session cookie is signed, so after a reseed (or when an account is deleted) it can still look valid while its user is gone. `getCurrentUser()` treats such a session as signed out: no user with that id and crew ID, or a session issued before the account was created (a reseed re-creates accounts, even if an id is reused). `requireUser()` and the account bar (on every dashboard page) then redirect to `/auth/reset`, which clears the session and remembered-crew-ID cookies and sends the browser to `/login?stale=1`. That page explains why and clears cached client state (the saved environment copy in localStorage). Tested in `e2e/stale-session.spec.ts` (deleted user; account re-created after the session).

## Crew admin (flight surgeon)

`/dashboard/admin`: pick a crew member to see their account state, the latest reading of every module with its status and the active alerts (`lib/crew/snapshot.ts`, built from the module summaries and `activeAlertsFor()`; nothing simulated), check-in scores, every escalation record with its evidence, and sign-in activity. The same snapshot is returned by `GET /api/crew/[id]` (crew: their own only). Account tools: assign a crew ID, reset a PIN, unlock, login audit.

## Demo data

`npm run db:seed` (also run by `npm run setup`) resets the demo: five accounts (four fictional crew and a fictional flight surgeon) and 14 days of **simulated** entries per crew member, ending yesterday, marked "Demo seed" in every history table: vitals, sleep/HRV/stress nights, dosimeter readings (based on the measured ISS ALTEA dose) plus a previous-missions career summary, daily check-ins, bone logs and GI entries. No eye screenings and no photos are seeded. CS-003's last three nights show the HRV and sleep decline, so the early-warning card appears for CS-003. No mission environment is set: each crew member picks one after logging in.

## Extensibility

- Switch the co-pilot's model with `AI_PROVIDER` (mock, anthropic, ollama); add another AI SDK provider in `lib/ai/provider.ts` without touching the tools or the post-check.
- Attach a trained image model behind `classifyBristolPhoto()` / `classifyFundusPhoto()`; photos are already stored privately with metadata removed.
- Change a threshold in `data/rules/thresholds.json` (with its basis) without touching code.
