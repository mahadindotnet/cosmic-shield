# NASA Space Apps submission checklist

Use this when completing the official project page and demo videos.

## Repository

- Public GitHub: [mahadindotnet/cosmic-shield](https://github.com/mahadindotnet/cosmic-shield)
- Licence: MIT (see [LICENSE](../LICENSE)); photos are under their own licences (README → Image credits)
- README: challenge link, features, quick start, demo accounts, tests, NASA data, AI use and limits

## NASA data to name on camera

1. **NASA OSDR OSD-575 (Inspiration4 metabolic panel)**: the glucose crew reference band on Vitals; baselines in the co-pilot.
2. **NASA OSDR RadLab** (ISS ALTEA and DOSIS, LRO CRaTER, MSL-RAD): daily dose per mission environment.
3. **NASA DONKI**: recent solar flares, particle events, CMEs and geomagnetic storms.
4. **NASA Human Research Program**: the sleep and SANS risks, explaining why sleep and eyes are monitored.
5. **NASA-STD-3001**: the 600 mSv career dose limit.
6. **NASA "Astronaut Exercise" page and NASA nutrition requirements (Smith et al. 2021)**: ISS exercise, calcium and vitamin D targets.

See [nasa-data-sources.md](./nasa-data-sources.md) and [REFERENCES.md](./REFERENCES.md).

## Demo script highlights

- Sign in as CS-003, pick an environment: the early-warning card (HRV and sleep decline) and "Ask co-pilot: why am I seeing this warning?".
- Log vitals with SpO₂ 88 %: Escalate, remeasure guidance, the flight surgeon is told.
- Take the Amsler test with a few squares marked: Watch and the bell.
- Log a GI entry with a photo: stored as "Not analysed: prototype".
- Sign in as FS-001: Crew admin shows every crew member's latest readings, alerts and escalation records.

## Safety language

Always say **decision support**, not diagnosis. Image analysis is a **prototype** and does not analyse images. Cosmic Shield surfaces countermeasures and flight-surgeon escalation; it does not replace medical professionals.

## Reproducibility for judges

```bash
npm install
npm run setup
npm run dev
```

Then open http://localhost:3000.
