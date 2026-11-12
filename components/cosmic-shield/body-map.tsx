"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSection, type SectionSlug } from "@/components/cosmic-shield/sections";
import { cn } from "@/lib/utils";

/*
 * Body images share one crop (public/organs/body-*.webp, 305 × 461) so the
 * three poses line up when they swap. Hotspots are fractions of that box and
 * match the front pose.
 */
const POSES = ["front", "left", "right"] as const;
type Pose = (typeof POSES)[number];
/** One "turn" on hover, then settle on the front view. */
const TURN: Pose[] = ["left", "front", "right", "front"];
const FRAME_MS = 420;

interface Hotspot {
  slug: Exclude<SectionSlug, "overview" | "mission">;
  fx: number;
  fy: number;
  side: "left" | "right";
  hint: string;
  /** Shorter label where the callout sits near the edge of the box. */
  short?: string;
}

const HOTSPOTS: Hotspot[] = [
  { slug: "mind", fx: 0.5, fy: 0.07, side: "right", hint: "Brain: mood and stress check-ins" },
  { slug: "eyes", fx: 0.47, fy: 0.115, side: "left", hint: "Eyes: SANS screening and Amsler test" },
  { slug: "radiation", fx: 0.42, fy: 0.215, side: "left", hint: "Dosimeter worn on the chest" },
  { slug: "vitals", fx: 0.56, fy: 0.225, side: "right", hint: "Heart: HR, BP, SpO₂, glucose" },
  { slug: "gi", fx: 0.5, fy: 0.33, side: "left", hint: "Gut: Bristol, hydration, nutrition" },
  { slug: "sleep-stress", fx: 0.885, fy: 0.3, side: "right", hint: "Wrist wearable: sleep and HRV", short: "Sleep" },
  { slug: "bone", fx: 0.44, fy: 0.5, side: "left", hint: "Femur: bone protection countermeasures" },
];


export function BodyMap({ className }: { className?: string }) {
  const [pose, setPose] = useState<Pose>("front");
  const turning = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function turn() {
    if (turning.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    turning.current = true;
    TURN.forEach((p, i) => {
      timers.current.push(window.setTimeout(() => setPose(p), (i + 1) * FRAME_MS));
    });
    timers.current.push(
      window.setTimeout(() => {
        turning.current = false;
      }, (TURN.length + 1) * FRAME_MS),
    );
  }

  const atRest = pose === "front";

  return (
    <div
      data-testid="body-map"
      data-pose={pose}
      onMouseEnter={turn}
      className={cn("relative mx-auto aspect-[305/461] w-full max-w-[280px] [--callout-overhang:40px] xl:[--callout-overhang:60px]", className)}
    >
      {/* Platform under the feet */}
      <div aria-hidden="true" className="absolute inset-x-[8%] bottom-[16%] h-[7%] rounded-[50%] border border-primary/40 bg-primary/10 shadow-[0_0_30px_oklch(0.82_0.12_210/40%)]" />

      {POSES.map((p) => (
        <Image
          key={p}
          src={`/organs/body-${p}.webp`}
          alt={p === "front" ? "Human body, front view" : ""}
          aria-hidden={p !== "front"}
          fill
          priority={p === "front"}
          loading="eager"
          sizes="280px"
          className={cn(
            "object-contain drop-shadow-[0_0_22px_oklch(0.82_0.12_210/40%)] transition-opacity duration-300",
            pose === p ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {HOTSPOTS.map((h) => {
        const section = getSection(h.slug)!;
        const xPct = h.fx * 100;
        const yPct = h.fy * 100;
        const left = h.side === "left";
        return (
          <Link
            key={h.slug}
            href={section.href}
            data-testid={`body-${h.slug}`}
            aria-label={`Open ${section.title}: ${h.hint}`}
            title={h.hint}
            className={cn(
              "group/hs absolute flex -translate-y-1/2 items-center rounded-full transition-opacity duration-300 focus-visible:outline-none",
              atRest ? "opacity-100" : "opacity-30",
            )}
            style={
              left
                ? { top: `${yPct}%`, left: "calc(-1 * var(--callout-overhang))", right: `calc(${100 - xPct}% - 8px)` }
                : { top: `${yPct}%`, left: `calc(${xPct}% - 8px)`, right: "calc(-1 * var(--callout-overhang))" }
            }
          >
            {!left && <Dot />}
            {!left && <Leader />}
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary/35 bg-background/80 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-foreground/90 shadow-[0_0_12px_-4px_oklch(0.82_0.12_210/60%)] backdrop-blur transition-colors group-hover/hs:border-primary group-hover/hs:bg-primary/20 group-hover/hs:text-primary group-focus-visible/hs:border-primary group-focus-visible/hs:ring-3 group-focus-visible/hs:ring-ring/50">
              <section.icon className="size-3" aria-hidden="true" />
              {h.short ?? section.title}
            </span>
            {left && <Leader />}
            {left && <Dot />}
          </Link>
        );
      })}
    </div>
  );
}

function Leader() {
  return (
    <span
      aria-hidden="true"
      className="h-px min-w-2 flex-1 bg-primary/50 opacity-70 transition-opacity group-hover/hs:opacity-100"
    />
  );
}

function Dot() {
  return (
    <span aria-hidden="true" className="relative flex size-4 shrink-0 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-primary/30 motion-safe:animate-ping" />
      <span className="relative size-2.5 rounded-full border border-white/70 bg-primary shadow-[0_0_10px_2px_oklch(0.82_0.12_210/70%)] transition-transform group-hover/hs:scale-125" />
    </span>
  );
}
