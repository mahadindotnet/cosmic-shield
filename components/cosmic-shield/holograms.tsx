"use client";

import { useId } from "react";

/*
 * Holographic organ visuals for each module page. All drawn in a 400 × 400
 * viewBox so OrganStage can place hotspots in the same coordinate space.
 * Style: blurred cyan glow + crisp edge + deep-blue volumetric fill on top
 * (so only the silhouette edge glows), then fine detail lines.
 */

const CYAN = "#5ee3f5";
const VIOLET = "#a78bfa";
const TUBE = "#0e3457";

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

function Tube({ d, w, m }: { d: string; w: number; m: Mode }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={m === "edge" ? CYAN : TUBE}
      strokeWidth={m === "edge" ? w + 3 : w}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;

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

/* ------------------------------------------------------------------ heart */

const HEART_BODY =
  "M152 150 C118 172 108 232 138 282 C162 322 198 346 214 352 C240 332 282 292 292 240 C302 190 282 152 252 142 C226 134 204 142 194 152 C182 142 166 141 152 150 Z";

export function HeartHologram() {
  const ids = useIds();
  return (
    <Svg label="Holographic heart">
      <Defs ids={ids} />
      <Layered
        ids={ids}
        render={(m) => (
          <>
            <Tube m={m} w={9} d="M226 92 L222 58" />
            <Tube m={m} w={9} d="M246 87 L247 54" />
            <Tube m={m} w={9} d="M266 92 L272 60" />
            <Tube m={m} w={20} d="M204 156 C200 118 214 90 244 88 C270 86 282 102 280 128" />
            <Tube m={m} w={16} d="M166 156 L162 92" />
            <Tube m={m} w={16} d="M186 166 C176 134 160 120 130 118" />
            <Blob m={m} ids={ids} d={ellipse(146, 180, 28, 32)} />
            <Blob m={m} ids={ids} d={ellipse(268, 164, 26, 21)} />
            <Blob m={m} ids={ids} d={HEART_BODY} />
          </>
        )}
      />
      <Detail>
        <path d="M206 172 C200 212 206 262 216 330" />
        <path d="M206 205 C232 218 252 242 262 276" />
        <path d="M204 236 C178 252 162 272 152 290" />
        <path d="M222 262 C236 270 246 290 244 314" />
        <path d="M170 210 C160 232 156 252 160 272" />
        <path d="M212 112 C224 100 244 96 262 102" strokeOpacity={0.35} />
      </Detail>
      <Detail color={VIOLET} opacity={0.5}>
        <path d="M234 196 C246 206 258 222 266 240" />
        <path d="M188 268 C196 290 204 310 212 326" />
      </Detail>
      <Gloss cx={190} cy={205} rx={36} ry={22} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ brain */

const BRAIN_OUTER =
  "M108 222 C94 170 120 116 176 100 C212 86 262 90 292 116 C322 138 332 178 316 212 C306 240 282 256 252 258 C236 276 206 282 186 272 C160 278 124 262 108 222 Z";
const BRAIN_NODES: [number, number][] = [
  [150, 150], [198, 132], [250, 128], [288, 166], [236, 200], [182, 190], [142, 212], [272, 214], [210, 240],
];
const BRAIN_LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [7, 4], [4, 5], [5, 0], [5, 6], [4, 8], [8, 6], [1, 5], [2, 4],
];

export function BrainHologram() {
  const ids = useIds();
  return (
    <Svg label="Holographic brain">
      <Defs ids={ids} />
      <Layered
        ids={ids}
        render={(m) => (
          <>
            <Tube m={m} w={24} d="M238 262 C238 290 234 312 230 340" />
            <Blob m={m} ids={ids} d={ellipse(270, 268, 42, 25)} />
            <Blob m={m} ids={ids} d={BRAIN_OUTER} />
          </>
        )}
      />
      <Detail>
        <path d="M128 200 C140 180 152 196 164 178 C176 160 190 176 200 160" />
        <path d="M124 170 C140 150 156 166 168 146 C180 128 196 140 210 124" />
        <path d="M150 122 C166 134 178 118 194 126" />
        <path d="M222 108 C234 124 248 110 264 122 C278 132 290 124 302 138" />
        <path d="M222 140 C238 156 252 140 268 154 C282 166 296 156 308 170" />
        <path d="M226 176 C240 190 258 176 272 192 C286 206 300 196 310 206" />
        <path d="M160 240 C180 232 200 248 222 236 C238 228 252 240 266 232" />
        <path d="M140 246 C150 256 168 262 186 262" />
        <path d="M236 268 C254 262 282 262 302 270" strokeOpacity={0.4} />
        <path d="M240 280 C258 276 280 276 298 282" strokeOpacity={0.4} />
      </Detail>
      <Detail opacity={0.8} width={1.6}>
        <path d="M146 222 C180 206 214 204 258 190" />
        <path d="M214 98 C204 136 222 168 204 206" />
      </Detail>
      <g stroke={VIOLET} strokeOpacity={0.55} strokeWidth={1}>
        {BRAIN_LINKS.map(([a, b], i) => (
          <line key={i} x1={BRAIN_NODES[a][0]} y1={BRAIN_NODES[a][1]} x2={BRAIN_NODES[b][0]} y2={BRAIN_NODES[b][1]} />
        ))}
      </g>
      <g fill={VIOLET}>
        {BRAIN_NODES.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={7} opacity={0.3} filter={`url(#${ids.glow})`} />
            <circle cx={x} cy={y} r={2.8} />
          </g>
        ))}
      </g>
      <Gloss cx={190} cy={140} rx={60} ry={24} />
    </Svg>
  );
}

