# Decision-support rules

Cosmic Shield's alerts come from deterministic rules, one file per module (`lib/<module>/rules.ts`, plus the `hrv_sleep_decline` pattern in `lib/rules/`), all unit-tested and evaluated on read. Thresholds live in `data/rules/thresholds.json`. Every active alert is collected in one place, `lib/alerts/active.ts` (bell, Health Dashboard, Crew admin, co-pilot). Nothing here diagnoses; an alert is a prompt to look and to talk to the Crew Medical Officer.

## Where every threshold comes from

Each number in `data/rules/thresholds.json`, `lib/health/reference-ranges.ts` and `lib/mission/environments.ts` is labelled with its basis:

- **sourced:** taken or derived from a cited source.
- **app default:** a Cosmic Shield setting chosen for the prototype. It is not a NASA standard or a clinical cut-off, and the UI never presents it as one.

| Value | Basis | Source / note |
|---|---|---|
| Career dose limit 600 mSv | sourced | NASA-STD-3001 Volume 1, universal career effective-dose limit. Confirmed via Zanon C et al., *Tomography* 2026;12(7):106 ([doi:10.3390/tomography12070106](https://doi.org/10.3390/tomography12070106)), which cites the NASA-STD-3001 Technical Brief. NASA's own PDF links returned 404 when checked (2026-11-13). |
| Default daily dose 0.717 mSv/day | sourced | ISS ALTEA-Survey via NASA OSDR RadLab (`data/nasa/derived/radiation-environments.json`) |
| Daily dose Watch 1.4 mSv/day; per-environment Watch | app default | 2 × the daily dose |
| Cumulative dose Watch 300 mSv | app default | Half of the 600 mSv career limit |
| Lunar gravity 0.165 g, light delay ≈ 1.3 s, lunar day ≈ 29.5 days | sourced | [NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| Mars gravity 0.38 g, light delay 3–22 min, sol ≈ 24.66 h | sourced | [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| Mars transit 180 days, Mars surface 500 days | sourced | Hassler et al., *Science* 2014: one NASA design reference mission |
| ISS 180-day increment, lunar 30-day stay, ISS "0 g" and "< 1 s" | app default | Scenario values |
| SpO₂ below 90 % → Escalate | sourced | World Health Organization, *Pulse Oximetry Training Manual*, WHO Patient Safety 2011 (ISBN 978 92 4 150113 2), [PDF](https://cdn.who.int/media/docs/default-source/patient-safety/pulse-oximetry/who-ps-pulse-oxymetry-training-manual-en.pdf): "If the oxygen saturation is 94% or lower, the patient is hypoxic and needs to be treated quickly. A saturation of less than 90% is a clinical emergency." Written for anaesthesia providers; applied here as a general hypoxaemia cut-off. |
| Glucose below 70 mg/dL → Watch; below 54 mg/dL → Escalate | sourced | American Diabetes Association, *Guidelines InSIGHT: Hypoglycemia (Low Blood Glucose)*, patient version, based on the Standards of Care in Diabetes—2025, [PDF](https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-patient-5-27-25.pdf): "LEVEL 1 Your blood glucose is less than 70 mg/dL but over or at 54 mg/dL"; "LEVEL 2 Your blood glucose is less than 54 mg/dL". |
| Blood pressure: systolic > 180 or diastolic > 120 mmHg → Escalate | sourced | American Heart Association, *Understanding Blood Pressure Readings*, [https://goredforwomen.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings](https://goredforwomen.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings). This is the AHA's own Go Red for Women mirror of heart.org/bplevels: heart.org (and the mirror) return 403 to automated fetches, so the wording was read from the mirror page by the project team (2026-11-13). Verbatim: category "HYPERTENSIVE CRISIS (consult your doctor immediately)", values "HIGHER THAN 180 and/or HIGHER THAN 120"; guidance "Wait five minutes after your first reading." / "Take your blood pressure again." / "If your readings are still unusually high, contact your health care professional immediately." Strictly greater than, so 180/120 is not Escalate. |
| Resting heart rate Escalate | **not added** | No verifiable source for an escalation cut-off was found. Heart rate stays Watch-only. |
| Vital-sign baselines and Watch bands (HR, HRV, SpO₂ ≤ 94 %, BP, sleep, stress), glucose ≥ 140, self-rated stress ≥ 4/5, daily exercise targets other than the ISS's, hydration 2–3 L, the GI and Amsler pattern rules, eye screening cadence | app default | Not clinical cut-offs |
| ISS daily exercise 120 min; calcium 1000 mg/day; vitamin D 1000 IU/day | sourced | NASA "Astronaut Exercise" page; NASA nutrition requirements (Smith et al. 2021). See Bone protection below. |
| Bristol stool types 1–7 (meanings) | sourced | Lewis & Heaton 1997. See GI below. |
| Why eyes are screened | sourced | NASA HRP, Risk of SANS (sets no threshold). See Eyes below. |
| Glucose "Inspiration4 crew reference (n=4)" 56–100 mg/dL | sourced | NASA OSDR OSD-575 (Inspiration4 metabolic panel): min–max of all 12 pre-flight samples (L-92, L-44, L-3) from the 4 crew, `data/nasa/derived/baselines.json`. Fasting status not stated in the source. Shown for context only; it does not set the Watch bounds. |

## Vitals (`lib/vitals/rules.ts`)

Runs every time vitals are read (statuses are never stored), so a changed threshold applies to old readings too. Each measure of a reading is checked against its limits in `data/rules/thresholds.json`; the reading's status is the worst of its measures. Every limit carries its basis, and every sourced limit must name a citation in `thresholds.json` `sources` (the module refuses to load otherwise).

| Measure | Watch when | Escalate when |
|---|---|---|
| Heart rate | ≥ 88 or ≤ 52 bpm (app default) | never (no verified source) |
| Blood pressure | systolic ≥ 135 or ≤ 100 mmHg, or diastolic ≥ 88 mmHg (app default) | **systolic > 180 or diastolic > 120 mmHg** (sourced: AHA "hypertensive crisis") |
| SpO₂ | ≤ 94 % (app default) | **< 90 %** (sourced: WHO) |
| Glucose (optional) | **< 70 mg/dL** (sourced: ADA level 1), or ≥ 140 mg/dL (app default) | **< 54 mg/dL** (sourced: ADA level 2) |

App-default Watch bounds are inclusive: the band drawn on charts is where readings count as Normal, and Watch begins at its edge. Sourced limits use the source's own comparison ("less than 90%", "less than 54 mg/dL"), so SpO₂ 90 % is Watch and 89 % is Escalate; glucose 54 is Watch and 53 is Escalate; 180/120 is Watch, while 181/100 and 150/121 are Escalate. Examples: 150/95 → Watch ("Systolic 150 mmHg is at or above the Watch level (135 mmHg)", and the same for diastolic 95); SpO₂ 88 → Escalate ("SpO₂ 88 % is below the Escalate level (90 %).").

**When a reading escalates:** the reading is saved together with a row in the `escalation` table (same transaction), holding the values, every limit crossed with its basis and full citation, and the crew ID. The page and the toast show **"Contact the flight surgeon"** with one guidance line per escalating measure (`lib/vitals/escalation.ts`). For blood pressure it follows the AHA chart's steps, with "health care professional" mapped to the flight surgeon / Crew Medical Officer: **"Rest, wait 5 minutes and re-measure. If it is still above 180/120, contact the flight surgeon now."** When blood pressure is the only escalating measure, the notice is headed "Re-measure, then contact the flight surgeon". The Health Dashboard tile shows the worst flagged measure of the latest reading (heart rate when nothing is flagged), so a status badge never sits next to an unrelated number.

Tests: `lib/vitals/rules.test.ts`, `lib/vitals/escalation.test.ts`; Playwright `e2e/vitals.spec.ts` (SpO₂ 88 → Escalate).

## Radiation (`lib/radiation/rules.ts`)

Evaluated on read. Dosimeter readings are stored in `dose_entry` with the crew member's mission environment at the time.

| What | Watch when | Escalate when |
|---|---|---|
| A reading's daily rate (dose × 24 ÷ hours covered) | ≥ 2 × the typical daily dose of the environment it was taken in (app default; e.g. ISS 1.4, Mars transit 3.7 mSv/d). No environment: 1.4 mSv/d (app default, 2 × the ISS ALTEA dose) | never |
| Career total = **sum of every dose entry** | ≥ 300 mSv (app default, half the limit) | **> 600 mSv** (sourced: NASA-STD-3001 career limit) |

- **Projected mission dose** = the environment's typical daily dose × its mission length (e.g. Mars transit 1.84 mSv/d × 180 days ≈ 331 mSv). It is shown as a reference, and the career meter marks where the total would stand after a full mission there. It never sets a status.
- **Crossing the career limit:** the reading that takes the total above 600 mSv is saved with an `escalation` row (rule `radiation_career`, same transaction) holding the totals before and after and the cited limit, and the page shows "Contact the flight surgeon".
- **Space weather (NASA DONKI)** is shown with a source badge: **Live** when `NASA_API_KEY` is set and the API answers, otherwise **Cached** with the date of the last `npm run data:fetch`. It is context only and never changes a dose status.

Tests: `lib/radiation/radiation.test.ts`; Playwright `e2e/radiation.spec.ts`.

## Mind (`lib/mind/rules.ts`)

Daily check-in: mood 1–5, stress 1–5, sleep quality 1–5 (optional), a private note (optional). Rule `mind_pattern`, evaluated on read, **app default, Watch only, never Escalate, not a screening tool**:

| Watch when | Basis |
|---|---|
| Mood ≤ 2 on 3 consecutive days | app default (`thresholds.mind`) |
| Stress ≥ 4 on 3 consecutive days | app default |

- A "day" is a UTC (station time) date; the latest check-in of the day counts, and every check-in counts toward the streak.
- The run must end today or yesterday, so an old run stops counting. A missing day breaks the run.
- History rows show the pattern status as of that day. Seeded check-ins (mood 3–5, stress 1–3) never raise it.
- The flight surgeon sees the scores and statuses on Crew admin, never the notes.
- **Scale change:** migration 0003 converted any earlier 0–10 rows once to 1–5 (1 + round(value × 0.4), clamped: 0 → 1, 5 → 3, 10 → 5).

**Safety check (`mind_safety`)** is separate from this rule: a message in any co-pilot chat, or a check-in note, that mentions hopelessness, self-harm, wanting to die or being unable to cope creates an escalation record for the flight surgeon. See [ai-disclosure.md](./ai-disclosure.md#crisis-safety-check) for how it works and its limits.

Tests: `lib/mind/mind.test.ts`, `lib/mind/mind-db.test.ts`; Playwright `e2e/mind.spec.ts`.

## Bone protection (`lib/bone/rules.ts`)

One log per day or several (they add up): aerobic and resistance minutes, resistance load (kg, with reps: volume = kg × reps), calcium (mg) and vitamin D (IU), stored in `countermeasure_entry`. Each target is labelled with its basis in the UI (`thresholds.json` `bone`, `lib/mission/environments.ts`).

| Target | Value | Basis |
|---|---|---|
| Daily exercise, ISS | 120 min | **sourced**: NASA, "Astronaut Exercise" (2024, updated 2025): "crew members now averaging two hours of exercise per day." |
| Daily exercise, other environments | Lunar surface 90, Mars transit 120, Mars surface 90 min; 120 min when none is chosen | app default |
| Weekly exercise | 7 × the daily target | app default |
| Calcium | 1000 mg/day | **sourced**: lower bound of NASA's 2020 exploration requirement, 1,000–1,200 mg/day (Smith et al., *Human Adaptation to Spaceflight: The Role of Food and Nutrition*, NASA 2021, Table 1). The 1996 ISS requirement was higher, 1,200–2,000 mg. |
| Vitamin D | 1000 IU/day | **sourced**: NASA's 2020 exploration requirement, 1000 IU (25 µg)/day (same book, Table 1; the 1996 ISS requirement was 10 µg = 400 IU). Supporting context from the same book: in-flight data "provide evidence that 800 IU vitamin D/d is enough to maintain vitamin D status during long-duration spaceflight", so the 1000 IU target sits above the level shown to maintain status. |
| Watch below 50 % of the weekly target | 50 % | app default |

**Rule `bone_exercise`** (Watch only, evaluated on read): if anything was logged in the 7 days ending today, total exercise below 50 % of the weekly target is Watch (e.g. under 420 min against 840). No logs in the window means no status, not Watch. Calcium and vitamin D are shown against their targets but never raise a status. The alert goes through `lib/alerts/active.ts` (bell, dashboard summary, co-pilot). Days with exercise minutes count as exercise days for points.

Tests: `lib/bone/bone.test.ts`; Playwright `e2e/bone.spec.ts`.

## GI (`lib/gi/rules.ts`)

One entry per bowel movement (several a day are fine): the Bristol type (1–7, required), optional fluid intake (L) and a note, and an optional photo, stored in `gi_entry`.

**Type meanings are sourced:** the seven types and their descriptions follow the Bristol Stool Form Scale (Lewis SJ, Heaton KW, *Scand J Gastroenterol* 1997;32(9):920–924). The picker shows each type's standard description and a simple drawn pictogram. The app never labels a type as a condition.

| Type | Description (Lewis & Heaton 1997) |
|---|---|
| 1 | Separate hard lumps, like nuts (hard to pass) |
| 2 | Sausage-shaped but lumpy |
| 3 | Like a sausage but with cracks on its surface |
| 4 | Like a sausage or snake, smooth and soft |
| 5 | Soft blobs with clear-cut edges (passed easily) |
| 6 | Fluffy pieces with ragged edges, a mushy stool |
| 7 | Watery, no solid pieces, entirely liquid |

**Rules (Watch only, evaluated on read; app defaults in `thresholds.json` `gi`):**

| Rule | Watch when | Message |
|---|---|---|
| `gi_hard` | Types 1–2 on 2 or more of the last 3 UTC days (ending today) | "Possible dehydration / constipation pattern: … Increase fluids and fibre." |
| `gi_loose` | Types 6–7 on 2 or more of the last 3 UTC days | "Loose stools: … Hydrate, and contact the CMO if it continues." |

Several entries on one day count as one day. Fluid intake is shown against a **2–3 L/day band (app default)** but never raises a status. Alerts go through `lib/alerts/active.ts` (bell, dashboard summary, co-pilot guidance `gi_hard` / `gi_loose`). Each day with a GI entry earns 5 points (app default).

**Photos (labelled prototype).** The photo is stored but **not analysed**: the classifier (`lib/gi/classifier.ts`, also `POST /api/vision/bristol`) always returns "Not analysed: prototype" and never suggests a type or a status. The type the crew member chooses is what gets logged. Photo handling (`lib/uploads/photos.ts`):

- JPEG, PNG or WebP only, recognised by the file's first bytes; at most 5 MB (checked in the browser and again on the server).
- Decoded and re-encoded with sharp: orientation applied, **all metadata removed** (EXIF incl. GPS and camera, XMP, ICC); longest side at most 2048 px.
- Stored under `uploads/gi/<userId>/<random>.<ext>` (`uploads/` is gitignored; e2e uses `uploads-test/`; the seed clears both).
- Served only by `GET /api/photos/gi/[id]` to the **owner or the flight surgeon** (`Cache-Control: private, no-store`); anyone else gets 404, signed out 401. The stored path never leaves the server.

Tests: `lib/gi/gi.test.ts`, `lib/uploads/photos.test.ts`; Playwright `e2e/gi.spec.ts`.

## Eyes (`lib/eyes/rules.ts`)

**Why eyes are screened in flight (sourced):** NASA Human Research Program, Human Research Roadmap, *Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)* ([risk page](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105), last published 05/13/25): "70% of crewmembers experience one or more of the hallmark signs of SANS" (optic disc edema, chorioretinal folds, globe flattening, hyperopic shifts). This explains the module; it sets no threshold. The self-checks help a crew member notice a change and tell the CMO; they do not detect or rule out SANS.

Stored in `eye_screening`, one row per test of one eye:

- **Amsler grid:** the full-screen test (20 × 20 grid) saves the squares marked as wavy, blurred or missing (JSON `[[row, col], …]`), whether the centre dot was seen, and a note. Squares are marked by click, or with the arrow keys and Space. History shows a small preview of the marked squares.
- **Fundus photo:** the same secure handling as GI photos (`lib/uploads/photos.ts`: JPEG/PNG/WebP by signature, ≤ 5 MB, metadata removed, stored under `uploads/eye/<userId>/`, served only by `GET /api/photos/eye/[id]` to the owner or the flight surgeon; anyone else 404). The classifier (`lib/eyes/classifier.ts`, also `POST /api/vision/sans`) always returns "Not analysed: prototype": no finding, no confidence, no status.

**Rules (all app defaults, Watch only, never a diagnosis; `thresholds.json` `eyes`):**

| Rule | When | Result |
|---|---|---|
| `eye_amsler` | The latest Amsler test of either eye has a marked square, or the centre dot was not seen | Watch: "Vision change noticed: repeat the test tomorrow and tell your CMO." (bell, dashboard, co-pilot) |
| `eye_amsler_repeat` | 2 Amsler tests in a row of the **same eye** show a change | Also an escalation record for the flight surgeon (Watch level). Created once, when the run reaches 2; a normal test ends the run. |
| `eye_ground_review` | The crew member ticks "Flag for ground review" on a fundus photo | An escalation record for the flight surgeon (Watch level), with a link to the photo on Crew admin |

Escalation records say "Watch level, not a diagnosis." The flight surgeon's bell lists them as "New escalation: CS-…". Screening cadence (fundus: the environment's `sansCadence`, e.g. ISS every 2 weeks; Amsler weekly, each eye) is an app default. Each day with an eye screening earns 5 points (app default). No eye screenings are seeded: the module stays empty until a crew member takes a test.

Tests: `lib/eyes/eyes.test.ts`, `lib/eyes/eyes-db.test.ts`; Playwright `e2e/eyes.spec.ts`.

## Gamification (`lib/gamification/rules.ts`)

Motivation only: points and streaks never change a health status. All values are **app defaults** in `thresholds.json` `gamification`.

| Activity | Points per UTC day |
|---|---|
| Daily check-in (Mind) | 10 |
| Vitals entry | 10 |
| Sleep entry (the night it covers) | 10 |
| Dosimeter reading | 5 |
| Exercise (a Bone log with exercise minutes) | 10 |
| GI entry | 5 |
| Eye screening (Amsler test or fundus photo) | 5 |

- Each activity earns its points **once per UTC day**: logging the same thing again that day earns nothing more.
- **Streak** = consecutive UTC days with a daily check-in. The current streak counts back from today, or from yesterday while today's check-in is still open; **best streak** is the longest run in all history.
- **Streak bonuses:** every run that reaches 7 days earns +20 once, and 30 days +50.
- The month calendar is coloured by how many of the seven activities were logged that day.
- Demo seed entries count: they stand in for the demo crew's past logging.
- The bell's reminder names the current streak: "Daily check-in due: keep your 5-day streak" (or "start a streak today").

Tests: `lib/gamification/rules.test.ts`; Playwright `e2e/gamification.spec.ts`.

## Sleep & Stress (`lib/sleep/rules.ts`)

Per night, evaluated on read, Watch only. All **app default**:

| Measure | Watch when |
|---|---|
| Sleep | ≤ 5.5 h |
| HRV (RMSSD, optional) | ≤ 28 ms (population floor; the personal pattern below matters more) |
| Stress (self-rated 1 calm – 5 overwhelmed) | ≥ 4 |

Sleep quality (1–5) is recorded but not scored. Several entries for the same night are kept in history; the newest one counts for trends, the tile and the early-warning rule. Tests: `lib/sleep/sleep.test.ts`.

## `hrv_sleep_decline` (early warning)

Code: `lib/rules/hrv-sleep-decline.ts` · Tests: `lib/rules/hrv-sleep-decline.test.ts` · Thresholds: `thresholds.patterns.hrvSleepDecline`

**Data:** the crew member's own `sleep_entry` rows (newest entry per night), so nights logged by hand on the Sleep & Stress page count, and replace the seeded night for the same date.

**What it looks for:** heart-rate variability (HRV, as RMSSD in milliseconds) clearly below the crew member's **own** recent baseline for several nights in a row, together with less sleep than usual. The two together suggest recovery isn't keeping up, so the card suggests simple countermeasures before it becomes a bigger problem.

**Status:** **Watch** only. This rule never escalates on its own.

**Basis:** **app heuristic.** Every threshold below is a Cosmic Shield design choice, tuned to be calm and specific. None is a NASA standard or a clinical cut-off, and the rule uses personal baselines, not population norms.

### Logic

1. Take the crew member's last **3** nights with both HRV and sleep. They must be **consecutive**.
2. The most recent of those nights must be at most **2** days before today (UTC). Older data doesn't raise a "now" alert.
3. **Baseline:** every night in the **14** days before the first of those 3 nights. At least **7** nights are needed; otherwise the rule doesn't fire. Baseline = mean and standard deviation of HRV and of sleep.
4. **HRV condition:** on **each** of the 3 nights, HRV ≤ baseline mean × (1 − **10%**).
5. **Sleep condition:** the 3-night average sleep is ≥ **0.5 h** below the baseline mean, **or** below **6 h**.
6. Fires when both conditions hold. The result includes each night's HRV and % change vs baseline, each night's sleep and the difference vs baseline, the 3-night sleep average, the baseline window and values, the thresholds and the citations.

### Thresholds and why

| Setting | Value | Why this value (app heuristic) |
|---|---|---|
| `flaggedNights` | 3 | One or two low nights are common (a late task, a noisy module). Three in a row is a pattern worth a gentle prompt. |
| `baselineDays` | 14 | Two weeks is long enough to average out single nights, and short enough to follow the crew member's current routine. |
| `minBaselineNights` | 7 | With fewer than a week of nights the baseline is too uncertain, so the rule stays quiet. |
| `hrvDropPct` | 10 % | Night-to-night HRV naturally varies by a few percent. Requiring ≥ 10 % below the person's own mean on every flagged night avoids alerting on ordinary noise. |
| `sleepDropHours` | 0.5 h | Half an hour less than usual for three nights adds up to a meaningful sleep debt for that person. |
| `sleepFloorHours` | 6 h | A simple absolute floor, so someone whose usual sleep is already short still gets the prompt. |
| `maxNightAgeDays` | 2 | The alert describes "the last three nights"; if the newest night is older than 2 days, it is no longer current. |
| Baseline band in charts | mean ± 1 SD | A visual guide to "your usual range". It is not used to decide whether the rule fires. |

**Units:** HRV is shown as RMSSD in milliseconds and sleep in hours, in the charts and in "Why am I seeing this?". Demo values are **simulated RMSSD** (`lib/demo/nightly.ts`), not NASA measurements.

### Card content

The card shows the headline "HRV has dropped for three nights. Sleep is down." Its suggestions are deliberately non-diagnostic:

- **What this may mean:** accumulated fatigue, workload stress, or a disrupted sleep schedule. No condition or disease is named.
- **What you can do next:**
  - Protect the next sleep period and keep a consistent schedule.
  - Follow the station's sleep-shift lighting schedule.
  - Ease the workload where possible.
  - Try slow breathing before sleep.
  - Re-check tomorrow morning.
  - Talk to the Crew Medical Officer if it continues or you feel unwell.

"Dismiss for today" records an acknowledgement in the `alert_ack` table and hides the card until the next UTC day (the ISS runs on UTC).

### Citations

1. NASA Human Research Program, Human Research Roadmap. **"Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload"** (short title: Sleep). https://humanresearchroadmap.nasa.gov/Risks/?i=100 (checked 2026-11-13).
   - **Used for:** why sleep and recovery are worth monitoring in flight.
   - **Not used for:** it does not define any threshold above.
2. Flynn-Evans EE, Rueger M, Liu AM, et al. *Effectiveness of caffeine and blue-enriched light on cognitive performance and electroencephalography correlates of alertness in a spaceflight robotics simulation.* npj Microgravity 2023;9:93. [doi:10.1038/s41526-023-00332-w](https://doi.org/10.1038/s41526-023-00332-w) (PMC10730879).
   - **Used for:** the lighting suggestion. The paper states: "Beginning in 2016, the fluorescent lighting aboard ISS was gradually replaced with a programmable multi-LED lighting system that can provide a light program with different spectra and intensities at different times of day in order to maximize alertness and performance (for example, when working overnight) or to minimize alertness (for example, in the hours before scheduled sleep)".
3. This document: the thresholds and their rationale (app heuristics).

### Demo data

`npm run db:seed` writes 14 nights of simulated sleep, HRV (RMSSD), quality and stress per demo crew member into `sleep_entry` (source "seed"), ending last night (UTC). Generator: `lib/demo/nightly.ts` (deterministic).

- **Realistic variation:** night-to-night RMSSD varies with a coefficient of variation of 8–12 % and sleep with an SD of 0.4–0.6 h around each person's baseline (normal draws capped at ±2.5 SD). Normal nights are kept above the per-night Watch levels, so seeded data never shows Watch on its own.
- **CS-003 Lindqvist:** 11 normal nights (around 45 ms RMSSD, about 7.2 h sleep), then 3 nights with HRV about 18–22 % down and sleep 5.1–5.4 h. The rule fires.
- **Everyone else:** normal variation only. The rule stays quiet (checked in `lib/sleep/sleep.test.ts`).
- **Dosimeter readings:** 14 daily 24-hour readings per crew member at the ISS dose measured by ALTEA (0.717 mSv/day, NASA RadLab) with a smooth ±8 % variation, ending yesterday, plus one career summary entry for previous missions (demo values: CS-001 118, CS-002 64, CS-003 none, CS-004 215 mSv). Everyone stays below every Watch level. Generator: `lib/radiation/seed-data.ts`.
- **By hand:** entering 3 low nights (e.g. HRV 30 ms, 4.8 h) for the last three nights as CS-001 makes the card appear (`e2e/sleep-stress.spec.ts`).

Because alerts only use the last 2 nights, **re-seed before a demo**.
