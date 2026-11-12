# NASA data sources (Cosmic Shield)

Cosmic Shield uses **NASA open data** as reference values. Two scripts turn the raw downloads into small JSON files the app can use offline:

```bash
npm run data:fetch                  # download and cache into data/nasa/ (needs NASA_API_KEY in .env)
npm run data:fetch -- --only=donki  # one source: osdr | donki | radlab
npm run data:build                  # build data/nasa/derived/ from the cache; no network
```

`data:build` is plain deterministic code (`scripts/build-baselines.ts`, with the maths in `scripts/lib/`, covered by `npm test`). It also copies its output into **`data/nasa/fixtures/`**, the committed offline backup. Every derived entry names its source and URL. `data/nasa/manifest.json` records where and when each cached file was downloaded (API key redacted).

## Derived files

### `baselines.json`: Inspiration4 metabolic panel (OSD-575)

Source: [NASA OSDR OSD-575](https://osdr.nasa.gov/osdr/data/osd/files/575), file `LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv` (4 crew × 7 time points).

- **Analytes:** glucose, calcium, sodium, potassium, BUN and creatinine. eGFR (race-based) and the BUN-to-creatinine ratio are left out.
- **No in-flight data (`"inflight_samples": 0`).** Inspiration4 flew for 3 days, and blood was drawn only before launch (L-92, L-44, L-3) and after return (R+1, R+45, R+82, R+194). These values describe the crew on the ground before and after flight, not in space.
- `entries`: one entry per analyte and time point (n = 4), with `phase`, `days_from_event` (−92 … +194) and min, max, mean, median.
- `pooled.preflight_baseline`: all pre-flight samples (n = 12), with SD.
- `pooled.immediate_return`: R+1 (n = 4), with the change from the pre-flight mean (absolute and %).
- `per_crew_preflight`: each crew member's own pre-flight mean (n = 3), for personal baselines.
- **Lab ranges:** each analyte carries the lab's reference range. Calcium and creatinine ranges differ by crew member (the lab appears to use sex- or age-specific ranges). The analyte-level range is the most common one (a warning is recorded). Per-crew entries use that crew member's own range.
- **Glucose:** fasting status is not stated in the source or its ISA metadata.
- **Limits:** n = 4 private astronauts on a 3-day mission. Use as reference only, not as clinical norms.

### `radiation-environments.json`: daily dose per environment

Absorbed dose comes from the [NASA OSDR RadLab API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) (1–8 April 2022 for all three absorbed-dose instruments). Dose equivalent (mSv/day) is **measured** where RadLab has `dose_equivalent_rate`; otherwise it is **published**, copied from a peer-reviewed paper. Cosmic Shield never estimates a quality factor.

| `id` | Absorbed dose (RadLab) | Dose equivalent | `mSv_basis` |
|---|---|---|---|
| `iss` | ISS DosTel (2 detectors), 0.666 mGy/day | 0.717 mSv/day, ALTEA-Survey, 1–7 June 2011 | measured |
| `lunar_orbit` | LRO CRaTER, typical 0.409 mGy/day | none available | `null` |
| `lunar_surface` | none in RadLab | 1.369 mSv/day, Zhang et al. 2020 | published |
| `mars_transit` | none in RadLab | 1.84 ± 0.30 mSv/day, Zeitlin et al. 2013 | published |
| `mars_surface` | Curiosity MSL-RAD, 0.207 mGy/day | 0.64 ± 0.12 mSv/day, Hassler et al. 2014 | published |

- **Method:** for each detector and UTC day, mean dose rate × 24 ÷ 1000 (μGy/h → mGy/day, μSv/h → mSv/day). Incomplete days are dropped, and detectors are averaged per day. Each environment has `mGy_per_day` (mean), `typical_mGy_per_day` (= median), `max_daily_mGy` and the `daily` series.
- **`notable_event`:** consecutive days above 1.5 × the median. Lunar orbit has one on 1–3 April 2022 (peak 3.24 mGy on 2 April), most likely a solar particle event. It is not confirmed against an event catalogue. This is why `typical_mGy_per_day` (0.409) is the better quiet-time figure than the mean (0.926).
- **Not available in RadLab (checked by querying the API):**
  - **MSL-RAD cruise data (Dec 2011 – Aug 2012):** there are no Curiosity rows before landing, so Mars transit has no absorbed dose.
  - **IV-TEPC (2014-09 → 2018-02) and TEPC (2014-09 → 2020-01):** the rows exist, but `dose_equivalent_rate` is empty in every one. ALTEA-Survey (Sep 2010 – Jun 2012) is the only ISS instrument with measured dose equivalent, so it supplies the ISS mSv/day. It is a different instrument, location and year from the DosTel absorbed dose.
- **Absorbed dose (mGy) is not dose equivalent (mSv).** The two columns come from different instruments and periods, so their ratio is not a quality factor.

#### Published values and how they were checked

None of the three values appears in its paper's abstract, so each was checked against the full text. The verbatim quote and where it was read are stored in each entry's `dose_equivalent.quote` and `verified_in`.

| Environment | Value | Citation | Where checked |
|---|---|---|---|
| Mars transit | 1.84 ± 0.30 mSv/day (GCR, inside MSL during cruise) | Zeitlin C, Hassler DM, Cucinotta FA, et al. Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory. *Science* 2013;340(6136):1080–1084. [doi:10.1126/science.1235989](https://doi.org/10.1126/science.1235989) | Zeitlin is paywalled, and its abstract only gives 0.66 ± 0.12 Sv for the shortest round trip. The daily value is in Hassler 2014, Table 2 ("MSL cruise", citing Zeitlin 2013 as reference 22) |
| Mars surface | 0.64 ± 0.12 mSv/day (GCR, Gale crater, first ~300 sols) | Hassler DM, Zeitlin C, Wimmer-Schweingruber RF, et al. Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover. *Science* 2014;343(6169):1244797. [doi:10.1126/science.1244797](https://doi.org/10.1126/science.1244797) | Main text and Table 2 of the [open-access manuscript](https://dspace.library.uu.nl/handle/1874/309142) |
| Lunar surface | 1369 μSv/day = 1.369 mSv/day (Chang'E-4 LND, far side) | Zhang S, Wimmer-Schweingruber RF, Yu J, et al. First measurements of the radiation dose on the lunar surface. *Science Advances* 2020;6(39):eaaz1334. [doi:10.1126/sciadv.aaz1334](https://doi.org/10.1126/sciadv.aaz1334) | Discussion section of the [open-access full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC7518862/). The abstract gives absorbed dose only |

#### How the app uses it

The environment selector offers **ISS, Lunar surface, Mars transit and Mars surface**. `lib/mission/environments.ts` reads each environment's mSv/day from the committed fixture through `lib/nasa/radiation.ts` (ISS: measured; others: published). The **Watch threshold (2 × the daily dose) is an app heuristic, not a NASA value**: it is not taken from any NASA standard or paper, and it only decides when the app raises a Watch. Lunar orbit stays in the data as an absorbed-dose reference only.

### `space-weather.json`: recent solar activity (DONKI)

Source: NASA DONKI via `api.nasa.gov` (fallback: `kauai.ccmc.gsfc.nasa.gov`), last 60 days.

- **Feeds:** FLR (flares), SEP (solar energetic particles), CME and GST (geomagnetic storms).
- **Events:** each one is simplified to `{type, id, start_time, class_or_intensity, link}`. The file keeps the newest 30 across all feeds.
- **Per-feed metadata:** `feeds[]` gives each feed's source URL (from `manifest.json`), host, `fetched_at` and status. A feed that has never been downloaded is listed as `"missing"`. The top-level `fetched_at` is the oldest feed fetch.

## Loading in the app

- **Server code (`lib/nasa/loaders.ts`):** reads `data/nasa/derived/*.json` and falls back to `data/nasa/fixtures/*.json` when a derived file is missing. Each result is labelled with `origin`.
- **Space weather (`getLiveSpaceWeather()`):** fetches DONKI live when `NASA_API_KEY` is set (api.nasa.gov, then the CCMC server). It falls back to the cached `space-weather.json`, and the key is never returned.
- **Client components:** import `lib/nasa/radiation.ts`, which reads the fixture only.

## Other bundled files

| File | Status |
|---|---|
| `data/nasa/hrp-risks.json` | [NASA HRP human system risks](https://humanresearchroadmap.nasa.gov/) index for the escalation ladder |

The placeholder files `inspiration4-baselines.json` and `radlab-sample.json` (hand-made numbers) have been removed.

## Other references (not downloaded)

| Module | Reference | Notes |
|---|---|---|
| Cytokine context | Inspiration4 publications | "18 markers in 3 days", used in outreach copy only |
| Stool / GI | OSD-630 (Inspiration4 stool) | Validity reference for the Bristol module |
