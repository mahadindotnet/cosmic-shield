# NASA Space Apps submission checklist

Use this when completing the official project page and demo videos.

## Repository

- Public GitHub: [mahadindotnet/cosmic-shield](https://github.com/mahadindotnet/cosmic-shield)
- License: MIT (see [LICENSE](../LICENSE))
- README includes challenge link, tech stack, NASA data usage, run instructions

## NASA data to name on camera (Video 2)

State explicitly that the project uses:

1. **NASA OSDR / Inspiration4** — clinical baseline references for vitals bands  
2. **RadLab** — radiation dose context  
3. **NASA Human Research Program** — risk framework for escalation logic  
4. **OSD-630 (Inspiration4 stool)** — GI / Bristol module reference  

See [nasa-data-sources.md](./nasa-data-sources.md).

## Demo script highlights

- Switch crew members — show different Watch / Nominal states  
- Open escalation ladder — explain rule-based, auditable logic  
- Log behavioral check-in and hydration  
- Run SANS re-capture and Bristol classification  
- Ask mission co-pilot: “What is my escalation status?” and “Summarize radiation”

## Safety language

Always say **decision support**, not diagnosis. Cosmic Shield surfaces countermeasures and flight surgeon escalation — it does not replace medical professionals.

## Reproducibility for judges

```bash
npm install
cp .env.example .env
npm run db:migrate && npm run db:seed
npm run dev
```

Dashboard: `http://localhost:3000/dashboard`
