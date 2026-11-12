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
