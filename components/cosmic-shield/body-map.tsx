"use client";

import Link from "next/link";
import { useId } from "react";
import { getSection, type SectionSlug } from "@/components/cosmic-shield/sections";
import { cn } from "@/lib/utils";

/* All coordinates are in the SVG viewBox (200 × 440). */
const VB_W = 200;
const VB_H = 440;

interface Hotspot {
  slug: Exclude<SectionSlug, "overview" | "mission">;
  x: number;
  y: number;
  side: "left" | "right";
  /** Why this spot: shown as a tooltip. */
  hint: string;
}

/** Body areas mapped to modules. Labels sit outside the body like HUD callouts. */
const HOTSPOTS: Hotspot[] = [
  { slug: "mind", x: 100, y: 18, side: "right", hint: "Brain: mood and stress check-ins" },
  { slug: "eyes", x: 95, y: 35, side: "left", hint: "Eyes: SANS screening and Amsler test" },
  { slug: "radiation", x: 79, y: 102, side: "left", hint: "Dosimeter worn on the chest" },
  { slug: "vitals", x: 110, y: 110, side: "right", hint: "Heart: HR, BP, SpO₂, glucose" },
  { slug: "gi", x: 100, y: 172, side: "left", hint: "Gut: Bristol, hydration, nutrition" },
  { slug: "sleep-stress", x: 162, y: 224, side: "right", hint: "Wrist wearable: sleep and HRV" },
  { slug: "bone", x: 82, y: 292, side: "left", hint: "Femur: bone protection countermeasures" },
];

/** [x1, y1, x2, y2, width] for each limb segment. */
const LIMBS: [number, number, number, number, number][] = [
  [60, 88, 46, 158, 18],
  [46, 158, 38, 226, 14],
  [140, 88, 154, 158, 18],
  [154, 158, 162, 226, 14],
  [84, 222, 80, 320, 24],
  [80, 320, 78, 402, 17],
  [116, 222, 120, 320, 24],
  [120, 320, 122, 402, 17],
];
const JOINTS: [number, number][] = [
  [60, 88], [140, 88], [46, 158], [154, 158], [38, 226], [162, 226],
  [84, 224], [116, 224], [80, 320], [120, 320], [78, 402], [122, 402],
];
const TORSO = "M64 80 Q100 70 136 80 Q146 92 142 122 Q138 165 130 200 L70 200 Q62 165 58 122 Q54 92 64 80 Z";
const HIPS = "M70 194 L130 194 Q140 214 134 236 L66 236 Q60 214 70 194 Z";

const CALLOUT_OVERHANG = 60; // px the label column extends beyond the body box

