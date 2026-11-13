import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4GenerateResult,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import { answer, matchIntent, nextToolCalls, type TurnResults } from "./intents";

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
export function readTurn(prompt: LanguageModelV4Prompt) {
  let lastUser = -1;
  prompt.forEach((m, i) => {
    if (m.role === "user") lastUser = i;
  });
  const question =
    lastUser >= 0
      ? (prompt[lastUser].content as { type: string; text?: string }[])
          .filter((p) => p.type === "text")
          .map((p) => p.text ?? "")
          .join(" ")
      : "";

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
  return { question, results, priorCalls };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function mockGenerate(options: LanguageModelV4CallOptions): LanguageModelV4GenerateResult {
  const { question, results, priorCalls } = readTurn(options.prompt);
  const intent = matchIntent(question);
  const available = new Set((options.tools ?? []).map((t) => t.name));
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
