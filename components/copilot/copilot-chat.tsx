"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { HeartHandshake, Loader2, SendHorizontal, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CMO_LINE } from "@/lib/ai/safety";
import { TOOL_LABELS } from "@/lib/ai/tool-labels";
import { cn } from "@/lib/utils";

const API = "/api/assistant/chat";
export type ChatPurpose = "copilot" | "support";

/**
 * Sends the conversation, its purpose, and, for a flight surgeon on the Crew
 * admin page, the crew member selected there (?crew=). The server ignores
 * crewId for crew members.
 */
const transports: Record<ChatPurpose, DefaultChatTransport<UIMessage>> = {
  copilot: makeTransport("copilot"),
  support: makeTransport("support"),
};
function makeTransport(purpose: ChatPurpose) {
  return new DefaultChatTransport<UIMessage>({
    api: API,
    prepareSendMessagesRequest: ({ id, messages }) => ({
      body: {
        id,
        purpose,
        messages,
        crewId: window.location.pathname.startsWith("/dashboard/admin") ? new URLSearchParams(window.location.search).get("crew") : null,
      },
    }),
  });
}

type Mode = { mode: string; label: string; fallback: boolean };
let modeCache: Promise<Mode | null> | null = null;
const loadMode = () => (modeCache ??= fetch(API).then((r) => (r.ok ? r.json() : null)).catch(() => null));

export interface CopilotChatProps {
  purpose: ChatPurpose;
  /** useChat id: separate conversations for the floating co-pilot and the Mind page. */
  chatId: string;
  /** Opening message shown before the first reply (not sent to the server). */
  intro?: string;
  suggestions?: readonly string[];
  /** Controlled input (the floating panel pre-fills it); uncontrolled when omitted. */
  draft?: string;
  setDraft?: (v: string) => void;
  /** Show the always-visible CMO safety line under the input. */
  safetyLine?: boolean;
  placeholder?: string;
  autoFocusRef?: React.Ref<HTMLTextAreaElement>;
  className?: string;
  testId?: string;
}

/** Chat body: messages with tool chips, input, and the mode footer. */
export function CopilotChat({
  purpose,
  chatId,
  intro,
  suggestions = [],
  draft: draftProp,
  setDraft: setDraftProp,
  safetyLine,
  placeholder = "Ask about your data…",
  autoFocusRef,
  className,
  testId = "copilot-chat",
}: CopilotChatProps) {
  const { messages, sendMessage, status, error, setMessages } = useChat({ id: chatId, transport: transports[purpose] });
  const [localDraft, setLocalDraft] = useState("");
  const draft = draftProp ?? localDraft;
  const setDraft = setDraftProp ?? setLocalDraft;
  const [mode, setMode] = useState<Mode | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    let cancelled = false;
    void loadMode().then((m) => {
      if (!cancelled && m) setMode(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, status]);

  function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setDraft("");
    void sendMessage({ text: q });
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)} data-testid={testId}>
      <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite" data-testid="copilot-messages">
        {intro && (
          <div className="mb-4 max-w-full rounded-2xl rounded-bl-sm border border-border/70 bg-background/40 px-3 py-2.5 text-sm text-foreground" data-testid="copilot-intro">
            {intro}
          </div>
        )}
        {messages.length === 0 && suggestions.length > 0 && (
          <div className="flex flex-col gap-3">
            {!intro && <p className="text-sm text-foreground">Ask about your alerts, sleep, radiation dose, vitals, space weather or reference baselines.</p>}
            <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
              {suggestions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    data-testid="copilot-suggestion"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="flex flex-col gap-4">
          {messages.map((m) => (
            <li key={m.id} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
              {m.role === "user" ? (
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/15 px-3 py-2 text-sm text-foreground" data-testid="copilot-question">
                  {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
                </p>
              ) : (
                <AssistantMessage message={m} />
              )}
            </li>
          ))}
        </ol>

        {status === "submitted" && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> {purpose === "support" ? "Thinking…" : "Checking your data…"}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs text-escalate-foreground">
            The co-pilot couldn&apos;t answer just now. Try again in a moment.
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex flex-col gap-2 border-t border-border/70 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor={`${chatId}-input`} className="sr-only">
            {purpose === "support" ? "Your reply" : "Ask the co-pilot"}
          </label>
          <textarea
            id={`${chatId}-input`}
            ref={autoFocusRef}
            rows={2}
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder={placeholder}
            className="min-h-10 flex-1 resize-none rounded-lg border border-input bg-input/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            data-testid="copilot-input"
          />
          <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="Send" data-testid="copilot-send">
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
          </Button>
          {messages.length > 0 && (
            <Button type="button" variant="ghost" size="icon" aria-label="Clear conversation" onClick={() => setMessages([])} disabled={busy}>
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
        {safetyLine && <SafetyLine />}
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground" data-testid="copilot-footer">
          <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          Decision support, not a diagnosis · Mode: {mode ? mode.label : "…"}
          {mode?.fallback ? " (provider not configured)" : ""}
        </p>
      </form>
    </div>
  );
}

/** The calm, always-visible line on the Mind page and in the support chat. */
export function SafetyLine({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-xs text-foreground/90", className)} data-testid="mind-safety-line">
      <HeartHandshake className="mt-px size-3.5 shrink-0 text-primary" aria-hidden="true" />
      {CMO_LINE}
    </p>
  );
}

interface ToolOutput {
  source?: { label?: string };
}

/** Tool chips in call order, then the checked answer. */
function AssistantMessage({ message }: { message: UIMessage }) {
  const tools = message.parts.filter(isToolUIPart);
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
  const safety = Boolean((message.metadata as { safety?: boolean } | undefined)?.safety);
  return (
    <div className="flex w-full flex-col gap-2">
      {tools.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tools used">
          {tools.map((t) => {
            const name = getToolName(t);
            const source = t.state === "output-available" ? (t.output as ToolOutput | undefined)?.source?.label : undefined;
            return (
              <li
                key={t.toolCallId}
                data-testid="copilot-tool-chip"
                data-tool={name}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                <Wrench className="size-3 text-primary" aria-hidden="true" />
                {TOOL_LABELS[name] ?? name}
                {source ? <span className="text-foreground/80"> · {source}</span> : null}
              </li>
            );
          })}
        </ul>
      )}
      {text && <FormattedAnswer text={text} safety={safety} />}
    </div>
  );
}

/** Plain-text answer: paragraphs, "- " list items, and muted "Source:" lines. */
export function FormattedAnswer({ text, safety, testId = "copilot-answer" }: { text: string; safety?: boolean; testId?: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length)
      blocks.push(
        <ul key={`l${blocks.length}`} className="ml-4 list-disc space-y-0.5">
          {list.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>,
      );
    list = [];
  };
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.startsWith("- ")) {
      list.push(t.slice(2));
      continue;
    }
    flush();
    if (!t) continue;
    blocks.push(
      <p key={`p${blocks.length}`} className={cn(t.startsWith("Source:") || t.startsWith("Note:") ? "text-[11px] text-muted-foreground" : undefined)}>
        {t}
      </p>,
    );
  }
  flush();
  return (
    <div
      className={cn(
        "flex max-w-full flex-col gap-2 rounded-2xl rounded-bl-sm border px-3 py-2.5 text-sm text-foreground",
        // Calm, not alarming: the brand violet, never the Escalate red.
        safety ? "border-nebula/45 bg-nebula/10" : "border-border/70 bg-background/40",
      )}
      data-testid={testId}
      data-safety={safety || undefined}
    >
      {blocks}
    </div>
  );
}