export function BodyMap({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto aspect-[200/440] w-full max-w-[230px]", className)}>
      <BodySvg className="absolute inset-0 size-full" />

      {/* Slow scan line, motion-safe only. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_25%,black_75%,transparent)] motion-reduce:hidden">
        <div className="absolute inset-x-0 h-16 animate-[body-scan_5s_linear_infinite] bg-gradient-to-b from-transparent via-primary/12 to-transparent" />
      </div>

      {HOTSPOTS.map((h) => {
        const section = getSection(h.slug)!;
        const xPct = (h.x / VB_W) * 100;
        const yPct = (h.y / VB_H) * 100;
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
                ? { top: `${yPct}%`, left: -CALLOUT_OVERHANG, right: `calc(${100 - xPct}% - 8px)` }
                : { top: `${yPct}%`, left: `calc(${xPct}% - 8px)`, right: -CALLOUT_OVERHANG }
            }
          >
            {!left && <Dot />}
            {!left && <Leader />}
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary/35 bg-background/80 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-foreground/90 shadow-[0_0_12px_-4px_oklch(0.82_0.12_210/60%)] backdrop-blur transition-colors group-hover/hs:border-primary group-hover/hs:bg-primary/20 group-hover/hs:text-primary group-focus-visible/hs:border-primary group-focus-visible/hs:ring-3 group-focus-visible/hs:ring-ring/50">
              <section.icon className="size-3" aria-hidden="true" />
              {section.title}
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
      className="h-px min-w-2 flex-1 bg-gradient-to-r from-primary/50 to-primary/50 opacity-60 transition-opacity group-hover/hs:opacity-100"
    />
  );
}

function Dot() {
  return (
    <span aria-hidden="true" className="relative flex size-4 shrink-0 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-primary/30 motion-safe:animate-ping" />
      <span className="relative size-2.5 rounded-full bg-primary shadow-[0_0_10px_2px_oklch(0.82_0.12_210/70%)] transition-transform group-hover/hs:scale-125" />
    </span>
  );
}

/** Holographic body: glowing outline, translucent fill, skeleton and joints. */
function BodySvg({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const outline = "#5ee3f5";
  const bone = "#9beefa";

  const silhouette = (mode: "outline" | "fill") => {
    const isOutline = mode === "outline";
    const paint = isOutline ? outline : `url(#${id}-fill)`;
    const shapeProps = isOutline
      ? { fill: outline, stroke: outline, strokeWidth: 3, strokeLinejoin: "round" as const }
      : { fill: paint };
    return (
      <g>
        <ellipse cx={100} cy={36} rx={19} ry={23} {...shapeProps} />
        <rect x={91} y={54} width={18} height={24} rx={6} {...shapeProps} />
        <path d={TORSO} {...shapeProps} />
        <path d={HIPS} {...shapeProps} />
        {LIMBS.map(([x1, y1, x2, y2, w], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isOutline ? outline : paint}
            strokeWidth={isOutline ? w + 3 : w}
            strokeLinecap="round"
          />
        ))}
        <ellipse cx={37} cy={240} rx={7} ry={11} {...shapeProps} />
        <ellipse cx={163} cy={240} rx={7} ry={11} {...shapeProps} />
        <ellipse cx={74} cy={414} rx={12} ry={6} {...shapeProps} />
        <ellipse cx={126} cy={414} rx={12} ry={6} {...shapeProps} />
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f3358" />
          <stop offset="1" stopColor="#081a30" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <radialGradient id={`${id}-floor`}>
          <stop offset="0" stopColor={outline} stopOpacity="0.35" />
          <stop offset="1" stopColor={outline} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Floor platform */}
      <ellipse cx={100} cy={424} rx={78} ry={12} fill={`url(#${id}-floor)`} />
      <ellipse cx={100} cy={424} rx={64} ry={8} fill="none" stroke={outline} strokeOpacity={0.45} strokeDasharray="2 4" />

      {/* Glow, crisp outline, then body fill on top so only the edge shows */}
      <g opacity={0.45} filter={`url(#${id}-glow)`}>{silhouette("outline")}</g>
      <g opacity={0.75}>{silhouette("outline")}</g>
      <g opacity={0.92}>{silhouette("fill")}</g>

      {/* Skeleton */}
      <g stroke={bone} strokeOpacity={0.55} strokeWidth={1.1} fill="none" strokeLinecap="round">
        <ellipse cx={100} cy={33} rx={12.5} ry={15} />
        <path d="M90 41 Q100 56 110 41" />
        <ellipse cx={95} cy={35} rx={2.6} ry={2.3} />
        <ellipse cx={105} cy={35} rx={2.6} ry={2.3} />
        <path d="M100 82 L66 87 M100 82 L134 87" />
        <path d="M100 86 L100 128" />
        {Array.from({ length: 7 }, (_, i) => {
          const y = 90 + i * 10;
          return (
            <path
              key={i}
              d={`M98 ${y} Q${74 + i * 1.5} ${y - 1} ${72 + i * 2} ${y + 9} M102 ${y} Q${126 - i * 1.5} ${y - 1} ${128 - i * 2} ${y + 9}`}
            />
          );
        })}
        <path d="M76 202 Q72 222 88 230 Q100 222 112 230 Q128 222 124 202 Q100 212 76 202 Z" />
        {LIMBS.map(([x1, y1, x2, y2, w], i) => {
          const lower = i % 2 === 1;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          const [ux, uy] = [dx / len, dy / len];
          const [sx, sy] = [x1 + ux * 6, y1 + uy * 6];
          const [ex, ey] = [x2 - ux * 6, y2 - uy * 6];
          if (!lower) return <line key={i} x1={sx} y1={sy} x2={ex} y2={ey} strokeWidth={w > 20 ? 2 : 1.6} />;
          const [px, py] = [-uy * 2.2, ux * 2.2];
          return (
            <g key={i}>
              <line x1={sx + px} y1={sy + py} x2={ex + px} y2={ey + py} />
              <line x1={sx - px} y1={sy - py} x2={ex - px} y2={ey - py} />
            </g>
          );
        })}
      </g>
      <g fill={bone} fillOpacity={0.6}>
        {Array.from({ length: 4 }, (_, i) => (
          <circle key={`c${i}`} cx={100} cy={60 + i * 5} r={1.5} />
        ))}
        {Array.from({ length: 19 }, (_, i) => (
          <circle key={`s${i}`} cx={100} cy={88 + i * 6} r={1.5} />
        ))}
      </g>

      {/* Equipment that anchors the radiation and sleep hotspots */}
      <rect x={74} y={96} width={10} height={12} rx={2} fill="none" stroke={outline} strokeOpacity={0.8} />
      <rect x={155} y={218} width={15} height={8} rx={2.5} transform="rotate(8 162 222)" fill="none" stroke={outline} strokeOpacity={0.8} />

      {/* Glowing joints */}
      <g fill={outline}>
        {JOINTS.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={5} opacity={0.25} filter={`url(#${id}-glow)`} />
            <circle cx={x} cy={y} r={2.2} opacity={0.9} />
          </g>
        ))}
      </g>
    </svg>
  );
}
