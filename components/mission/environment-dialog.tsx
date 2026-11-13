"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MISSION_ENVIRONMENTS, type MissionEnvironmentId } from "@/lib/mission/environments";
import { dismissEnvironmentPromptAction } from "@/lib/notifications/actions";
import { useMissionStore } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";

/**
 * "Choose your mission environment" after login, for crew with none chosen.
 * Confirm saves it to the account (same as the top-bar picker). "Choose
 * later" (or Esc) hides it for the rest of this login session; it shows again
 * at the next login until an environment is chosen. Focus stays inside.
 */
export function EnvironmentDialog() {
  const [open, setOpen] = useState(true);
  const [choice, setChoice] = useState<MissionEnvironmentId | null>(null);
  const setEnvironment = useMissionStore((s) => s.setEnvironment);
  const firstRef = useRef<HTMLButtonElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const later = () => {
    setOpen(false);
    void dismissEnvironmentPromptAction();
  };
  const confirm = () => {
    if (!choice) return;
    setEnvironment(choice);
    setOpen(false);
  };

  // Radio group keyboard support: arrows move between cards and select them.
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const n = MISSION_ENVIRONMENTS.length;
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n : null;
    if (next === null) return;
    e.preventDefault();
    setChoice(MISSION_ENVIRONMENTS[next].id);
    cardRefs.current[next]?.focus();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Esc closes the dialog: the same as "Choose later".
        if (!o) later();
      }}
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false} className="glass-strong gap-5 border border-(--glass-border) p-5 sm:max-w-2xl" initialFocus={firstRef} data-testid="env-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Choose your mission environment</DialogTitle>
          <DialogDescription className="text-xs">
            Thresholds, targets, your projected dose and guidance adapt to where you are. You can change it any time in the top bar.
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Mission environment" className="grid gap-3 sm:grid-cols-2">
          {MISSION_ENVIRONMENTS.map((m, i) => {
            const selected = choice === m.id;
            return (
              <button
                key={m.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                  if (i === 0) firstRef.current = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected || (choice === null && i === 0) ? 0 : -1}
                onClick={() => setChoice(m.id)}
                onDoubleClick={() => {
                  setChoice(m.id);
                  setEnvironment(m.id);
                  setOpen(false);
                }}
                onKeyDown={(e) => onKeyDown(e, i)}
                data-testid={`env-dialog-${m.id}`}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected ? "border-primary/70 bg-primary/12" : "border-border bg-background/40 hover:border-primary/40",
                )}
              >
                <span className="relative size-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/15">
                  <Image src={m.backdrop.src} alt="" fill sizes="64px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {m.name}
                    {selected && <Check className="size-4 text-primary" aria-hidden="true" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {m.gravityLabel} · {m.commsDelayLabel} comms delay one way
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-3 bg-transparent sm:justify-between">
          <button
            type="button"
            onClick={later}
            className="rounded-md px-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            data-testid="env-dialog-later"
          >
            Choose later
          </button>
          <Button onClick={confirm} disabled={!choice} data-testid="env-dialog-confirm">
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
