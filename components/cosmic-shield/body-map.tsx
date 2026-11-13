"use client";

import Image from "next/image";
import Link from "next/link";
import {
  getSection,
  type SectionSlug,
} from "@/components/cosmic-shield/sections";
import { cn } from "@/lib/utils";

/*
 * public/organs/anatomy.webp (credited in README, Image credits): cropped to the
 * figure, black keyed to transparent. Hotspots are fractions of that box.
 */
const SRC = "/organs/anatomy.webp";
const ASPECT = "720/1395";

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
  {
    slug: "mind",
    fx: 0.49,
    fy: 0.045,
    side: "right",
    hint: "Brain: mood and stress check-ins",
  },
  {
    slug: "eyes",
    fx: 0.465,
    fy: 0.085,
    side: "left",
    hint: "Eyes: SANS screening and Amsler test",
  },
  {
    slug: "radiation",
    fx: 0.4,
    fy: 0.21,
    side: "left",
    hint: "Dosimeter worn on the chest",
  },
  {
    slug: "vitals",
    fx: 0.55,
    fy: 0.22,
    side: "right",
    hint: "Heart: HR, BP, SpO₂, glucose",
  },
  {
    slug: "gi",
    fx: 0.5,
    fy: 0.355,
    side: "left",
    hint: "Gut: Bristol, hydration, nutrition",
  },
  {
    slug: "sleep-stress",
    fx: 0.875,
    fy: 0.48,
    side: "right",
    hint: "Wrist wearable: sleep and HRV",
    short: "Sleep",
  },
  {
    slug: "bone",
    fx: 0.4,
    fy: 0.58,
    side: "left",
    hint: "Femur: bone protection countermeasures",
  },
];

/**
 * Holographic body with callouts to each module. Motion is deliberately
 * quiet: a slow float, a breathing glow and a scan band that sweeps down the
 * figure. All of it is disabled under prefers-reduced-motion.
 */
export function BodyMap({ className }: { className?: string }) {
  return (
    <div
      data-testid="body-map"
      className={cn(
        "relative mx-auto w-full max-w-[300px] [--callout-overhang:44px] xl:[--callout-overhang:72px]",
        className,
      )}
      style={{ aspectRatio: ASPECT }}
    >
      {/* Breathing glow and platform */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[-10%] top-[12%] bottom-[18%] rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.12_210/22%),transparent)] motion-safe:animate-[holo-breathe_6s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[12%] -bottom-[1.5%] h-[5%] rounded-[50%] border border-primary/35 bg-primary/10 shadow-[0_0_40px_oklch(0.82_0.12_210/35%)]"
      />

      <div className="absolute inset-0 motion-safe:animate-[holo-float_8s_ease-in-out_infinite]">
        <Image
          src={SRC}
          alt="Human anatomy, front view"
          fill
          priority
          sizes="(min-width: 1280px) 300px, 280px"
          className="object-contain drop-shadow-[0_0_24px_oklch(0.82_0.12_210/35%)]"
        />
        {/* Scan band, masked to the figure so only the body lights up. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden motion-reduce:hidden"
          style={{
            maskImage: `url(${SRC})`,
            WebkitMaskImage: `url(${SRC})`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        >
          <div className="h-[30%] w-full bg-[linear-gradient(to_bottom,transparent,oklch(0.85_0.13_210/45%)_55%,oklch(0.95_0.08_210/70%)_60%,transparent)] mix-blend-screen motion-safe:animate-[body-scan_7s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
        </div>

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
              className="group/hs absolute flex -translate-y-1/2 items-center rounded-full focus-visible:outline-none"
              style={
                left
                  ? {
                      top: `${yPct}%`,
                      left: "calc(-1 * var(--callout-overhang))",
                      right: `calc(${100 - xPct}% - 8px)`,
                    }
                  : {
                      top: `${yPct}%`,
                      left: `calc(${xPct}% - 8px)`,
                      right: "calc(-1 * var(--callout-overhang))",
                    }
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
    <span
      aria-hidden="true"
      className="relative flex size-4 shrink-0 items-center justify-center"
    >
      <span className="absolute inset-0 rounded-full bg-primary/25 blur-[3px]" />
      <span className="relative size-2.5 rounded-full border border-white/70 bg-primary shadow-[0_0_10px_2px_oklch(0.82_0.12_210/70%)] transition-transform group-hover/hs:scale-125" />
    </span>
  );
}
