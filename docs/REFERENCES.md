# References

Every source, paper, dataset, library and asset Cosmic Shield draws on. Links are given where we have them; anything without a verified link says so. How each data source is processed is in [nasa-data-sources.md](./nasa-data-sources.md), and which threshold comes from where is in [rules.md](./rules.md).

Last checked: 2026-11-13.

## 1. NASA datasets and APIs

| Source | What we use | Where in the app | Link |
|---|---|---|---|
| NASA OSDR **OSD-575**: Inspiration4 Comprehensive Metabolic Panel | Glucose, calcium, sodium, potassium, BUN and creatinine for 4 crew at 7 time points (pre- and post-flight only; no in-flight samples) | `data/nasa/derived/baselines.json`; the "Inspiration4 crew reference (n=4)" glucose band on the Vitals page | [osdr.nasa.gov/osdr/data/osd/files/575](https://osdr.nasa.gov/osdr/data/osd/files/575) |
| NASA OSDR **RadLab** API: ISS DOSIS 3D DosTel | Absorbed dose, 1–8 Apr 2022 (0.666 mGy/day) | `radiation-environments.json` | [RadLab data API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) |
| NASA OSDR RadLab: ISS **ALTEA-Survey** | Measured dose equivalent, 1–7 Jun 2011 (0.717 mSv/day) | ISS daily dose and the default radiation threshold | [RadLab data API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) |
| NASA OSDR RadLab: **LRO CRaTER** | Lunar-orbit absorbed dose, 1–8 Apr 2022 (typical 0.409 mGy/day), with a likely solar particle event on 1–3 Apr | `radiation-environments.json` (reference only) | [RadLab data API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) |
| NASA OSDR RadLab: Curiosity **MSL-RAD** | Mars-surface absorbed dose, 1–8 Apr 2022 (0.207 mGy/day) | `radiation-environments.json` | [RadLab data API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) |
| NASA **DONKI** (Space Weather Database Of Notifications, Knowledge, Information) | CME, geomagnetic storm (GST) and solar energetic particle (SEP) feeds. The solar flare (FLR) feed returned 404 when fetched | `space-weather.json`; Space weather panel on the Health Dashboard | [api.nasa.gov](https://api.nasa.gov/) (`/DONKI`); fallback [kauai.ccmc.gsfc.nasa.gov/DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) |
| NASA **Human Research Roadmap**: "Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload" | Why sleep and recovery are monitored (does not set any threshold) | `hrv_sleep_decline` early-warning card | [humanresearchroadmap.nasa.gov/Risks/?i=100](https://humanresearchroadmap.nasa.gov/Risks/?i=100) |
| NASA Human Research Roadmap: human system risks index | Risk names | `data/nasa/hrp-risks.json` (loaded, not shown) | [humanresearchroadmap.nasa.gov](https://humanresearchroadmap.nasa.gov/) |
| NASA **Moon Fact Sheet** | Gravity 0.165 g, light delay ≈ 1.3 s, lunar day ≈ 29.5 days | `lib/mission/environments.ts` | [nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| NASA **Mars Fact Sheet** | Gravity 0.38 g, Earth–Mars distance → light delay 3–22 min, sol ≈ 24.66 h | `lib/mission/environments.ts`; `commsDelayMinutes` in `thresholds.json` | [nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| **NASA-STD-3001** Volume 1 (Crew Health) | Career effective-dose limit, 600 mSv | Career-dose meter; `careerLimitMsv` | NASA's own PDF links returned 404 when checked; confirmed via Zanon et al. 2026 (section 3) |
| NASA OSDR **OSD-630**: Inspiration4 stool | Named as a validity reference for the Bristol (GI) module; not downloaded | GI module notes | [osdr.nasa.gov](https://osdr.nasa.gov/) (OSD-630) |

## 2. Other agencies' instruments and data

We did not download anything directly from another agency. These instruments' data reached us through NASA RadLab or a published paper.

| Instrument | Agency | How we got it |
|---|---|---|
| ALTEA-Survey (ISS) | Italian Space Agency (ASI) | NASA OSDR RadLab |
| DOSIS 3D DosTel (ISS) | German Aerospace Center (DLR) / European Space Agency (ESA) | NASA OSDR RadLab |
| Lunar Lander Neutrons and Dosimetry (LND), Chang'E-4 | China National Space Administration (CNSA); instrument built by Kiel University, Germany | Lunar-surface dose from Zhang et al. 2020 (section 3) |

## 3. Papers

| Citation | What we use | Link |
|---|---|---|
| Zeitlin C, Hassler DM, Cucinotta FA, et al. Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory. *Science* 2013;340(6136):1080–1084. | Mars transit dose equivalent, 1.84 ± 0.30 mSv/day (value read from Hassler 2014, Table 2, which cites this paper) | [doi:10.1126/science.1235989](https://doi.org/10.1126/science.1235989) |
| Hassler DM, Zeitlin C, Wimmer-Schweingruber RF, et al. Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover. *Science* 2014;343(6169):1244797. | Mars surface dose equivalent, 0.64 ± 0.12 mSv/day; 180-day transit and 500-day surface stay (one NASA design reference mission) | [doi:10.1126/science.1244797](https://doi.org/10.1126/science.1244797); [open-access manuscript](https://dspace.library.uu.nl/handle/1874/309142) |
| Zhang S, Wimmer-Schweingruber RF, Yu J, et al. First measurements of the radiation dose on the lunar surface. *Science Advances* 2020;6(39):eaaz1334. | Lunar surface dose equivalent, 1.369 mSv/day | [doi:10.1126/sciadv.aaz1334](https://doi.org/10.1126/sciadv.aaz1334); [PMC7518862](https://pmc.ncbi.nlm.nih.gov/articles/PMC7518862/) |
| Flynn-Evans EE, Rueger M, Liu AM, et al. Effectiveness of caffeine and blue-enriched light on cognitive performance and electroencephalography correlates of alertness in a spaceflight robotics simulation. *npj Microgravity* 2023;9:93. | The ISS's programmable LED lighting, behind the sleep-lighting suggestion | [doi:10.1038/s41526-023-00332-w](https://doi.org/10.1038/s41526-023-00332-w) (PMC10730879) |
| Zanon C, et al. *Tomography* 2026;12(7):106. | Confirms NASA-STD-3001's 600 mSv career limit (cites the NASA-STD-3001 Technical Brief) | [doi:10.3390/tomography12070106](https://doi.org/10.3390/tomography12070106) |

### Clinical guidance (sourced Escalate and Watch limits)

| Source | What we use | Link |
|---|---|---|
| World Health Organization. *Pulse Oximetry Training Manual*. WHO Patient Safety, 2011. ISBN 978 92 4 150113 2. | SpO₂ < 90 % → Escalate ("A saturation of less than 90% is a clinical emergency"). Written for anaesthesia providers. | [PDF (who.int)](https://cdn.who.int/media/docs/default-source/patient-safety/pulse-oximetry/who-ps-pulse-oxymetry-training-manual-en.pdf) |
| American Diabetes Association. *Guidelines InSIGHT: Hypoglycemia (Low Blood Glucose)*, patient version, based on the Standards of Care in Diabetes—2025. | Glucose < 70 mg/dL → Watch (level 1), < 54 mg/dL → Escalate (level 2) | [PDF (professional.diabetes.org)](https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-patient-5-27-25.pdf) |
| American Heart Association, blood pressure categories ("hypertensive crisis") | **Not used yet**: heart.org could not be read to confirm the wording (HTTP 403, 2026-11-13) | [heart.org/bplevels](https://www.heart.org/bplevels) (unverified) |

### Tools used to find and check the papers

| Tool | Use | Link |
|---|---|---|
| Europe PMC | Finding full texts and checking quotes | [europepmc.org](https://europepmc.org/) |
| Unpaywall | Finding open-access versions | [unpaywall.org](https://unpaywall.org/) |
| Utrecht University repository (DSpace) | Open-access Hassler 2014 manuscript | [dspace.library.uu.nl/handle/1874/309142](https://dspace.library.uu.nl/handle/1874/309142) |
| PubMed Central | Open-access Zhang 2020 and Flynn-Evans 2023 | [pmc.ncbi.nlm.nih.gov](https://pmc.ncbi.nlm.nih.gov/) |

## 4. Values that are not from a source

These are Cosmic Shield settings, labelled **app default** in the code and UI and listed in [rules.md](./rules.md). They are not NASA standards or clinical cut-offs:

- Vital-sign Watch bands (heart rate, blood pressure, SpO₂ ≤ 94 %, glucose ≥ 140 mg/dL, HRV, sleep, self-rated stress ≥ 4/5).
- Radiation Watch levels (2 × the daily dose; 300 mSv cumulative = half the career limit).
- The `hrv_sleep_decline` pattern settings.
- Exercise and hydration targets, SANS cadence, Bristol and SANS settings, mission day 42, ISS increment and lunar stay lengths.

**Simulated demo data** (not real crew data): the seeded vitals (`lib/vitals/seed-data.ts`), the 14 nights of sleep, HRV, quality and stress (`lib/demo/nightly.ts`; RMSSD CV 8–12 %, sleep SD 0.4–0.6 h, demo settings) and the crew snapshots on Crew admin (`lib/demo/crew-profiles.ts`). The four demo crew and the flight surgeon are fictional.

## 5. Libraries

Versions are from `package.json`.

### Runtime

| Library | Version | Use | Link |
|---|---|---|---|
| Next.js | 16.4.6 | App framework (App Router, Server Actions, `proxy.ts`) | [nextjs.org](https://nextjs.org/) |
| React / React DOM | 19.3.0 | UI | [react.dev](https://react.dev/) |
| Tailwind CSS | 4 | Styling | [tailwindcss.com](https://tailwindcss.com/) |
| tw-animate-css | ^1.4.0 | Animation utilities | [github.com/Wombosvideo/tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) |
| shadcn/ui | ^4.23.0 | Component source (base-nova style) | [ui.shadcn.com](https://ui.shadcn.com/) |
| Base UI | ^1.9.0 | Accessible primitives under shadcn | [base-ui.com](https://base-ui.com/) |
| Radix UI (dialog, scroll-area, separator, slot, tabs) | ^1 | Accessible primitives | [radix-ui.com](https://www.radix-ui.com/) |
| Recharts | ^3.8.0 | Charts | [recharts.org](https://recharts.org/) |
| lucide-react | ^0.544.0 | Icons | [lucide.dev](https://lucide.dev/) |
| sonner | ^2.0.7 | Toasts | [sonner.emilkowal.ski](https://sonner.emilkowal.ski/) |
| next-themes | ^0.4.6 | Theme handling | [github.com/pacocoursey/next-themes](https://github.com/pacocoursey/next-themes) |
| class-variance-authority, clsx, tailwind-merge, cn | — | Class-name helpers | [cva.style](https://cva.style/), [clsx](https://github.com/lukeed/clsx), [tailwind-merge](https://github.com/dcastil/tailwind-merge) |
| zustand | ^5.0.8 | Client state (mission environment) | [zustand.docs.pmnd.rs](https://zustand.docs.pmnd.rs/) |
| Zod | ^4.6.7 | Input validation | [zod.dev](https://zod.dev/) |
| Drizzle ORM | ^0.44.6 | Database access and migrations | [orm.drizzle.team](https://orm.drizzle.team/) |
| better-sqlite3 | ^12.4.1 | SQLite driver | [github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| jose | ^6.2.17 | Signed session tokens (JWT, HS256) | [github.com/panva/jose](https://github.com/panva/jose) |
| bcryptjs | ^3.0.3 | PIN hashing | [github.com/dcodeIO/bcrypt.js](https://github.com/dcodeIO/bcrypt.js) |
| server-only | ^0.0.1 | Keeps server modules out of client bundles | [npmjs.com/package/server-only](https://www.npmjs.com/package/server-only) |

### Development and testing

| Tool | Version | Use | Link |
|---|---|---|---|
| TypeScript | 5 | Type checking | [typescriptlang.org](https://www.typescriptlang.org/) |
| Drizzle Kit | ^0.31.5 | Generating SQL migrations | [orm.drizzle.team/docs/kit-overview](https://orm.drizzle.team/docs/kit-overview) |
| tsx | ^4.20.6 | Running scripts (fetch, build, migrate, seed) | [tsx.is](https://tsx.is/) |
| Vitest | ^3.2.7 | Unit tests | [vitest.dev](https://vitest.dev/) |
| Playwright | ^1.55.1 | End-to-end tests and the contrast check | [playwright.dev](https://playwright.dev/) |
| ESLint (+ eslint-config-next) | 9 | Linting | [eslint.org](https://eslint.org/) |
| Prettier | ^3.6.2 | Formatting | [prettier.io](https://prettier.io/) |
| sharp | (via Next.js) | Image conversion to WebP, cropping, background keying | [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com/) |

## 6. Assets

### Fonts

Loaded with `next/font/google`, all under the SIL Open Font License.

| Font | Use | Link |
|---|---|---|
| Space Grotesk | Headings and wordmark | [fonts.google.com/specimen/Space+Grotesk](https://fonts.google.com/specimen/Space+Grotesk) |
| Geist | Body text and UI | [vercel.com/font](https://vercel.com/font) |
| Geist Mono | Readings, units, numeric inputs | [vercel.com/font](https://vercel.com/font) |

### Images

Supplied by the project team in `design-ref/` and `feature_img/`, then converted to WebP (and cropped, keyed or recoloured) for the app. **The original creator and licence of these images are not recorded in the repository.**
Image source 1: https://unsplash.com/
Image source 2: https://pixabay.com/

| App file | Made from | Note |
|---|---|---|
| `public/backgrounds/iss-orbit.webp` | `design-ref/ISS.jpg` | ISS background |
| `public/backgrounds/lunar-astronaut.webp` | `design-ref/moonNew.jpg` | Lunar surface background |
| `public/backgrounds/mars-planet.webp` | `design-ref/mars1.jpg` | Mars transit background |
| `public/backgrounds/mars-cliff.webp` | `design-ref/marsSurf.jpg` | Mars surface background |
| `public/organs/anatomy.webp` | `feature_img/anatomy1.jpg` | Health Dashboard body map; background keyed to transparency |
| `public/organs/heart.webp` | `feature_img/heart.png` | Vitals |
| `public/organs/bone.webp` | `feature_img/bone.png` | Bone Protection; recoloured light cyan |
| `public/organs/eye.webp` | `feature_img/eye.png` | Eyes |
| `public/organs/gi.webp` | `feature_img/GI.png` | GI |
| `public/organs/mind.webp` | `feature_img/mind.png` | Mind |

The other images in `design-ref/` (numbered screenshots and "Inspo" files) were used as layout and style inspiration only; none ships with the app. The Cosmic Shield logo and the Sleep & Stress and Radiation holograms are drawn in code (`logo.tsx`, `holograms.tsx`). `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg` and `window.svg` are the Next.js starter files and are unused.
