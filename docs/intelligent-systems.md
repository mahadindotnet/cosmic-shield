# Intelligent systems in Cosmic Shield

NASA Space Apps projects that use AI should describe **what runs in the product** and how it is used safely. This document covers in-app intelligent features only.

## Mission co-pilot

- **Location:** Dashboard drawer → `/api/assistant/chat`
- **Behavior:** Responds to astronaut questions about vitals, escalation level, and radiation exposure.
- **Grounding:** Before answering, the service reads current mission state via internal tools (`getCrewVitals`, `getEscalation`, `getRadiationSummary`).
- **Safety:** Responses use decision-support language only. The co-pilot does not diagnose conditions or prescribe medication.

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
