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
| Bristol stool classification | `POST /api/vision/bristol` | Prototype stub: always "Not analysed: prototype", never a type or a status. The crew member confirms the Bristol type manually; photos are stored privately with metadata removed (see rules.md → GI). |
| Fundus (SANS) photo | `POST /api/vision/sans` | Prototype stub: always "Not analysed: prototype", never a finding, confidence or status. The crew member can flag a photo for ground review (an escalation record for the flight surgeon). See rules.md → Eyes. |

Both are **prototype stubs**: no model is connected, so they never analyse an image or produce a status. Photos are still stored securely (metadata removed, owner and flight surgeon only), so a trained model could later be attached to the same API contract.

## Rules engine (primary “intelligence” for judges)

Most escalation logic is **explicit and auditable**:

- Thresholds in `data/rules/thresholds.json`
- Evaluation in `lib/rules/engine.ts`
- Evidence JSON stored with escalation events

This supports **Validity** scoring: reviewers can see why a crew member entered Watch or Escalate.

## Disclaimer

Cosmic Shield is a **prototype** for education and challenge demonstration. It is not cleared for clinical use in space or on Earth.
