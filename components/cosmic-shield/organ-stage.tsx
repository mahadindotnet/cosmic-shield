"use client";

import type { LucideIcon } from "lucide-react";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { cn } from "@/lib/utils";

export interface StageHotspot {
  id: string;
  /** Position in the hologram's 400 × 400 viewBox. */
  x: number;
  y: number;
  side: "left" | "right";
  label: string;
  icon?: LucideIcon;
  value?: string | number | null;
  unit?: string;
  status?: HealthStatus;
  /** Form field name to focus when the callout is clicked. */
  field?: string;
  /** Element id to scroll to when the callout is clicked (if no field). */
  anchor?: string;
}

/**
 * Presents a hologram on a glowing pedestal with orbit rings, and HUD-style
 * callouts for each metric. Clicking a callout jumps to its form field.
 */
export function OrganStage({
  visual,
  hotspots,
  caption,
  className,
}: {
  visual: React.ReactNode;
  hotspots: StageHotspot[];
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[520px] [--callout-overhang:0px] sm:[--callout-overhang:28px]", className)}>
      {/* Glow + pedestal + orbit rings */}
      <div aria-hidden="true" className="absolute inset-[14%] rounded-full bg-primary/20 blur-3xl" />
      <svg aria-hidden="true" viewBox="0 0 400 400" className="absolute inset-0 size-full overflow-visible">
        <ellipse cx={200} cy={372} rx={150} ry={22} fill="oklch(0.82 0.12 210 / 12%)" />
        <ellipse cx={200} cy={372} rx={128} ry={16} fill="none" stroke="#5ee3f5" strokeOpacity={0.5} />
        <ellipse cx={200} cy={372} rx={104} ry={11} fill="none" stroke="#5ee3f5" strokeOpacity={0.3} strokeDasharray="2 5" />
        <g transform="rotate(-14 200 200)" fill="none" stroke="#5ee3f5">
          <ellipse cx={200} cy={210} rx={190} ry={46} strokeOpacity={0.22} strokeDasharray="60 10 4 10" />
          <ellipse cx={200} cy={210} rx={168} ry={36} strokeOpacity={0.12} />
          <circle cx={385} cy={198} r={3.5} fill="#5ee3f5" fillOpacity={0.9} stroke="none" />
        </g>
      </svg>

      <div className="absolute inset-[5%] motion-safe:animate-[holo-float_7s_ease-in-out_infinite]">
        {visual}
        {hotspots.map((h) => (
          <Callout key={h.id} h={h} />
        ))}
      </div>

      {caption && (
        <p className="console-label absolute inset-x-0 -bottom-1 text-center !text-[10px]">{caption}</p>
      )}
    </div>
  );
}

function Callout({ h }: { h: StageHotspot }) {
  const xPct = (h.x / 400) * 100;
  const yPct = (h.y / 400) * 100;
  const left = h.side === "left";
  const hasValue = h.value !== null && h.value !== undefined && h.value !== "";
  const Icon = h.icon;

  function activate(e: React.MouseEvent<HTMLButtonElement>) {
    const root = e.currentTarget.closest("[data-module-page]") ?? document;
    const target = h.field
      ? root.querySelector<HTMLElement>(`[name="${h.field}"]`)
      : h.anchor
        ? root.querySelector<HTMLElement>(`[id="${h.anchor}"]`)
        : null;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (h.field) window.setTimeout(() => target.focus({ preventScroll: true }), 450);
  }

  const chip = (
    <span
      className={cn(
        "flex shrink-0 flex-col rounded-xl border bg-background/80 px-2.5 py-1.5 text-left shadow-[0_0_16px_-6px_oklch(0.82_0.12_210/70%)] backdrop-blur transition-colors",
        "group-hover/co:border-primary group-hover/co:bg-primary/15 group-focus-visible/co:border-primary group-focus-visible/co:ring-3 group-focus-visible/co:ring-ring/50",
        hasValue ? "border-primary/40" : "border-dashed border-primary/35",
      )}
    >
      <span className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {Icon && <Icon className="size-3 text-primary" aria-hidden="true" />}
        {h.label}
      </span>
      <span className="flex items-baseline gap-1 font-mono text-sm text-foreground tabular-nums">
        {hasValue ? h.value : <span className="text-muted-foreground/70">—</span>}
        {h.unit && hasValue && <span className="text-[10px] text-muted-foreground">{h.unit}</span>}
        {h.status && h.status !== "no-data" && <StatusBadge status={h.status} className="ml-1" />}
      </span>
    </span>
  );

  return (
    <button
      type="button"
      onClick={activate}
      data-testid={`callout-${h.id}`}
      aria-label={`${h.label}: ${hasValue ? `${h.value} ${h.unit ?? ""}` : "no data"}. ${h.field ? "Go to entry field." : ""}`}
      className="group/co absolute z-10 flex -translate-y-1/2 items-center focus-visible:outline-none"
      style={
        left
          ? { top: `${yPct}%`, left: "calc(-1 * var(--callout-overhang))", right: `calc(${100 - xPct}% - 8px)` }
          : { top: `${yPct}%`, left: `calc(${xPct}% - 8px)`, right: "calc(-1 * var(--callout-overhang))" }
      }
    >
      {left ? chip : <Dot />}
      <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-primary/50 transition-colors group-hover/co:bg-primary" />
      {left ? <Dot /> : chip}
    </button>
  );
}

function Dot() {
  return (
    <span aria-hidden="true" className="relative flex size-4 shrink-0 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-primary/30 motion-safe:animate-ping" />
      <span className="relative size-2.5 rounded-full border border-white/70 bg-primary shadow-[0_0_10px_2px_oklch(0.82_0.12_210/70%)]" />
    </span>
  );
}
