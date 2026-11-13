"use client";

import { ArrowUp } from "lucide-react";
import { useMissionStore } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";

export const CHOOSE_ENVIRONMENT_TEXT = "Choose your mission environment in the top bar to see your projected dose";

/**
 * Empty state wherever a value depends on the mission environment. The
 * "Show me" button scrolls to the top and makes the top-bar environment
 * buttons pulse, with focus on the first one.
 */
export function ChooseEnvironmentPrompt({
  text = CHOOSE_ENVIRONMENT_TEXT,
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      data-testid="choose-env-prompt"
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-dashed border-primary/35 bg-primary/5 px-3 py-2", className)}
    >
      <p className="min-w-0 flex-1 text-xs text-foreground">{text}</p>
      <ShowEnvironmentButton />
    </div>
  );
}

/** "↑ Show me": scrolls up and highlights the top-bar environment buttons. */
export function ShowEnvironmentButton() {
  const highlightPicker = useMissionStore((s) => s.highlightPicker);
  return (
      <button
        type="button"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          highlightPicker();
        }}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        data-testid="choose-env-show"
      >
        <ArrowUp className="size-3.5" aria-hidden="true" />
        Show me
      </button>
  );
}
