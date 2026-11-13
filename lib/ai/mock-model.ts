import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4GenerateResult,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import { answer, matchIntent, nextToolCalls, type TurnResults } from "./intents";
import { detectCrisis } from "./safety";
import { reflect, SUPPORT_QUESTIONS, supportFollowUp, supportSummary } from "./support";

/** Marker in the support-mode instructions (lib/ai/support.ts). */
const SUPPORT_MARKER = "SUPPORT CONVERSATION";

/**
 * Offline co-pilot model (AI_PROVIDER=mock, the default). A real AI SDK
 * language model, so it runs through the same generateText tool loop as
 * Claude or Ollama: step 1 matches the question to an intent and asks for the
 * real tools; later steps read the tool results from the prompt and either
 * ask for follow-up tools or fill an answer template. Deterministic, no
 * network, no key.
 */

const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

/** The last user question, the tool results since then, and how many tool calls the conversation already has. */
const textOf = (content: unknown) =>
  (content as { type: string; text?: string }[])
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join(" ");

export function readTurn(prompt: LanguageModelV4Prompt) {
  let lastUser = -1;
  const userTexts: string[] = [];
  let system = "";
  prompt.forEach((m, i) => {
    if (m.role === "user") {
      lastUser = i;
      userTexts.push(textOf(m.content));
    }
    if (m.role === "system") system += m.content;
  });
  const question = lastUser >= 0 ? userTexts.at(-1)! : "";

  const results: TurnResults = {};
  let priorCalls = 0;
  prompt.forEach((m, i) => {
    if (m.role === "assistant") priorCalls += m.content.filter((p) => p.type === "tool-call").length;
    if (m.role !== "tool" || i < lastUser) return;
    for (const part of m.content) {
      if (part.type !== "tool-result") continue;
      const out = part.output;
      const value = out.type === "json" ? out.value : out.type === "text" ? safeJson(out.value) : null;
      if (value && typeof value === "object" && "data" in value && "source" in value)
        (results[part.toolName] ??= []).push(value as TurnResults[string][number]);
    }
  });
  return { question, results, priorCalls, userTexts, support: system.includes(SUPPORT_MARKER) };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * Mind support flow: answer n (1-based) replies to question n (the app asked
 * question 1). Messages that tripped the crisis check never reached the model,
 * so they don't count as answers.
 */
function supportTurn(userTexts: string[], results: TurnResults): { calls: { toolName: string; input: Record<string, unknown> }[]; text: string } {
  const answers = userTexts.filter((t) => !detectCrisis(t).triggered);
  const n = answers.length;
  const last = answers.at(-1) ?? "";
  if (n >= 1 && n < SUPPORT_QUESTIONS.length) {
    return { calls: [], text: `${reflect(SUPPORT_QUESTIONS[n - 1].topic, last)}\n\n${SUPPORT_QUESTIONS[n].question}` };
  }
  if (n === SUPPORT_QUESTIONS.length) {
    if (!results.get_sleep_history)
      return { calls: [{ toolName: "get_sleep_history", input: { days: 7 } }, { toolName: "get_active_alerts", input: {} }], text: "" };
    const sleep = results.get_sleep_history[0]?.data as { available?: boolean; averageSleepHours?: number | null; nights?: unknown[] } | undefined;
    const alerts = results.get_active_alerts?.[0]?.data as { alerts?: { ruleId: string }[] } | undefined;
    return {
      calls: [],
      text: `${reflect("mood", last)}\n\n${supportSummary({
        answers,
        sleep: sleep?.available ? { averageSleepHours: sleep.averageSleepHours ?? null, nights: sleep.nights?.length ?? 0 } : null,
        mindPatternWatch: Boolean(alerts?.alerts?.some((a) => a.ruleId === "mind_pattern")),
      })}`,
    };
  }
  return { calls: [], text: supportFollowUp(last) };
}

export function mockGenerate(options: LanguageModelV4CallOptions): LanguageModelV4GenerateResult {
  const { question, results, priorCalls, userTexts, support } = readTurn(options.prompt);
  const available = new Set((options.tools ?? []).map((t) => t.name));
  if (support) {
    const turn = supportTurn(userTexts, results);
    const calls = turn.calls.filter((c) => available.has(c.toolName));
    return {
      content: calls.length
        ? calls.map((c, i) => ({ type: "tool-call", toolCallId: `mock_${priorCalls + i + 1}`, toolName: c.toolName, input: JSON.stringify(c.input) }))
        : [{ type: "text", text: turn.text }],
      finishReason: { unified: calls.length ? "tool-calls" : "stop", raw: undefined },
      usage: USAGE,
      warnings: [],
    };
  }
  const intent = matchIntent(question);
  const calls = (nextToolCalls(intent, question, results) ?? []).filter((c) => available.has(c.toolName));

  const content: LanguageModelV4Content[] = calls.length
    ? calls.map((c, i) => ({ type: "tool-call", toolCallId: `mock_${priorCalls + i + 1}`, toolName: c.toolName, input: JSON.stringify(c.input) }))
    : [{ type: "text", text: answer(intent, results) }];

  return {
    content,
    finishReason: { unified: calls.length ? "tool-calls" : "stop", raw: undefined },
    usage: USAGE,
    warnings: [],
  };
}

export function createMockCopilotModel(): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: "cosmic-shield",
    modelId: "offline-mock",
    supportedUrls: {},
    async doGenerate(options) {
      return mockGenerate(options);
    },
    async doStream(options) {
      const r = mockGenerate(options);
      const parts: LanguageModelV4StreamPart[] = [];
      for (const c of r.content) {
        if (c.type === "text") parts.push({ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: c.text }, { type: "text-end", id: "t" });
        if (c.type === "tool-call") parts.push(c);
      }
      parts.push({ type: "finish", finishReason: r.finishReason, usage: r.usage });
      return {
        stream: new ReadableStream<LanguageModelV4StreamPart>({
          start(controller) {
            for (const p of parts) controller.enqueue(p);
            controller.close();
          },
        }),
      };
    },
  };
}
