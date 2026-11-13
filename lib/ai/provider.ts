import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { createMockCopilotModel } from "./mock-model";

export type CopilotMode = "mock" | "anthropic" | "ollama";

export interface CopilotModel {
  model: LanguageModel;
  mode: CopilotMode;
  /** Footer text, e.g. "offline (mock)". */
  label: string;
  /** Set when the configured provider couldn't be used and the mock took over. */
  fallbackReason?: string;
}

/** Default Claude model for AI_PROVIDER=anthropic (override with ANTHROPIC_MODEL). */
export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

/**
 * The co-pilot's language model, chosen by AI_PROVIDER in .env:
 *   mock (default)  offline, deterministic, no key
 *   anthropic       Claude via the AI SDK Anthropic provider (ANTHROPIC_API_KEY)
 *   ollama          a local model through Ollama's OpenAI-compatible API
 * Keys are read here only and never returned or logged.
 */
export function getCopilotModel(env: NodeJS.ProcessEnv = process.env): CopilotModel {
  const mock = (fallbackReason?: string): CopilotModel => ({
    model: createMockCopilotModel(),
    mode: "mock",
    label: "offline (mock)",
    fallbackReason,
  });
  const provider = (env.AI_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "anthropic") {
    const apiKey = env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) return mock("AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set");
    const modelId = env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
    return { model: createAnthropic({ apiKey })(modelId), mode: "anthropic", label: `Claude (${modelId})` };
  }

  if (provider === "ollama") {
    const baseURL = env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434/v1";
    const modelId = env.OLLAMA_MODEL?.trim() || "llama3.1";
    const ollama = createOpenAICompatible({ name: "ollama", baseURL });
    return { model: ollama.chatModel(modelId), mode: "ollama", label: `local (Ollama ${modelId})` };
  }

  return mock(provider === "mock" ? undefined : `Unknown AI_PROVIDER "${provider}"`);
}
