"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowDownRight, BookOpen, ListChecks, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HowToMeasure } from "@/components/cosmic-shield/how-to-measure";
import { SECTIONS, getSection, type SectionSlug } from "@/components/cosmic-shield/sections";
import { ESCALATION_TIERS, STATUS_META, StatusBadge } from "@/components/cosmic-shield/status";
import { INSTRUCTIONS } from "@/lib/content/instructions";
import { useMissionEnvironment } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";

/**
 * "Instructions" button + popup explaining each section of the current page and
 * how to take the measurement. Without `slug` it follows the current route.
 */
export function InstructionsButton({
  slug,
  variant = "header",
  className,
}: {
  slug?: SectionSlug;
  variant?: "header" | "hero";
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const env = useMissionEnvironment();

  const resolved = slug ?? SECTIONS.find((s) => s.href === pathname)?.slug ?? "overview";
  const section = getSection(resolved)!;
  const content = INSTRUCTIONS[resolved];
  const envNote = env && resolved !== "overview" && resolved !== "mission" ? env.notes[resolved] : null;
  const caution =
    resolved === "radiation" && env ? `On ${env.name}: ${env.shelter} Log afterwards.` : content.measure?.caution;

  function showMe(anchor: string) {
    setOpen(false);
    // Previously visited routes stay mounted but hidden; pick the visible target.
    window.setTimeout(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>(`[id="${anchor}"]`)).find(
        (el) => el.offsetParent !== null,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={variant === "hero" ? "default" : "outline"}
            size={variant === "hero" ? "lg" : "sm"}
            data-testid={`instructions-${variant}`}
            className={cn(
              variant === "header" && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
              variant === "hero" && "px-4 shadow-[0_0_24px_-6px_oklch(0.82_0.12_210/70%)]",
              className,
            )}
          />
        }
      >
        <BookOpen aria-hidden="true" />
        Instructions
      </DialogTrigger>

      <DialogContent
        data-testid="instructions-dialog"
        className="max-h-[88svh] gap-0 overflow-y-auto p-0 sm:max-w-2xl"
      >
        <DialogHeader className="sticky top-0 z-10 gap-1 border-b border-border bg-popover/95 p-5 pr-12 backdrop-blur">
          <p className="console-label flex items-center gap-1.5 !text-[10px]">
            <section.icon className="size-3.5 text-primary" aria-hidden="true" />
            Instructions · {section.title}
          </p>
          <DialogTitle className="font-heading text-xl font-medium">How to use {section.title}</DialogTitle>
          <DialogDescription className="text-sm">{content.intro}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 p-5">
          <div>
            <h3 className="console-label mb-3">What&apos;s on this page</h3>
            <ol className="flex flex-col gap-2">
              {content.sections.map((s, i) => (
                <li key={s.title} className="flex gap-3 rounded-xl border border-border bg-background/40 p-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-[11px] text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground">{s.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.body}</p>
                  </div>
                  {s.anchor && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="self-center text-primary"
                      onClick={() => showMe(s.anchor!)}
                    >
                      Show me
                      <ArrowDownRight aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {envNote && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
              <p className="console-label !text-[10px]">On {env!.name}</p>
              <p className="mt-1 text-[13px] text-foreground/90">{envNote}</p>
            </div>
          )}

          <div data-testid="instructions-status-levels">
            <h3 className="console-label mb-3">Status levels</h3>
            <ul className="flex flex-col gap-2">
              {[...ESCALATION_TIERS, "no-data" as const].map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3">
                  <StatusBadge status={t} className="w-24 shrink-0 justify-center" />
                  <p className="text-xs text-muted-foreground">{STATUS_META[t].description}</p>
                </li>
              ))}
            </ul>
          </div>

          {content.measure && (
            <div>
              <h3 className="console-label mb-3 flex items-center gap-1.5">
                <ListChecks className="size-3.5 text-primary" aria-hidden="true" />
                How to measure
              </h3>
              <HowToMeasure bare {...content.measure} caution={caution} />
            </div>
          )}
        </div>

        <DialogFooter className="m-0 items-center rounded-b-xl bg-background/40 sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Decision support, not diagnosis.
          </p>
          <Button onClick={() => setOpen(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
