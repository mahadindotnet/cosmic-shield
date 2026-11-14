# Cosmic Shield

**Cosmic Shield** is astronaut-facing health monitoring and **decision support** software, built for the [NASA International Space Apps Challenge 2026](https://www.spaceappschallenge.org/) challenge [*Create Health Monitoring Software for Astronauts on Space Missions*](https://www.spaceappschallenge.org/2026/challenges/create-health-monitoring-software-for-astronauts-on-space-missions/).

Long-duration crews can't count on real-time help from the ground. Cosmic Shield lets an astronaut **gather** their own health data in a few taps, **evaluates** it with transparent rules (every threshold labelled with its source, or as an app default), and helps them **act**: simple next steps, the comms delay to the ground, and an escalation record for the flight surgeon when it matters. It never diagnoses or prescribes.

It runs entirely on one laptop, offline: a Next.js app with a local SQLite database, bundled NASA reference data and an offline co-pilot.

---

## Features

Every module stores real entries, shows status cards, a 14-day trend and a history, feeds a tile on the Health Dashboard, and raises alerts through one shared source (`lib/alerts/active.ts`) used by the bell, the dashboard, Crew admin and the co-pilot. Statuses are **Normal / Watch / Escalate**; thresholds and their sources are in [docs/rules.md](./docs/rules.md).

| Module | What you log | What it checks |
|---|---|---|
| **Vitals** | Heart rate, blood pressure, SpO₂, glucose (optional) | Watch bands (app default). **Escalate** for SpO₂ < 90 % (WHO), glucose < 54 mg/dL (ADA), BP > 180/120 (AHA), with "rest and re-measure" guidance and a record for the flight surgeon. Glucose shows the Inspiration4 crew pre-flight range (NASA OSDR OSD-575). |
| **Sleep & Stress** | Sleep hours and quality, HRV (RMSSD), stress 1–5 | Per-night Watch; an **early warning** when HRV drops below your own 14-night baseline for 3 nights while sleep is short (`hrv_sleep_decline`). |
| **Radiation** | Dosimeter readings | Daily Watch (2 × your environment's typical dose); career total against NASA-STD-3001's **600 mSv** limit, with the projected dose for your mission; live NASA DONKI solar storm alerts. |
| **Bone protection** | Aerobic and resistance minutes, load × reps, calcium, vitamin D | Watch when exercise over 7 days is below half the weekly target. ISS target 120 min/day, calcium 1000 mg, vitamin D 1000 IU (all NASA-sourced). |
| **GI** | Bristol type 1–7 (with the standard description and a picture of each type), fluids, note, optional photo | Watch on 3-day patterns (types 1–2 or 6–7 on 2 of the last 3 days) with simple advice. **Photo: prototype**, stored privately and **not analysed** ("Not analysed: prototype"); your chosen type is what gets logged. |
| **Eyes** | Amsler grid self-test (mark the squares that look wrong, per eye), optional fundus photo | Watch on any change ("repeat the test tomorrow and tell your CMO"); changes on 2 tests in a row also tell the flight surgeon. **Fundus photo: prototype**, **not analysed**; "Flag for ground review" sends it to the flight surgeon. |
| **Mind** | Daily check-in: mood, stress, sleep quality (1–5), private note | Watch after 3 hard days in a row; a supportive "talk it through" conversation; a crisis safety check on every note and chat message. |
| **Mission** | Your mission environment: ISS, Lunar surface, Mars transit or Mars surface | Sets the typical dose and Watch level, exercise target, comms delay to the ground, gravity and eye-screening cadence. |

Also:

- **Health Dashboard:** body map, module tiles, alerts summary, trends, space weather, points and check-in streak (computed from real entries; motivation only).
- **Mission co-pilot:** a chat panel that answers questions about *your own* data through eight read-only, cited tools. Offline by default. See [AI use and safety limits](#ai-use-and-safety-limits).
- **Notification bell:** daily check-in due, vitals not logged, every active alert, recent solar activity. In-app only.
- **Flight surgeon (Crew admin):** every crew member's latest readings, active alerts, check-in scores (never the notes), escalation records with evidence and photos, sign-in activity; reset PINs, unlock accounts, reassign crew IDs. View-only for health data.
- **Private photos:** JPEG/PNG/WebP up to 5 MB, location and camera data (EXIF) removed, visible only to the owner and the flight surgeon.

---

## Quick start

Requires **Node.js 20.9 or newer**.

```bash
git clone https://github.com/mahadindotnet/cosmic-shield.git
cd cosmic-shield
npm install
npm run setup     # creates .env with random secrets, builds the database, loads the demo data
npm run dev
```

Open **http://localhost:3000** and sign in with a demo account below.

**After logging in, pick a mission environment** (ISS, Lunar surface, Mars transit or Mars surface) in the dialog that appears, or later in the top bar. The demo sets none on purpose: environment-specific targets, the projected dose, comms delays and guidance appear once you choose.

`npm run setup` is safe to run again: it keeps an existing `.env` and only re-creates the database contents. To reset the demo data at any time, run `npm run db:seed`. **Re-seed before a demo**: the seeded data ends yesterday, and the early-warning card only looks at the last 2 nights.

Optional settings in `.env` (see `.env.example`): `AI_PROVIDER` (`mock`, `anthropic`, `ollama`), `NASA_API_KEY` (live DONKI space weather), `COOKIE_SECURE=false` (plain HTTP on a LAN IP), `SHOW_DEMO_ACCOUNTS=false`.

### Demo accounts

Sign in with an **assigned crew ID and a 6-digit PIN** (no email or password). The login page lists these accounts; tap one to fill it in. All people are fictional.

| Crew ID | PIN | Name | Role |
|---|---|---|---|
| `CS-001` | `472915` | Cmdr. Elena Reyes | Crew · Commander |
| `CS-002` | `538204` | Dr. Amara Okafor | Crew · Crew Medical Officer (CMO) |
| `CS-003` | `619473` | Lt. Sven Lindqvist | Crew · Systems (shows the early-warning card) |
| `CS-004` | `705318` | Spec. Kenji Tanaka | Crew · Payload |
| `FS-001` | `846251` | Dr. Maya Chen | Ground flight surgeon (Crew admin) |

Each crew account has 14 days of **simulated** history (marked "Demo seed"). No eye screenings or photos are seeded.

**Security, briefly:** PINs are stored as `bcrypt(HMAC-SHA256(PIN_PEPPER, pin))`; five wrong attempts lock an account for 5 minutes; the session is a signed, httpOnly cookie that locks after 15 minutes idle and ends after 12 hours; every page, action and API route re-checks the user and role on the server. PINs, hashes and secrets are never logged. Changing `PIN_PEPPER` invalidates every PIN (re-run `npm run db:seed`).

### Production build

```bash
npm run build
npm start
```

---

## Running the tests

```bash
npm test             # Vitest unit tests: rules, summaries, schemas, photo handling, auth, co-pilot, migrations
npm run lint         # ESLint
npx tsc --noEmit     # type check
npm run test:e2e     # Playwright end-to-end tests
```

The end-to-end tests start their own dev server on port 3100 with a separate database (`data/cosmic-shield.test.db`) and photo folder (`uploads-test/`), migrated and seeded fresh before every run, so your demo data is never touched. They cover every module end to end, access control (crew can't see each other's data or photos), the flight surgeon's view and the co-pilot in offline mode. First run: `npx playwright install chromium`, or use an installed browser with `PW_CHANNEL=msedge` (or `chrome`).

---

## NASA data used

| Source | Used for |
|---|---|
| [NASA OSDR OSD-575](https://osdr.nasa.gov/osdr/data/osd/files/575): Inspiration4 metabolic panel | Glucose "Inspiration4 crew reference (n=4)" band on Vitals; pre-flight baselines in the co-pilot |
| [NASA OSDR RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/): ISS ALTEA-Survey and DOSIS, LRO CRaTER, Curiosity MSL-RAD | Typical daily dose per mission environment (plus published values for Mars transit, Mars surface and the lunar surface) |
| [NASA DONKI](https://api.nasa.gov/) | Recent solar flares, particle events, CMEs and geomagnetic storms (live with `NASA_API_KEY`, cached otherwise) |
| NASA-STD-3001 Volume 1 | 600 mSv career dose limit |
| [NASA Human Research Roadmap](https://humanresearchroadmap.nasa.gov/) | Why sleep ([sleep risk](https://humanresearchroadmap.nasa.gov/Risks/?i=100)) and eyes ([SANS risk](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105)) are monitored |
| NASA ["Astronaut Exercise"](https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/) and *Human Adaptation to Spaceflight: The Role of Food and Nutrition* (NASA 2021) | ISS exercise target (about two hours a day); calcium and vitamin D targets |
| NASA Moon and Mars Fact Sheets | Gravity, comms delay and day length per environment |

The derived NASA files are committed (`data/nasa/fixtures/`), so the app works offline. To refresh them: `npm run data:fetch` (needs `NASA_API_KEY`) then `npm run data:build`. Details: [docs/nasa-data-sources.md](./docs/nasa-data-sources.md). Every source, paper, dataset and library: [docs/REFERENCES.md](./docs/REFERENCES.md).

The demo crew's health data is **simulated**. NASA data provides the reference values, limits and context.

---

## AI use and safety limits

- **One AI feature: the mission co-pilot.** It answers from the crew member's own logged data through eight read-only tools, each returning a cited source. It can't change anything.
- **Offline by default** (`AI_PROVIDER=mock`): a deterministic mode with **no AI model** that calls the same tools and fills fixed templates. Optional: Claude (`anthropic`, needs `ANTHROPIC_API_KEY`; the question and tool results are then sent to Anthropic) or a local Ollama model.
- **Statuses never come from AI.** Every Normal / Watch / Escalate comes from deterministic, unit-tested rules; the co-pilot only explains them.
- **Server-side post-check** on every answer: diagnosis and prescription language is blocked and replaced with a safe reply; every number must match a tool result; contact advice includes the comms delay.
- **Crisis safety check** before any model, on every chat message and check-in note: a caring response, the CMO line, and an escalation record for the flight surgeon. It is simple phrase matching, **not a clinical tool**, and can miss or misread messages.
- **Image analysis is a prototype**: the GI and fundus "classifiers" are stubs that always return "Not analysed: prototype". Photos are never sent to any model.
- **Decision support only.** Cosmic Shield doesn't diagnose, prescribe or replace the Crew Medical Officer or the flight surgeon, and it is not cleared for clinical use.

Full disclosure and limits: [docs/ai-disclosure.md](./docs/ai-disclosure.md). How the rest fits together: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/intelligent-systems.md](./docs/intelligent-systems.md), [docs/TECH_STACK.md](./docs/TECH_STACK.md).

---

## Project structure

```
app/                 Pages (dashboard modules, Crew admin, login) and API routes
components/          UI components and module views
lib/<module>/        rules, schema, summary, data, actions and seed data per module
lib/alerts/          the single list of active alerts
lib/ai/              co-pilot: tools, providers, mock model, safety and post-checks
lib/uploads/         private photo handling
data/rules/          thresholds.json, every value with its basis and source
data/nasa/           bundled NASA reference data (derived + committed fixtures)
drizzle/             SQL migrations
scripts/             setup, migrate, seed, NASA data fetch and build
docs/                architecture, rules, NASA data, AI disclosure, references
e2e/                 Playwright tests
```

---

## Image credits

- ISS in orbit, the ISS background, `public/backgrounds/iss-orbit.webp`: Photo by NASA on Unsplash, https://unsplash.com/photos/international-space-station-orbits-earth-wAkLQnT2TC0
- Astronaut on the lunar surface, the Lunar surface background, `public/backgrounds/lunar-surface-eva.webp`, with the mission patch on the suit blurred out: Photo by History in HD on Unsplash, https://unsplash.com/photos/buzz-aldrin-walking-on-the-moon-e5eDHbmHprg
- Mars from space, the Mars transit background, `public/backgrounds/mars-planet.webp`: Photo by javier Miranda on Unsplash, https://unsplash.com/photos/a-red-planet-with-a-star-in-the-background-lH1VONHniMo
- Martian cliffs, the Mars surface background, `public/backgrounds/mars-cliff.webp`: Photo by Nicolas Lobos on Unsplash, https://unsplash.com/photos/person-walking-near-brown-rock-kGtFjYdm7DI
- Anatomical body figure, the Health Dashboard body map, `public/organs/anatomy.webp`: Photo by Rohit Choudhari on Unsplash, https://unsplash.com/photos/x-ray-of-a-human-skeleton-against-black-background-ygO4wgzG0zQ
- Anatomical heart (AI-generated), the Vitals page, `public/organs/heart.webp`: Photo by Mohammad-Ben-Ammar on Pixabay, https://pixabay.com/illustrations/ai-generated-heart-anatomical-8771275/
- Human skeleton, the Bone protection page, `public/organs/bone.webp`: Photo by divotomezove on Pixabay, https://pixabay.com/illustrations/human-skeleton-skeletons-anatomy-5500722/
- Human eye, the Eyes page, `public/organs/eye.webp`: Photo by 95C on Pixabay, https://pixabay.com/illustrations/eye-iris-globe-vision-vista-1882171/
- Digestive system (AI-generated), the GI page, `public/organs/gi.webp`: Photo by Phylum on Pixabay, https://pixabay.com/illustrations/ai-generated-intestine-digestive-8424512/
- Brain, the Mind page, `public/organs/mind.webp`: Photo by Milad Fakurian on Unsplash, https://unsplash.com/photos/iridescent-brain-render-on-blue-purple-background-58Z17lnVS4U

The two images marked (AI-generated) are AI-generated illustrations; the app shows a visible “AI-generated image” label on them wherever they appear (Vitals and GI pages).

The images were converted to WebP (and cropped, keyed to a transparent background or recoloured). Everything else visual (logo, holograms, Bristol pictograms, Amsler grid, charts) is drawn in code. No NASA logo (the insignia or the logotype) and no mission emblem appears in the app or the repository: the Apollo 11 mission patch on the lunar photo's suit is blurred out. NASA is named only as a data source.

Photos are used under the [Unsplash License](https://unsplash.com/license) and the [Pixabay Content License](https://pixabay.com/service/license-summary/), and are not covered by this repository's MIT licence.

---

## Licence

Code: [MIT](./LICENSE). Images: see Image credits above.

Repository: [github.com/mahadindotnet/cosmic-shield](https://github.com/mahadindotnet/cosmic-shield)
