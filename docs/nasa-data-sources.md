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

### `radiation-environments.json`: measured dose per environment (RadLab)

Source: [NASA OSDR RadLab API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/), 1–8 April 2022 for all three instruments.

| `environment` | Instrument | Measured where | Matches app environment |
|---|---|---|---|
| ISS | ISS DosTel (2 detectors) | Inside the ISS | ISS |
| Lunar | LRO CRaTER | Lunar orbit | Lunar base (the surface gets roughly half the orbital dose) |
| Mars | Curiosity MSL-RAD | Mars surface, Gale crater | Mars transit (transit doses are higher; RadLab has no cruise data) |

- **Method:** for each detector and UTC day, mean `absorbed_dose_rate` (μGy/h) × 24 ÷ 1000 = mGy/day. Incomplete days are dropped, and detectors are averaged per day. Each environment gives `mGy_per_day` (mean of days) and `median_mGy_per_day`.
- **mSv/day:** RadLab publishes no `dose_equivalent_rate` for these instruments, so `mSv_per_day` is `null` and `dose_type` is `"absorbed dose only"`.
- **Absorbed dose (mGy) is not dose equivalent (mSv).** These values compare environments. They cannot be compared directly with the app's mSv reference values or with crew limits.
- **Lunar spike:** CRaTER recorded a solar particle event on 1–3 April 2022, which raises the mean. The median is the better quiet-time figure.

### `space-weather.json`: recent solar activity (DONKI)

Source: NASA DONKI via `api.nasa.gov` (fallback: `kauai.ccmc.gsfc.nasa.gov`), last 60 days.

- **Feeds:** FLR (flares), SEP (solar energetic particles), CME and GST (geomagnetic storms).
- **Events:** each one is simplified to `{type, id, start_time, class_or_intensity, link}`. The file keeps the newest 30 across all feeds.
- **Per-feed metadata:** `feeds[]` gives each feed's source URL (from `manifest.json`), host, `fetched_at` and status. A feed that has never been downloaded is listed as `"missing"`. The top-level `fetched_at` is the oldest feed fetch.

## Other bundled files

| File | Status |
|---|---|
| `data/nasa/inspiration4-baselines.json` | Hand-made placeholder bands (HR/HRV/SpO₂) used by `lib/nasa/loaders.ts`. Not from a NASA download |
| `data/nasa/radlab-sample.json` | Placeholder dose curve used by `lib/nasa/loaders.ts`. Superseded by `radiation-environments.json` |
| `data/nasa/hrp-risks.json` | [NASA HRP human system risks](https://humanresearchroadmap.nasa.gov/) index for the escalation ladder |

## Other references (not downloaded)

| Module | Reference | Notes |
|---|---|---|
| Cytokine context | Inspiration4 publications | "18 markers in 3 days", used in outreach copy only |
| Stool / GI | OSD-630 (Inspiration4 stool) | Validity reference for the Bristol module |
