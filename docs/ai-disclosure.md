# AI disclosure: the mission co-pilot

Cosmic Shield has one AI feature in the product: the **mission co-pilot**, a chat panel that answers an astronaut's questions about their own logged data. This page says what it is, what it can and can't do, and how it is kept safe. The vision modules (Bristol, SANS) are not AI models; see [intelligent-systems.md](./intelligent-systems.md).

## What it is

- **Opened from:** the round floating button (bottom right), and "Ask co-pilot" on the early-warning card (which pre-fills "Why am I seeing this warning?").
- **Built with:** the Vercel AI SDK (`ai`) tool-calling loop, behind `POST /api/assistant/chat`.
- **Read-only:** it can't log, change or delete anything.
- **Decision support, not a diagnosis.** The panel footer says so on every screen, together with the mode in use.

## Which model answers

Set by `AI_PROVIDER` in `.env`:

| `AI_PROVIDER` | What answers | Needs |
|---|---|---|
| `mock` (default) | **No AI model.** A deterministic offline model: it matches the question to an intent ("why am I on watch", "radiation", "how did I sleep", "what should I do", "space weather", "what is my baseline", and a few more), calls the real tools, and fills a fixed answer template with their results. Same input, same answer. | Nothing; works offline |
| `anthropic` | Claude through the AI SDK's Anthropic provider. Default model `claude-opus-5-5` (override with `ANTHROPIC_MODEL`). | `ANTHROPIC_API_KEY` |
| `ollama` | A local open-weights model through Ollama's OpenAI-compatible API (`OLLAMA_BASE_URL`, default `http://127.0.0.1:11434/v1`; `OLLAMA_MODEL`, default `llama3.1`). Runs on the crew's own machine. | A running Ollama server |

If `anthropic` is chosen without a key, or the value is unknown, the co-pilot falls back to `mock` and the footer says the provider isn't configured. The footer always shows the mode, e.g. "Mode: offline (mock)". The automated tests always run in `mock` mode.

**What leaves the machine:** only in `anthropic` mode. The question, the conversation so far and the tool results (the crew member's own logged values for the tools the model called) are sent to Anthropic's API. In `mock` and `ollama` modes nothing leaves the machine except the existing NASA DONKI request. API keys are read on the server only and are never sent to the browser or logged.

## Tools (all read-only, all cited)

Every tool reads only one crew member: the signed-in crew member, or, for the flight surgeon (view-only), the crew member selected on the Crew admin page. **No tool takes a crew ID**, so the model can't ask for anyone else's data. Every result is `{ data, source }`, and the source is shown on the tool chip, e.g. "Checked radiation status · NASA RadLab".

| Tool | Returns | Source |
|---|---|---|
| `get_latest_vitals` | Latest reading, each measure's status and reason | Rules engine; WHO / ADA / AHA citations for any Escalate limit crossed |
| `get_sleep_history(days)` | Nights (sleep, HRV, stress), averages, latest night's status | Rules engine |
| `get_radiation_status` | Career total (sum of dose entries), % of 600 mSv, latest reading, projected mission dose | NASA-STD-3001; the environment's dose source (NASA RadLab or the cited paper) |
| `get_space_weather` | NASA DONKI feeds and recent events, live or cached | NASA DONKI |
| `get_environment` | Comms delay, gravity, typical dose, mission length, shelter procedure; or "none chosen" | NASA fact sheets, environment sources |
| `get_active_alerts` | Every Watch / Escalate from the rules engine, including `hrv_sleep_decline` with its per-night numbers, plus open escalation records | Rules engine; NASA Human Research Roadmap (sleep risk) |
| `get_reference_baseline(indicator)` | Inspiration4 pre-flight range for glucose, calcium, sodium, potassium, BUN or creatinine | NASA OSDR OSD-575 |
| `get_guidance(ruleId)` | Non-diagnostic steps for a rule, when to contact the ground, and the comms delay | The rule's citation |

Statuses come only from the deterministic rules engine ([rules.md](./rules.md)); the co-pilot explains them but never sets or changes one.

## Mind support conversation

The "Talk it through" card on the Mind page uses the same co-pilot (same route, tools, providers, step limit and post-check) with `purpose: "support"`, in its own conversation.

- **Structure:** the app asks about sleep first; then, one short question at a time, workload, feeling connected to crew and family, and mood. Each answer gets a brief, kind reflection. After the fourth answer it looks up sleep history and active alerts and summarises with simple coping steps only: rest, slow breathing, talking to a crewmate, contacting family, asking for a workload adjustment.
- **Mock mode:** reflections come from a small positive/negative word list (with "not good"-style negation). If the tone is mixed or unclear it says "Thanks for telling me…" rather than guessing.
- **Claude / Ollama:** get the same structure and rules as extra instructions (`lib/ai/support.ts`).
- **Never** diagnoses, uses clinical labels (the post-check blocks words such as depression, anxiety disorder, PTSD, burnout syndrome or insomnia in support replies and replaces the reply with a safe one) or mentions medication.
- An always-visible line under the chat and at the bottom of the Mind page: "If you feel unsafe or unable to cope, contact your Crew Medical Officer now."

## Crisis safety check

`lib/ai/safety.ts` runs on the server **before any model**, on every co-pilot message (floating panel and Mind page) and on every check-in note, in every mode including offline mock.

- **What it looks for:** phrases about hopelessness, self-harm, wanting to die or feeling unable to cope ("I feel hopeless", "I can't cope anymore", "I want to hurt myself"…), with curly apostrophes normalised. It is tested against everyday phrases that must not trigger ("I'm dying to see my family", "the battery is dead", "I could kill for a pizza").
- **What happens:** the normal flow stops and no model is called. The reply is short and warm: it acknowledges the feeling, says they're not alone, gives the steps (Crew Medical Officer now; then the flight surgeon or ground behavioural health support, with that environment's comms delay) and offers to stay in the conversation. Later messages in the same conversation get a shorter reminder plus the CMO line instead of the full block; normal replies after it keep the CMO line at the end.
- **Escalation record:** a `mind_safety` row in `escalation` with the source (support chat, co-pilot chat or check-in note), the categories matched and the crew member's last few messages (each clipped to 500 characters). One open record per conversation: later triggering messages are added to it.

