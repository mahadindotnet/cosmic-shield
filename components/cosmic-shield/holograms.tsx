"use client";

import { useId } from "react";

/*
 * Drawn holographic visuals for the modules without a feature image (Sleep &
 * Stress, Radiation). Feature images live in public/organs. All drawn in a 400 × 400
 * viewBox so OrganStage can place hotspots in the same coordinate space.
 * Style: blurred cyan glow + crisp edge + deep-blue volumetric fill on top
 * (so only the silhouette edge glows), then fine detail lines.
 */

const CYAN = "#5ee3f5";
const VIOLET = "#a78bfa";

type Mode = "edge" | "fill";
interface Ids {
  glow: string;
  fill: string;
  soft: string;
  violet: string;
}

function useIds(): Ids {
  const id = useId().replace(/:/g, "");
  return { glow: `${id}-glow`, fill: `${id}-fill`, soft: `${id}-soft`, violet: `${id}-violet` };
}

function Defs({ ids }: { ids: Ids }) {
  return (
    <defs>
      <filter id={ids.glow} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <radialGradient id={ids.fill} cx="42%" cy="36%" r="70%">
        <stop offset="0" stopColor="#2a86bd" stopOpacity="0.95" />
        <stop offset="0.5" stopColor="#103e68" stopOpacity="0.92" />
        <stop offset="1" stopColor="#081a30" stopOpacity="0.95" />
      </radialGradient>
      <radialGradient id={ids.soft}>
        <stop offset="0" stopColor={CYAN} stopOpacity="0.4" />
        <stop offset="1" stopColor={CYAN} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={ids.violet} cx="40%" cy="35%" r="70%">
        <stop offset="0" stopColor="#c4b5fd" />
        <stop offset="0.6" stopColor="#6d4fd1" />
        <stop offset="1" stopColor="#1e1550" />
      </radialGradient>
    </defs>
  );
}

/** Renders a silhouette three times: blurred glow, crisp edge, then fill. */
function Layered({ ids, render }: { ids: Ids; render: (m: Mode) => React.ReactNode }) {
  return (
    <>
      <g opacity={0.55} filter={`url(#${ids.glow})`}>{render("edge")}</g>
      <g opacity={0.9}>{render("edge")}</g>
      <g>{render("fill")}</g>
    </>
  );
}

function Blob({ d, m, ids }: { d: string; m: Mode; ids: Ids }) {
  return m === "edge" ? (
    <path d={d} fill={CYAN} stroke={CYAN} strokeWidth={3} strokeLinejoin="round" />
  ) : (
    <path d={d} fill={`url(#${ids.fill})`} />
  );
}

function Detail({ children, opacity = 0.55, width = 1.2, color = CYAN }: { children: React.ReactNode; opacity?: number; width?: number; color?: string }) {
  return (
    <g fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={width} strokeLinecap="round">
      {children}
    </g>
  );
}

function Gloss({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" opacity={0.07} />;
}

function Svg({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 400 400" className="size-full overflow-visible" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ sleep */

const CRESCENT = "M246.5 90.3 A110 110 0 1 0 299.7 236.5 A100 100 0 0 1 246.5 90.3 Z";
const STARS: [number, number, number][] = [
  [310, 70, 2.2], [340, 120, 1.4], [70, 80, 1.6], [90, 320, 1.2], [330, 290, 1.8], [360, 200, 1.2], [280, 40, 1.4],
];

function wave(y: number, amp: number, period: number) {
  let d = `M40 ${y}`;
  for (let x = 40; x < 360; x += period) {
    d += ` q${period / 4} ${-amp} ${period / 2} 0 t${period / 2} 0`;
  }
  return d;
}

export function SleepHologram() {
  const ids = useIds();
  return (
    <Svg label="Holographic moon with sleep waves">
      <Defs ids={ids} />
      <circle cx={200} cy={190} r={150} fill={`url(#${ids.soft})`} opacity={0.5} />
      <Layered ids={ids} render={(m) => <Blob m={m} ids={ids} d={CRESCENT} />} />
      <Detail opacity={0.45}>
        <circle cx={140} cy={170} r={13} />
        <circle cx={168} cy={252} r={9} />
        <circle cx={124} cy={226} r={6} />
        <circle cx={196} cy={286} r={5} />
      </Detail>
      <g fill="#e6fbff">
        {STARS.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} opacity={0.8} />
        ))}
      </g>
      <g fill="none" strokeLinecap="round">
        <path d={wave(318, 14, 64)} stroke={VIOLET} strokeOpacity={0.75} strokeWidth={1.8} />
        <path d={wave(336, 8, 40)} stroke={CYAN} strokeOpacity={0.6} strokeWidth={1.4} />
        <path d={wave(352, 4, 24)} stroke={CYAN} strokeOpacity={0.35} strokeWidth={1.2} />
      </g>
      <Gloss cx={150} cy={140} rx={30} ry={40} />
    </Svg>
  );
}

/* -------------------------------------------------------------- radiation */

const SHIELD = "M200 84 L288 116 L288 186 C288 250 250 298 200 318 C150 298 112 250 112 186 L112 116 Z";

function trefoilBlade(angleDeg: number) {
  const cx = 200;
  const cy = 196;
  const p = (r: number, a: number) => {
    const rad = (a * Math.PI) / 180;
    return `${(cx + r * Math.cos(rad)).toFixed(1)} ${(cy + r * Math.sin(rad)).toFixed(1)}`;
  };
  const a1 = angleDeg - 30;
  const a2 = angleDeg + 30;
  return `M${p(18, a1)} L${p(52, a1)} A52 52 0 0 1 ${p(52, a2)} L${p(18, a2)} A18 18 0 0 0 ${p(18, a1)} Z`;
}

const TRACKS = [
  "M30 40 L104 112",
  "M370 52 L292 106",
  "M14 176 L84 182",
  "M388 196 L322 196",
  "M120 8 L150 74",
  "M300 10 C280 50 300 70 330 92",
  "M40 300 C80 290 96 270 104 250",
];

export function RadiationHologram() {
  const ids = useIds();
  return (
    <Svg label="Holographic radiation shield">
      <Defs ids={ids} />
      <Detail opacity={0.28} width={1}>
        {[140, 166, 192].map((r) => (
          <path key={r} d={`M${200 - r} 210 A${r} ${r} 0 0 1 ${200 + r} 210`} strokeDasharray="3 6" />
        ))}
      </Detail>
      <g fill="none" stroke={VIOLET} strokeWidth={1.6} strokeLinecap="round" strokeOpacity={0.75}>
        {TRACKS.map((d) => (
          <path key={d} d={d} strokeDasharray="10 4 2 4" />
        ))}
      </g>
      <Layered ids={ids} render={(m) => <Blob m={m} ids={ids} d={SHIELD} />} />
      <Detail opacity={0.18} width={1}>
        {[[170, 140], [230, 140], [140, 190], [260, 190], [170, 245], [230, 245], [200, 285]].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y - 16} l14 8 v16 l-14 8 l-14 -8 v-16 Z`} />
        ))}
      </Detail>
      <g fill={CYAN} opacity={0.85}>
        <circle cx={200} cy={196} r={11} />
        {[-90, 30, 150].map((a) => (
          <path key={a} d={trefoilBlade(a)} />
        ))}
      </g>
      <Gloss cx={176} cy={140} rx={40} ry={18} />
    </Svg>
  );
}
