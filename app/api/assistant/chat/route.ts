import { NextResponse } from "next/server";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { runCopilot, type CopilotPurpose } from "@/lib/ai/agent";
import type { CopilotContext } from "@/lib/ai/copilot-data";
import { getCopilotModel } from "@/lib/ai/provider";
import { CMO_LINE, CRISIS_FOLLOW_UP, crisisResponse, detectCrisis } from "@/lib/ai/safety";
import { getMissionEnvironment, type MissionEnvironmentId } from "@/lib/mission/environments";
import { recordSafetyEscalation } from "@/lib/mind/safety-escalation";
import { withApiUser } from "@/lib/auth/api";
import type { CurrentUser } from "@/lib/auth/dal";
import { findUserByCrewId } from "@/lib/auth/users";

/** Limits on what a client may send. */
const MAX_MESSAGES = 40;
const MAX_QUESTION_CHARS = 1000;
const MAX_BODY_CHARS = 200_000;

/** The co-pilot's mode, for the panel footer (no secrets). */
export async function GET() {
  return withApiUser(() => {
    const { mode, label, fallbackReason } = getCopilotModel();
    return NextResponse.json({ mode, label, fallback: Boolean(fallbackReason) });
  });
}

/**
 * Whose data the tools read. Crew: always themselves (any crewId in the body
 * is ignored). Flight surgeon (view-only): the crew member selected on the
 * Crew admin page, or nobody.
 */
function contextFor(current: CurrentUser, requestedCrewId: unknown): CopilotContext {
  if (current.user.role === "crew") return { viewer: current.user, subject: current.user };
  const target = typeof requestedCrewId === "string" ? findUserByCrewId(requestedCrewId.trim().toUpperCase()) : null;
  return { viewer: current.user, subject: target && target.role === "crew" ? target : null };
}

const textOf = (m: UIMessage) =>
  m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();

export async function POST(req: Request) {
  return withApiUser(async (current) => {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return NextResponse.json({ error: "Conversation too long" }, { status: 413 });
    let body: { id?: unknown; messages?: UIMessage[]; crewId?: unknown; purpose?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    const last = messages.at(-1);
    const question = last && last.role === "user" ? textOf(last) : "";
    if (!question) return NextResponse.json({ error: "Message required" }, { status: 400 });
    if (question.length > MAX_QUESTION_CHARS) return NextResponse.json({ error: "Question too long" }, { status: 400 });

    const ctx = contextFor(current, body.crewId);
    const purpose: CopilotPurpose = body.purpose === "support" ? "support" : "copilot";
    const conversationId = typeof body.id === "string" && body.id.length <= 100 ? body.id : null;
    const userTexts = messages.filter((m) => m.role === "user").map(textOf);

    // Safety first, in every mode: a crisis message never reaches the model.
    const crisis = detectCrisis(question);
    const earlierCrisis = userTexts.slice(0, -1).some((t) => detectCrisis(t).triggered);
    if (crisis.triggered) {
      recordSafetyEscalation(current.user, {
        source: purpose === "support" ? "support_chat" : "copilot_chat",
        conversationId,
        categories: crisis.categories,
        recentMessages: userTexts,
      });
      const env = getMissionEnvironment((current.user.environment as MissionEnvironmentId | null) ?? null);
      const text = earlierCrisis ? CRISIS_FOLLOW_UP : crisisResponse(env ? { name: env.name, commsDelayOneWay: env.commsDelayLabel } : null);
      const stream = createUIMessageStream({
        execute({ writer }) {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: "answer" });
          writer.write({ type: "text-delta", id: "answer", delta: text });
          writer.write({ type: "text-end", id: "answer" });
          writer.write({ type: "finish", messageMetadata: { safety: true } });
        },
        onError: () => `${CMO_LINE}`,
      });
      return createUIMessageStreamResponse({ stream });
    }
    const modelMessages = await convertToModelMessages(
      messages.filter((m) => m.role === "user" || m.role === "assistant"),
      { ignoreIncompleteToolCalls: true },
    );

    const stream = createUIMessageStream({
      async execute({ writer }) {
        writer.write({ type: "start" });
        const run = await runCopilot(ctx, modelMessages, question, (events) => {
          writer.write({ type: "start-step" });
          for (const e of events) {
            writer.write({ type: "tool-input-available", toolCallId: e.toolCallId, toolName: e.toolName, input: e.input });
            writer.write({ type: "tool-output-available", toolCallId: e.toolCallId, output: e.output });
          }
          writer.write({ type: "finish-step" });
        }, purpose);
        // After a crisis earlier in this conversation, every reply keeps the CMO line.
        const answer = earlierCrisis ? `${run.text}\n\n${CMO_LINE}` : run.text;
        writer.write({ type: "start-step" });
        writer.write({ type: "text-start", id: "answer" });
        writer.write({ type: "text-delta", id: "answer", delta: answer });
        writer.write({ type: "text-end", id: "answer" });
        writer.write({ type: "finish-step" });
        writer.write({
          type: "finish",
          messageMetadata: { mode: run.mode, modeLabel: run.modeLabel, blocked: run.blocked, steps: run.steps },
        });
      },
      // Never echo internal errors (they could contain request details).
      onError: () => "The co-pilot couldn't answer just now. Try again in a moment.",
    });
    return createUIMessageStreamResponse({ stream });
  });
}
