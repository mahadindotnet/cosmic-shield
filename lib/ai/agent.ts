import "server-only";
import { generateText, isStepCount, type ModelMessage } from "ai";
import { getEnvironment, type CopilotContext } from "./copilot-data";
import { postCheck } from "./post-check";
import { getCopilotModel, type CopilotMode } from "./provider";
import { buildCopilotTools } from "./tools";

/** Hard limit on model steps per question (tool rounds + the answer). */
export const MAX_STEPS = 6;

export const SYSTEM_PROMPT = `You are the Cosmic Shield mission co-pilot: a decision-support assistant for an astronaut, inside a crew health-monitoring app.

Rules:
- Decision support only. Never diagnose a condition and never prescribe or suggest medication, supplements or doses of any drug. If asked, say you can't, and offer what the data and the rules show instead.
- Every number you write must come from a tool result in this conversation. Call a tool before answering any question about the crew member's data, alerts, environment, space weather or baselines. If a tool says data isn't available, say so; don't estimate.
- Quote the citation from each tool result you rely on, as "Source: ...".
- Statuses (Normal, Watch, Escalate) come only from the rules engine via tools. Don't invent or upgrade a status.
- If no mission environment is chosen (get_environment says so), say so and suggest picking one in the top bar (ISS, Lunar surface, Mars transit or Mars surface).
- Whenever you advise contacting the flight surgeon or the ground, state that environment's one-way comms delay from get_environment or get_guidance.
- Be calm and brief: a few short paragraphs or a short list. Plain language, no jargon without explanation.`;

export interface CopilotToolEvent {
  toolCallId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
}

export interface CopilotRun {
  /** Tool calls in order, with their results. */
  tools: CopilotToolEvent[];
  /** The checked answer (post-check applied). */
  text: string;
  blocked: boolean;
  ungroundedNumbers: string[];
  steps: number;
  mode: CopilotMode;
  modeLabel: string;
}

/** Runs one co-pilot turn: tool loop (max 6 steps), then the server-side post-check. */
export async function runCopilot(
  ctx: CopilotContext,
  messages: ModelMessage[],
  question: string,
  /** Called after each step with that step's tool calls and results (for live tool chips). */
  onToolEvents?: (events: CopilotToolEvent[]) => void,
): Promise<CopilotRun> {
  const { model, mode, label } = getCopilotModel();
  const tools: CopilotToolEvent[] = [];
  const result = await generateText({
    model,
    instructions: SYSTEM_PROMPT,
    messages,
    tools: buildCopilotTools(ctx),
    stopWhen: isStepCount(MAX_STEPS),
    onStepEnd: (step) => {
      const events: CopilotToolEvent[] = step.toolCalls.map((c) => ({
        toolCallId: c.toolCallId,
        toolName: c.toolName,
        input: c.input,
        output: step.toolResults.find((r) => r.toolCallId === c.toolCallId)?.output,
      }));
      tools.push(...events);
      if (events.length) onToolEvents?.(events);
    },
  });

  const env = getEnvironment(ctx).data;
  const text = result.text.trim() || "I couldn't finish that answer within the step limit. Try asking a narrower question.";
  const checked = postCheck({
    text,
    toolOutputs: tools.map((t) => t.output),
    question,
    environment: env.chosen ? { name: env.name, commsDelayOneWay: env.commsDelayOneWay } : null,
  });

  return {
    tools,
    text: checked.text,
    blocked: checked.blocked,
    ungroundedNumbers: checked.ungroundedNumbers,
    steps: result.steps.length,
    mode,
    modeLabel: label,
  };
}