/* -------------------------------------------------------------------- eye */

export function EyeHologram() {
  const ids = useIds();
  return (
    <Svg label="Holographic eye with optic nerve">
      <Defs ids={ids} />
      <g fill="none" stroke={VIOLET} strokeLinecap="round" opacity={0.35}>
        <path d="M128 108 C190 70 272 78 332 122" strokeWidth={18} />
        <path d="M128 292 C190 330 272 322 332 278" strokeWidth={18} />
      </g>
      <Layered
        ids={ids}
        render={(m) => (
          <>
            <Tube m={m} w={26} d="M308 214 C330 222 352 232 374 238" />
            <Blob m={m} ids={ids} d={ellipse(205, 200, 112, 112)} />
            <Blob m={m} ids={ids} d={ellipse(98, 200, 24, 64)} />
          </>
        )}
      />
      <Detail opacity={0.22} width={1}>
        <ellipse cx={205} cy={200} rx={112} ry={40} />
        <ellipse cx={205} cy={200} rx={112} ry={80} />
        <ellipse cx={205} cy={200} rx={45} ry={112} />
        <ellipse cx={205} cy={200} rx={85} ry={112} />
      </Detail>
      <Detail opacity={0.7}>
        <path d="M266 108 A104 104 0 0 1 266 292" strokeDasharray="4 5" />
        <path d="M304 210 C290 180 280 160 262 140" />
        <path d="M304 210 C290 240 282 258 262 276" />
        <path d="M304 210 C285 205 270 198 250 190" />
        <path d="M304 210 C286 222 272 230 252 238" />
        <ellipse cx={122} cy={200} rx={10} ry={38} strokeOpacity={0.4} />
      </Detail>
      <circle cx={304} cy={210} r={11} fill={CYAN} opacity={0.3} filter={`url(#${ids.glow})`} />
      <circle cx={304} cy={210} r={6} fill={CYAN} opacity={0.85} />
      <ellipse cx={96} cy={200} rx={13} ry={48} fill={`url(#${ids.violet})`} />
      <ellipse cx={94} cy={200} rx={5} ry={19} fill="#050b16" />
      <Gloss cx={170} cy={140} rx={50} ry={22} />
    </Svg>
  );
}

/* -------------------------------------------------------------------- gut */

const COLON = "M122 312 L122 150 C122 122 138 108 164 108 L248 108 C274 108 288 122 288 150 L288 296 C288 320 272 330 248 330 L222 330 C208 334 202 350 202 374";
const SMALL_INTESTINE =
  "M168 152 C206 140 246 150 250 170 C254 192 172 182 168 204 C164 226 250 214 250 236 C250 258 168 248 168 270 C168 292 232 294 246 286";

