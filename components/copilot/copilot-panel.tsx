"use client";

import { useRef } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CopilotMark } from "@/components/cosmic-shield/logo";
import { SUGGESTED_QUESTIONS } from "@/lib/ai/tool-labels";
import { useCopilotStore } from "@/lib/store/copilot-store";
import { CopilotChat } from "./copilot-chat";

/** The AI co-pilot chat, opened from the floating button or any "Ask co-pilot" button. */
export function CopilotPanel() {
  const { open, setOpen, draft, setDraft } = useCopilotStore();
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        </SheetHeader>
        <CopilotChat
          purpose="copilot"
          chatId="copilot"
          suggestions={SUGGESTED_QUESTIONS}
          draft={draft}
          setDraft={setDraft}
          autoFocusRef={inputRef}
        />
      </SheetContent>
    </Sheet>
  );
}