**Limits, plainly:** this is simple phrase matching. It can miss messages (other wording, sarcasm, other languages, typos) and can occasionally trigger on a phrase that wasn't meant that way. It is **not a clinical tool** and has not been clinically reviewed or validated. A real deployment would need clinical review of the wording and responses, and a validated screening approach. It is an extra safety net, not a replacement for the Crew Medical Officer or the flight surgeon.

## Privacy

- Co-pilot and support conversations are **not stored on the server**; they live in the browser tab and disappear when it is closed or cleared.
- The one exception is a safety escalation: its record holds the excerpt of the crew member's own recent messages, so the flight surgeon can follow up.
- The flight surgeon sees check-in **scores** and pattern status, and every escalation record, on Crew admin. Check-in notes stay private to the crew member (a note that triggered the safety check appears only inside that escalation record).
- Escalation evidence (including excerpts) is readable only with the flight surgeon role (`escalationsForReview`, `mindSummaryForReview` return 403 for anyone else). Crew can never see another crew member's records; their own co-pilot only sees the generic reason line of their own records, never an excerpt.

## Rules the co-pilot follows

Given to the model as instructions (`lib/ai/agent.ts`), and built into the mock's templates:

1. Decision support only: never diagnose a condition, never prescribe or suggest medication.
2. Every number must come from a tool result; call a tool before answering about data.
3. Quote the citation of each tool result relied on ("Source: …").
4. If no mission environment is chosen, say so and suggest picking one in the top bar.
5. When advising contact with the ground, state that environment's comms delay.
6. At most 6 model steps per question.

## Server-side post-check

The model's instructions are not trusted alone. Every answer, from any provider, passes `lib/ai/post-check.ts` before it reaches the screen (the answer is only sent once it has been checked):

- **Diagnosis or prescription language is blocked.** Phrases such as "you have …(condition)", "this indicates …", "my diagnosis is …", "take 3 mg …", "try melatonin" or "prescribe" replace the whole answer with a safe fallback ("I can't give a diagnosis or recommend medication…") plus how to reach the flight surgeon and the comms delay.
- **Grounding:** every number in the answer must match a number in that turn's tool results (or the question). Unmatched numbers are listed in a visible note under the answer.
- **Comms delay:** if the answer mentions contacting the flight surgeon or the ground without the delay, the delay is appended (or "no environment chosen, pick one in the top bar").

## Limits

- Pattern-based checks can miss unusual phrasing; the deterministic mock mode is the default for that reason, and the post-check is tested with examples in `lib/ai/post-check.test.ts`.
- Claude and Ollama answers vary between runs; the tools, statuses and citations they rely on do not.
- The co-pilot does not replace the Crew Medical Officer or the flight surgeon, and every screen says so.

## Tests

- Unit: `lib/ai/safety.test.ts` (crisis phrases that must and must not trigger, the caring responses), `lib/ai/support.test.ts` (tone, neutral reflections, summary, clinical-label blocking), `lib/mind/mind-db.test.ts` (note escalations, de-duplication per conversation, flight-surgeon-only evidence, notes hidden from the flight surgeon, the full offline support conversation), `lib/ai/intents.test.ts` (intent matcher, tool plans, templates), `lib/ai/post-check.test.ts` (blocking, grounding, comms delay), `lib/ai/copilot-data.test.ts` (data isolation between crew members, flight-surgeon scoping, the full offline tool loop against a real SQLite database).
- Playwright (mock mode): `e2e/early-warning.spec.ts` (CS-003 asks "Why am I seeing this warning?" from the card; the answer names `hrv_sleep_decline` and the HRV % drop, with tool chips) `e2e/copilot.spec.ts` (CS-001 picks ISS and asks about radiation; the answer gives their career total and "600 mSv") and `e2e/mind.spec.ts` (CS-002 writes "I feel hopeless and I can't cope anymore" in the support chat: the caring response appears, a second message gets the short reminder, FS-001 sees the escalation with the excerpt, CS-001 can't reach it).