export function GutHologram() {
  const ids = useIds();
  const left = Array.from({ length: 8 }, (_, i) => 168 + i * 18);
  const top = Array.from({ length: 4 }, (_, i) => 176 + i * 22);
  const right = Array.from({ length: 8 }, (_, i) => 160 + i * 18);
  return (
    <Svg label="Holographic intestines">
      <Defs ids={ids} />
      <Layered
        ids={ids}
        render={(m) => (
          <>
            <Tube m={m} w={34} d={COLON} />
            <Tube m={m} w={8} d="M122 318 C118 336 108 344 98 348" />
            <Tube m={m} w={17} d={SMALL_INTESTINE} />
          </>
        )}
      />
      <Detail opacity={0.45}>
        {left.map((y) => (
          <path key={`l${y}`} d={`M106 ${y} Q122 ${y + 6} 138 ${y}`} />
        ))}
        {top.map((x) => (
          <path key={`t${x}`} d={`M${x} 92 Q${x + 6} 108 ${x} 124`} />
        ))}
        {right.map((y) => (
          <path key={`r${y}`} d={`M272 ${y} Q288 ${y + 6} 304 ${y}`} />
        ))}
      </Detail>
      <Detail opacity={0.7} width={1}>
        <path d={SMALL_INTESTINE} strokeDasharray="2 6" />
      </Detail>
      <Detail color={VIOLET} opacity={0.5}>
        <path d="M150 140 C140 200 142 260 150 300" strokeDasharray="1 7" strokeWidth={3} />
        <path d="M260 140 C270 200 268 260 262 300" strokeDasharray="1 7" strokeWidth={3} />
      </Detail>
      <Gloss cx={205} cy={180} rx={46} ry={20} />
    </Svg>
  );
}

/* ------------------------------------------------------------------- bone */

export function BoneHologram() {
  const ids = useIds();
  return (
    <Svg label="Holographic leg bones and knee">
      <Defs ids={ids} />
      <g fill={VIOLET} fillOpacity={0.08} stroke={VIOLET} strokeOpacity={0.35} strokeWidth={1.2}>
        <path d="M146 100 C134 160 156 220 170 254 L242 254 C254 204 254 142 240 96 Z" />
        <path d="M176 294 C160 324 176 362 192 384 L228 384 C248 352 252 320 236 294 Z" />
      </g>
      <Layered
        ids={ids}
        render={(m) => (
          <>
            <Tube m={m} w={30} d="M178 86 C190 100 196 112 198 130 L204 236" />
            <Blob m={m} ids={ids} d={ellipse(168, 74, 24, 24)} />
            <Blob m={m} ids={ids} d={ellipse(222, 112, 14, 18)} />
            <Blob m={m} ids={ids} d="M174 236 C174 224 234 224 234 236 C238 258 226 272 204 272 C182 272 170 258 174 236 Z" />
            <Tube m={m} w={9} d="M230 292 L232 368" />
            <Tube m={m} w={28} d="M200 276 L206 372" />
            <Blob m={m} ids={ids} d="M178 278 C178 268 230 268 232 278 C232 292 220 298 204 298 C188 298 178 292 178 278 Z" />
            <Blob m={m} ids={ids} d={ellipse(208, 380, 24, 10)} />
          </>
        )}
      />
      <Detail opacity={0.6} width={1}>
        <path d="M197 140 L202 226" strokeDasharray="3 5" />
        <path d="M206 300 L208 362" strokeDasharray="3 5" />
        <path d="M156 66 C166 76 176 78 184 70" />
        <path d="M160 82 C168 88 178 88 186 82" />
        <path d="M184 244 C196 252 214 252 226 244" />
        <path d="M188 256 C198 262 212 262 222 256" />
      </Detail>
      <ellipse cx={242} cy={252} rx={10} ry={15} fill="none" stroke={CYAN} strokeOpacity={0.8} strokeWidth={1.5} />
      <g fill={CYAN}>
        {[[168, 74], [204, 252], [208, 380]].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r={10} opacity={0.3} filter={`url(#${ids.glow})`} />
            <circle cx={x} cy={y} r={3} />
          </g>
        ))}
      </g>
      {/* Density scan bar */}
      <g transform="translate(300 90)">
        <rect width={10} height={240} rx={5} fill="none" stroke={CYAN} strokeOpacity={0.4} />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={14} x2={20} y1={i * 30} y2={i * 30} stroke={CYAN} strokeOpacity={0.4} />
        ))}
      </g>
    </Svg>
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
