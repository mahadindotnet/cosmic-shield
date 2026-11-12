"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { MISSION_ENVIRONMENTS } from "@/lib/mission/environments";
import { useMissionStore } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";

/**
 * Chooses the mission environment. Changing it swaps the dashboard background
 * and every environment-dependent threshold, target and note.
 *
 * - "compact": three thumbnail pills (Overview, module banners)
 * - "full": large cards with dose / gravity / delay (Mission tab)
 * - "bar": small pills for the top navigation bar; names hide on narrow screens
 */
export function MissionPicker({
  variant = "compact",
  className,
}: {
  variant?: "compact" | "full" | "bar";
  className?: string;
}) {
  const { environmentId, setEnvironment } = useMissionStore();

  if (variant === "bar") {
    return (
      <div role="radiogroup" aria-label="Mission environment" className={cn("flex items-center gap-1", className)}>
        {MISSION_ENVIRONMENTS.map((m) => {
          const selected = m.id === environmentId;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={m.name}
              title={`${m.name} · ${m.tagline}`}
              data-testid={`topbar-mission-${m.id}`}
              onClick={() => setEnvironment(m.id)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full border p-0.5 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none 2xl:pr-3",
                selected
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-background/50 text-foreground/80 hover:border-primary/35 hover:text-foreground",
              )}
            >
              <span className="relative size-6 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
                <Image src={m.backdrop.src} alt="" fill sizes="24px" className="object-cover" />
              </span>
              <span className="hidden whitespace-nowrap 2xl:inline">{m.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Mission environment"
      className={cn(
        variant === "full" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4" : "flex flex-wrap gap-2",
        className,
      )}
    >
      {MISSION_ENVIRONMENTS.map((m) => {
        const selected = m.id === environmentId;
        const common = {
          type: "button" as const,
          role: "radio",
          "aria-checked": selected,
          "data-testid": `mission-${m.id}`,
          onClick: () => setEnvironment(m.id),
        };

        if (variant === "compact") {
          return (
            <button
              key={m.id}
              {...common}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                selected
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-background/50 text-foreground/80 hover:border-primary/35 hover:text-foreground",
              )}
            >
              <span className="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
                <Image src={m.backdrop.src} alt="" fill sizes="28px" className="object-cover" />
              </span>
              {m.name}
            </button>
          );
        }

        return (
          <button
            key={m.id}
            {...common}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected
                ? "border-primary/60 shadow-[0_0_28px_-10px_oklch(0.82_0.12_210/60%)]"
                : "border-border hover:border-primary/35",
            )}
          >
            <span className="relative h-24 w-full overflow-hidden">
              <Image
                src={m.backdrop.src}
                alt=""
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ objectPosition: m.backdrop.position }}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
              <span
                className={cn(
                  "absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-white/40 bg-background/40",
                )}
              >
                {selected && <Check className="size-3" aria-hidden="true" />}
              </span>
            </span>
            <span className={cn("flex flex-1 flex-col gap-2 p-4 pt-1", selected ? "bg-primary/10" : "bg-background/60")}>
              <span>
                <span className="block font-heading text-base font-semibold text-foreground">{m.name}</span>
                <span className="console-label !text-[10px]">{m.tagline}</span>
              </span>
              <span className="text-xs text-muted-foreground">{m.summary}</span>
              <span className="mt-auto grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-foreground">
                <span>
                  <span className="console-label block !text-[9px]">Dose</span>
                  {m.radiationMsvPerDay} mSv/d
                </span>
                <span>
                  <span className="console-label block !text-[9px]">Gravity</span>
                  {m.gravityLabel}
                </span>
                <span>
                  <span className="console-label block !text-[9px]">Delay</span>
                  {m.commsDelayLabel}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
