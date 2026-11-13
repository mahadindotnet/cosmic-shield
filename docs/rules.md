# Decision-support rules

Cosmic Shield's alerts come from deterministic rules in `lib/rules/`, with unit tests. Thresholds live in `data/rules/thresholds.json`. Nothing here diagnoses; an alert is a prompt to look and to talk to the Crew Medical Officer.

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
| Vital-sign baselines and Watch bands (HR, HRV, SpO₂ ≤ 94 %, BP, sleep, stress), glucose ≥ 140, self-rated stress ≥ 4/5, exercise 120–180 min, hydration 2–3 L, SANS cadence, Bristol and SANS settings, mission day 42 | app default | Not clinical cut-offs |
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

## Gamification (`lib/gamification/rules.ts`)

Motivation only: points and streaks never change a health status. All values are **app defaults** in `thresholds.json` `gamification`.

| Activity | Points per UTC day |
|---|---|
| Daily check-in (Mind) | 10 |
| Vitals entry | 10 |
| Sleep entry (the night it covers) | 10 |
| Dosimeter reading | 5 |
| Exercise session (Bone, once built) | 10 |

- Each activity earns its points **once per UTC day**: logging the same thing again that day earns nothing more.
- **Streak** = consecutive UTC days with a daily check-in. The current streak counts back from today, or from yesterday while today's check-in is still open; **best streak** is the longest run in all history.
- **Streak bonuses:** every run that reaches 7 days earns +20 once, and 30 days +50.
- The month calendar is coloured by how many of the five activities were logged that day.
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
