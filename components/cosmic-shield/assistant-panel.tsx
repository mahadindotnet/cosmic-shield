"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = { role: "user" | "assistant"; text: string; tools?: string[] };

export function AssistantPanel({ crewId }: { crewId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Cosmic Shield co-pilot online. Ask for vitals summary, escalation status, or radiation context. Decision support only — not a diagnosis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId, message: text }),
      });
      const data = (await res.json()) as { reply: string; toolsUsed?: string[] };
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.reply, tools: data.toolsUsed },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-md border px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "border-zinc-700 bg-zinc-900/80 ml-6"
                  : "border-cyan-900/50 bg-cyan-950/20 mr-6 font-mono text-zinc-200"
              }`}
            >
              {m.text}
              {m.tools?.length ? (
                <div className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">
                  tools: {m.tools.join(", ")}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex gap-2 border-t border-zinc-800 p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask co-pilot…"
          onKeyDown={(e) => e.key === "Enter" && void send()}
        />
        <Button onClick={() => void send()} disabled={busy}>
          Send
        </Button>
      </div>
    </div>
  );
}
