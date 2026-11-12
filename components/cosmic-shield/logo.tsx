import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Cosmic Shield mark: a shield (protection) crossed by an orbit (space)
 * carrying a pulse line (health). Keep in sync with app/icon.svg.
 */
export function CosmicShieldMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="5" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5ee3f5" />
          <stop offset="1" stopColor="#8f6ce0" />
        </linearGradient>
      </defs>
      <path
        d="M16 3 27 7v8c0 7-5 12-11 14C10 27 5 22 5 15V7l11-4Z"
        fill={`url(#${id}-g)`}
        fillOpacity="0.16"
        stroke={`url(#${id}-g)`}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 16.5h3l1.8-4 3 8 1.8-4h3.4"
        stroke="#e6fbff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="14.5"
        ry="4.6"
        transform="rotate(-24 16 16)"
        stroke={`url(#${id}-g)`}
        strokeWidth="1"
        strokeOpacity="0.7"
      />
      <circle cx="28.6" cy="10.4" r="1.6" fill="#5ee3f5" />
    </svg>
  );
}

export function CosmicShieldLogo({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <CosmicShieldMark className="size-8 shrink-0 drop-shadow-[0_0_10px_oklch(0.82_0.12_210/45%)]" />
      <div className="min-w-0 leading-none">
        <div className="font-heading text-[15px] font-semibold tracking-[0.08em] text-foreground uppercase">
          Cosmic&nbsp;<span className="text-primary">Shield</span>
        </div>
        {showTagline && (
          <div className="console-label mt-1 truncate !text-[10px]">Crew health console</div>
        )}
      </div>
    </div>
  );
}

/**
 * AI co-pilot mark: an AI spark at the centre of an orbit carrying a small
 * satellite, in the brand's cyan-to-violet gradient. Used on the floating
 * co-pilot button.
 */
export function CopilotMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("size-8", className)}>
      <defs>
        <linearGradient id={`${id}-o`} x1="3" y1="10" x2="29" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5ee3f5" />
          <stop offset="1" stopColor="#b59cff" />
        </linearGradient>
        <radialGradient id={`${id}-s`} cx="16" cy="16" r="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#d8f8ff" />
          <stop offset="1" stopColor="#8fe6f5" />
        </radialGradient>
      </defs>
      <g transform="rotate(-24 16 16)">
        {/* back half of the orbit, behind the spark */}
        <path d="M3 16a13 5.2 0 0 1 26 0" stroke={`url(#${id}-o)`} strokeWidth="1.4" strokeOpacity="0.55" />
      </g>
      {/* AI spark */}
      <path
        d="M16 5.5c.9 5.6 3.3 8.3 9 9.5-5.7 1.2-8.1 3.9-9 10-.9-6.1-3.3-8.8-9-10 5.7-1.2 8.1-3.9 9-9.5Z"
        fill={`url(#${id}-s)`}
      />
      <path d="M24.5 4.5c.3 1.6.9 2.3 2.5 2.6-1.6.3-2.2 1-2.5 2.6-.3-1.6-.9-2.3-2.5-2.6 1.6-.3 2.2-1 2.5-2.6Z" fill="#e6fbff" />
      <g transform="rotate(-24 16 16)">
        {/* front half of the orbit, over the spark, with the satellite */}
        <path d="M29 16a13 5.2 0 0 1-26 0" stroke={`url(#${id}-o)`} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="29" cy="16" r="1.9" fill="#5ee3f5" stroke="#0b1530" strokeWidth="0.8" />
      </g>
    </svg>
  );
}
