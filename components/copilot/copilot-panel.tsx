"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { Loader2, SendHorizontal, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CopilotMark } from "@/components/cosmic-shield/logo";
import { SUGGESTED_QUESTIONS, TOOL_LABELS } from "@/lib/ai/tool-labels";
import { useCopilotStore } from "@/lib/store/copilot-store";
import { cn } from "@/lib/utils";

const API = "/api/assistant/chat";

/**
 * Sends the conversation plus, for a flight surgeon on the Crew admin page,
 * the crew member selected there (?crew=). The server ignores crewId for crew.
 */
const transport = new DefaultChatTransport<UIMessage>({
  api: API,
  prepareSendMessagesRequest: ({ id, messages }) => ({
    body: {
      id,
      messages,
      crewId: window.location.pathname.startsWith("/dashboard/admin") ? new URLSearchParams(window.location.search).get("crew") : null,
    },
  }),
});

type Mode = { mode: string; label: string; fallback: boolean };

/** The AI co-pilot chat, opened from the floating button or any "Ask co-pilot" button. */
export function CopilotPanel() {
  const { open, setOpen, draft, setDraft } = useCopilotStore();
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport });
  const [mode, setMode] = useState<Mode | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  // The footer shows the provider mode (fetched once, on first open).
  useEffect(() => {
    if (!open || mode) return;
    let cancelled = false;
    fetch(API)
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Mode | null) => {
        if (!cancelled && m) setMode(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setDraft("");
    void sendMessage({ text: q });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="glass-strong w-full gap-0 border-l border-(--glass-border) p-0 backdrop-blur-(--glass-blur) sm:max-w-md"
        data-testid="copilot-panel"
        initialFocus={inputRef}
      >
        <SheetHeader className="flex-row items-center gap-3 border-b border-border/70 px-4 py-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,oklch(0.3_0.07_250),oklch(0.16_0.04_262))] ring-1 ring-primary/40">
            <CopilotMark className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="font-heading text-base">Mission co-pilot</SheetTitle>
            <SheetDescription className="text-xs">Answers from your logged data and cited references.</SheetDescription>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon-sm" aria-label="Clear conversation" onClick={() => setMessages([])} disabled={busy}>
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite" data-testid="copilot-messages">
          {messages.length === 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground">Ask about your alerts, sleep, radiation dose, vitals, space weather or reference baselines.</p>
              <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
                {SUGGESTED_QUESTIONS.map((q) => (
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
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Checking your data…
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
            <label htmlFor="copilot-input" className="sr-only">
              Ask the co-pilot
            </label>
            <textarea
              id="copilot-input"
              ref={inputRef}
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
              placeholder="Ask about your data…"
              className="min-h-10 flex-1 resize-none rounded-lg border border-input bg-input/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              data-testid="copilot-input"
            />
            <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="Send" data-testid="copilot-send">
              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground" data-testid="copilot-footer">
            <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            Decision support, not a diagnosis · Mode: {mode ? mode.label : "…"}
            {mode?.fallback ? " (provider not configured)" : ""}
          </p>
        </form>
      </SheetContent>
    </Sheet>
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
      {text && <FormattedAnswer text={text} />}
    </div>
  );
}

/** Plain-text answer: paragraphs, "- " list items, and muted "Source:" lines. */
function FormattedAnswer({ text }: { text: string }) {
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
    <div className="flex max-w-full flex-col gap-2 rounded-2xl rounded-bl-sm border border-border/70 bg-background/40 px-3 py-2.5 text-sm text-foreground" data-testid="copilot-answer">
      {blocks}
    </div>
  );
}
