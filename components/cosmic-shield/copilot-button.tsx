"use client";

import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopilotMark } from "@/components/cosmic-shield/logo";
import { cn } from "@/lib/utils";

/** Placeholder until the AI co-pilot exists (shared by every "Ask co-pilot" entry point). */
export function showCopilotComingSoon() {
  toast("AI co-pilot is coming soon", {
    description: "It will answer questions about your readings and onboard guidance. It won't diagnose.",
  });
}

/** Hover text: what the co-pilot does, in a few words. */
export const COPILOT_HINT = "Ask your mission co-pilot";

/**
 * Round floating button (bottom-right) that opens the AI co-pilot. Until the
 * agent exists, pass nothing and it shows a "coming soon" notice; later pass
 * `onOpen` to open the agent panel.
 */
export function CopilotButton({ onOpen, className }: { onOpen?: () => void; className?: string }) {
  function open() {
    if (onOpen) return onOpen();
    showCopilotComingSoon();
  }

  return (
    <div className={cn("fixed right-5 bottom-5 z-40 md:right-7 md:bottom-7", className)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={open}
              aria-label={`${COPILOT_HINT} (AI co-pilot)`}
              data-testid="copilot-button"
              className="group relative flex size-15 items-center justify-center rounded-full motion-safe:animate-[holo-float_5s_ease-in-out_infinite] focus-visible:outline-none"
            />
          }
        >
          {/* Shadow on the "ground" sells the float */}
          <span
            aria-hidden="true"
            className="absolute -bottom-3 left-1/2 h-2 w-10 -translate-x-1/2 rounded-[50%] bg-primary/30 blur-md transition-opacity group-hover:opacity-80"
          />
          {/* Gradient ring */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-[conic-gradient(from_210deg,#5ee3f5,#8f6ce0,#db509c,#5ee3f5)] opacity-90 shadow-[0_0_28px_-4px_oklch(0.82_0.12_210/70%)] transition-shadow group-hover:shadow-[0_0_36px_0_oklch(0.82_0.12_210/80%)] motion-safe:animate-[spin_14s_linear_infinite]"
          />
          {/* Face */}
          <span
            aria-hidden="true"
            className="absolute inset-[2.5px] rounded-full bg-[radial-gradient(circle_at_35%_30%,oklch(0.3_0.07_250),oklch(0.16_0.04_262))] ring-1 ring-white/10 transition-transform group-hover:scale-[1.04] group-focus-visible:ring-3 group-focus-visible:ring-ring/60"
          />
          <CopilotMark className="relative size-9 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10} className="text-[13px] font-medium">
          {COPILOT_HINT}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
