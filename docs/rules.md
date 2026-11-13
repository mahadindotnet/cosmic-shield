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
| Vital-sign baselines and Watch bands (HR, HRV, SpO₂, BP, sleep, stress), glucose 70–140, exercise 120–180 min, hydration 2–3 L, SANS cadence, Bristol and SANS settings, mission day 42 | app default | Not clinical cut-offs |
| Glucose "Inspiration4 crew reference (n=4)" 56–100 mg/dL | sourced | NASA OSDR OSD-575 (Inspiration4 metabolic panel): min–max of all 12 pre-flight samples (L-92, L-44, L-3) from the 4 crew, `data/nasa/derived/baselines.json`. Fasting status not stated in the source. Shown for context only; it does not set the Watch bounds. |

## Vitals (`lib/vitals/rules.ts`)

Runs every time vitals are read (statuses are never stored), so a changed threshold applies to old readings too. Each measure of a reading is checked against its Watch bounds in `data/rules/thresholds.json` (all **app default**); the reading's status is the worst of its measures. Vitals rules raise **Watch** only, never Escalate.

| Measure | Watch when | Basis |
|---|---|---|
| Heart rate | ≥ 88 or ≤ 52 bpm | app default |
| Blood pressure | systolic ≥ 135 or ≤ 100 mmHg, or diastolic ≥ 88 mmHg | app default |
| SpO₂ | ≤ 94 % | app default |
| Glucose (optional) | ≥ 140 or ≤ 70 mg/dL | app default |

Bounds are inclusive: the band drawn on charts is where readings count as Normal, and Watch begins at its edge. Example: 150/95 → Watch ("Systolic 150 mmHg is at or above the Watch level (135 mmHg)", and the same for diastolic 95). The Health Dashboard tile shows the first flagged measure of the latest reading (heart rate when nothing is flagged), so a Watch badge never sits next to an unrelated number. Tests: `lib/vitals/rules.test.ts`.

## `hrv_sleep_decline` (early warning)

Code: `lib/rules/hrv-sleep-decline.ts` · Tests: `lib/rules/hrv-sleep-decline.test.ts` · Thresholds: `thresholds.patterns.hrvSleepDecline`

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

`npm run db:seed` writes 14 nights of simulated HRV and sleep for each demo crew member, ending last night (UTC):

- **CS-003 Lindqvist:** 11 normal nights (around 45 ms RMSSD, about 7.2 h sleep), then 3 nights with HRV about 18–22 % down and sleep 5.1–5.4 h. The rule fires.
- **Everyone else:** normal variation (within ±4 % HRV, ±0.25 h sleep). The rule stays quiet.

Because alerts only use the last 2 nights, **re-seed before a demo**.
