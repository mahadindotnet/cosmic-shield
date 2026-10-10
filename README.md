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

- [OSDR / Inspiration4](https://www.nasa.gov/mission/station/research/science-360/inspiration4/) — clinical baseline bands  
- [RadLab](https://radlab.nasa.gov/) — radiation dose sample curve  
- [NASA Human Research Program risks](https://humanresearchroadmap.nasa.gov/) — escalation framework  

Full mapping: [docs/nasa-data-sources.md](./docs/nasa-data-sources.md). Submission checklist: [docs/SUBMISSION.md](./docs/SUBMISSION.md).

Demo crew vitals are **simulated**; NASA data drives **thresholds, baselines, and validity** of the decision-support logic.

---

## Quick start

```bash
git clone https://github.com/mahadindotnet/cosmic-shield.git
cd cosmic-shield
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000/dashboard**.

### Production build

```bash
npm run build
npm start
```

### Tests

```bash
npm run test:e2e
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
