# Cosmic Shield

**Cosmic Shield** is astronaut-facing health monitoring and **decision support** software built for the [NASA International Space Apps Challenge 2026](https://www.spaceappschallenge.org/) challenge [*Create Health Monitoring Software for Astronauts on Space Missions*](https://www.spaceappschallenge.org/2026/challenges/create-health-monitoring-software-for-astronauts-on-space-missions/).

Long-duration crews cannot rely on real-time ground support. Cosmic Shield helps astronauts **gather** vitals and mission context, **evaluate** trends against NASA human-research evidence, and **act** with onboard guidance or escalation to a flight surgeon — without claiming to diagnose or prescribe.

---

## Challenge alignment

| Challenge theme | How Cosmic Shield addresses it |
|-----------------|--------------------------------|
| Self-monitoring in space | Dashboard designed for the **astronaut** as primary user |
| Radiation, isolation, altered gravity, closed environment | Radiation dose tracking, stress/sleep, countermeasure compliance |
| Immune, cardiovascular, behavioral risks | Multi-domain vitals + structured check-ins + explainable escalation |
| Gather → evaluate → act | Rule engine produces **Normal / Watch / Escalate** with recommended countermeasures |

---

## Features

- **Mission console** — heart rate, HRV, sleep, blood pressure, SpO₂, radiation, stress, hydration, exercise compliance
- **Trend analysis** — 14-day HR/HRV charts with Inspiration4-derived baseline bands
- **Escalation ladder** — transparent thresholds tied to [NASA HRP](https://humanresearchroadmap.nasa.gov/) risk domains
- **SANS ocular screening** — fundus-style capture workflow (Spaceflight Associated Neuro-ocular Syndrome)
- **GI monitoring** — Bristol stool classification pipeline (Inspiration4 stool data reference)
- **Behavioral check-in** — structured 1–5 affect scale (screening, not diagnosis)
- **Mission co-pilot** — conversational assistant grounded in live crew vitals, escalation state, and radiation summary
- **Offline-ready demo** — NASA reference datasets bundled under `data/nasa/` for reproducible judging

---

## Tech stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Application | **Next.js**, **React**, **TypeScript** | Web UI + API in one codebase |
| Styling | **Tailwind CSS**, **Radix UI** | Accessible mission-control interface |
| State | **Zustand** | Crew selection and live module updates |
| Charts | **Recharts**, SVG sparklines | Vitals trends and baseline visualization |
| Data | **Drizzle ORM**, **SQLite** | Crew vitals, check-ins, escalation audit log |
| Rules | TypeScript + JSON thresholds | Explainable Normal / Watch / Escalate logic |
| Vision APIs | Next.js route handlers | Bristol + SANS classification endpoints (extensible to ONNX) |
| Assistant | Tool-grounded co-pilot API | Reads vitals, escalation, radiation from mission state |
| Testing | **Playwright** | End-to-end dashboard smoke tests |
| Deploy | **Docker Compose** (optional Postgres) | Local / demo hosting |

See [docs/TECH_STACK.md](./docs/TECH_STACK.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detail.

---

## NASA open data usage

Reference data and documentation:

- [OSDR OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) — Inspiration4 metabolic panel baselines (pre- and post-flight only; no in-flight samples)  
- [RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) — measured daily dose for ISS, lunar orbit and the Mars surface; ISS dose equivalent from ALTEA  
- Published dose equivalents where RadLab has none: Mars transit (Zeitlin et al. 2013), Mars surface (Hassler et al. 2014), lunar surface (Zhang et al. 2020)  
- [DONKI](https://api.nasa.gov/) — recent solar flares, SEPs, CMEs and geomagnetic storms  
- [NASA Human Research Program risks](https://humanresearchroadmap.nasa.gov/) — escalation framework  

Full mapping: [docs/nasa-data-sources.md](./docs/nasa-data-sources.md). Submission checklist: [docs/SUBMISSION.md](./docs/SUBMISSION.md).

Demo crew vitals are **simulated**; NASA data drives **thresholds, baselines, and validity** of the decision-support logic.

---

## Quick start

```bash
git clone https://github.com/mahadindotnet/cosmic-shield.git
cd cosmic-shield
npm install
cp .env.example .env      # then set SESSION_SECRET and PIN_PEPPER (see below)
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run db:migrate` applies the SQL migrations in `drizzle/` (generated with `npm run db:generate` after editing `lib/db/schema.ts`). A database created earlier with `drizzle-kit push` is adopted automatically. `npm run db:seed` resets the demo: accounts, 14 days of morning vitals per crew member (source "seed", ending yesterday so today is free for a real entry), and the simulated nights for the early-warning demo.

Open **http://localhost:3000** and sign in with a demo account below.

`SESSION_SECRET` and `PIN_PEPPER` are required; the server refuses to start without them. Generate each with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Login instructions

Cosmic Shield uses an **assigned crew ID and a 6-digit PIN** (no email or password). Go to **/login**, enter the crew ID, then the PIN with the on-screen keypad or your keyboard. The login page also lists these accounts; tap one to fill it in.

| Crew ID | PIN | Name | Role |
|---|---|---|---|
| `CS-001` | `472915` | Cmdr. Elena Reyes | Crew · Commander |
| `CS-002` | `538204` | Dr. Amara Okafor | Crew · Crew Medical Officer (CMO) |
| `CS-003` | `619473` | Lt. Sven Lindqvist | Crew · Systems |
| `CS-004` | `705318` | Spec. Kenji Tanaka | Crew · Payload |
| `FS-001` | `846251` | Dr. Maya Chen (fictional) | Ground flight surgeon (admin) |

These are public demo values. `npm run db:seed` restores them at any time (it also clears the login audit).

**Run `npm run db:seed` before a demo: alerts only use the last 2 nights.** The seed writes 14 nights of simulated HRV (RMSSD) and sleep ending last night; signing in as **CS-003** shows the "Early warning" card (rule `hrv_sleep_decline`, see [docs/rules.md](./docs/rules.md)). Other crew see no card.

- **Crew** see only their own data. **The flight surgeon** opens **Crew admin** from the account menu: pick a crew member to review (escalation, latest readings, check-ins, sign-in activity), assign a new crew ID, reset a PIN (shows a one-time temporary PIN and forces a new PIN at next sign-in), unlock an account, and view the login audit.
- **Wrong crew ID or wrong PIN** both show "Invalid crew ID or PIN". **Five failures lock the account for 5 minutes** (a countdown is shown). Unknown IDs lock the same way, so lockouts don't reveal which IDs exist.
- **Lock** (top bar) or **15 minutes without activity** returns to the PIN screen with your crew ID pre-filled. **Log out** forgets the crew ID. Sessions end after **12 hours** regardless.
- **Change PIN** is in the account menu and needs your current PIN. Weak PINs are refused: one digit repeated (`111111`) or a straight run (`123456`, `654321`).

**How it is secured:** PINs are stored as `bcrypt(HMAC-SHA256(PIN_PEPPER, pin))`, so the database alone can't be brute-forced; **changing `PIN_PEPPER` invalidates every PIN, so re-run `npm run db:seed` afterwards**. The session is a signed (`SESSION_SECRET`), httpOnly, `Secure`, `SameSite=Lax` cookie. `proxy.ts` protects `/dashboard/*` and the data API routes, and every page, Server Action and API route re-checks the user (`requireUser()` / `requireRole("flight_surgeon")`). PINs, hashes and secrets are never logged. For plain-HTTP testing on a LAN IP (e.g. from a phone), set `COOKIE_SECURE=false`; to hide the demo box, set `SHOW_DEMO_ACCOUNTS=false`.

### Production build

```bash
npm run build
npm start
```

### NASA reference data

```bash
npm run data:fetch   # download and cache OSDR, DONKI and RadLab data (needs NASA_API_KEY in .env)
npm run data:build   # build data/nasa/derived/*.json from the cache (no network)
```

The derived files are also committed in `data/nasa/fixtures/`, so the app works offline without running either command. See [docs/nasa-data-sources.md](./docs/nasa-data-sources.md).

### Tests

The e2e tests start their own dev server on port 3100 with a separate database, `data/cosmic-shield.test.db`, which is migrated and seeded fresh before every run (`npm run db:test:prepare`). The demo database is never touched.

```bash
npm test             # Vitest unit tests (data maths, PIN hashing, weak PINs, lockout, sessions)
npm run test:e2e     # Playwright end-to-end tests (use PW_CHANNEL=msedge or chrome to use an installed browser)
```

---

## Project structure

```
app/                 # Pages and API routes
components/          # Dashboard UI
lib/                 # Rules engine, NASA loaders, co-pilot, database
data/nasa/           # Bundled NASA reference JSON (offline demo)
data/rules/          # Escalation thresholds
docs/                # Architecture, NASA data, intelligent systems notes
scripts/seed.ts      # Demo crew seed data
e2e/                 # Playwright tests
```

---

## Safety and scope

Cosmic Shield is **clinical decision support** for demonstration and hackathon evaluation. It does **not** provide medical diagnosis, prescription, or emergency care. Escalation paths are designed to mirror flight-surgeon handoff workflows.

Intelligent features in the product (co-pilot, vision classifiers): [docs/intelligent-systems.md](./docs/intelligent-systems.md).

---

## License

[MIT](./LICENSE) — suitable for NASA Space Apps open-source requirements.

---

## Team / contact

Repository: [github.com/mahadindotnet/cosmic-shield](https://github.com/mahadindotnet/cosmic-shield)
