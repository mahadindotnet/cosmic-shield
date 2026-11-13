# Intelligent systems in Cosmic Shield

NASA Space Apps projects that use AI should describe **what runs in the product** and how it is used safely. This document covers in-app intelligent features only.

## Mission co-pilot

- **Location:** floating button and "Ask co-pilot" → chat panel → `/api/assistant/chat`
- **Behavior:** answers questions about the crew member's alerts, vitals, sleep, radiation dose, space weather, mission environment and OSD-575 baselines.
- **Grounding:** eight read-only tools with cited sources; offline deterministic mode by default (`AI_PROVIDER=mock`), Claude or Ollama optional.
- **Safety:** decision support only; a server-side post-check blocks diagnosis and prescription language. Full details: [ai-disclosure.md](./ai-disclosure.md).

## Vision-assisted modules

| Module | Endpoint | Output |
|--------|----------|--------|
| Bristol stool classification | `POST /api/vision/bristol` | Bristol type 1–7, status hint for GI monitoring |
| SANS ocular screening | `POST /api/vision/sans` | Confidence score, nominal / watch / escalate band |

Hackathon builds use **deterministic prototype classifiers** so judges can reproduce results offline. Production deployments would attach trained models (e.g. ONNX) to the same API contract.

## Rules engine (primary “intelligence” for judges)

Most escalation logic is **explicit and auditable**:

- Thresholds in `data/rules/thresholds.json`
- Evaluation in `lib/rules/engine.ts`
- Evidence JSON stored with escalation events

This supports **Validity** scoring: reviewers can see why a crew member entered Watch or Escalate.

## Disclaimer

Cosmic Shield is a **prototype** for education and challenge demonstration. It is not cleared for clinical use in space or on Earth.
