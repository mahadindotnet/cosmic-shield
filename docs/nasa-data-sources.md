# NASA data sources (Cosmic Shield)

Cosmic Shield uses **NASA open and published references** as threshold and validity inputs. The hackathon demo ships **static slices** under `data/nasa/` so judges can reproduce the build offline.

| Module | Reference | Notes |
|--------|-----------|--------|
| Vitals baselines | [NASA OSDR / Inspiration4](https://www.nasa.gov/mission/station/research/science-360/inspiration4/) | Processed clinical panel bands for HR/HRV/SpO₂ narrative |
| Cytokine context | Inspiration4 publications | “18 markers in 3 days” used in outreach copy only |
| Radiation | [RadLab](https://radlab.nasa.gov/) | Sample daily dose curve in `radlab-sample.json` |
| Risk framework | [NASA HRP human system risks](https://humanresearchroadmap.nasa.gov/) | Escalation ladder mapping |
| Stool / GI | OSD-630 (Inspiration4 stool) | Bristol module validity reference |

Replace static JSON with downloaded datasets before final submission and name them explicitly in Video 2.
