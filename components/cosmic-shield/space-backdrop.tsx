"use client";

import Image from "next/image";
import { DEFAULT_BACKDROP, MISSION_ENVIRONMENTS } from "@/lib/mission/environments";
import { useMissionEnvironment } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";

const BACKDROPS = [
  { id: "default", ...DEFAULT_BACKDROP },
  ...MISSION_ENVIRONMENTS.map((m) => ({ id: m.id, ...m.backdrop })),
];

/**
 * Full-screen background behind the dashboard. Shows the default forest until a
 * mission environment is chosen, then cross-fades to that environment's image.
 * A scrim keeps panels readable on bright images.
 */
export function SpaceBackdrop() {
  const env = useMissionEnvironment();
  const active = env?.id ?? "default";

  return (
    <div
      aria-hidden="true"
      data-testid="space-backdrop"
      data-environment={active}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
      {BACKDROPS.map((b) => (
        <Image
          key={b.id}
          src={b.src}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority={b.id === active ? "high" : "low"}
          className={cn(
            "object-cover transition-opacity duration-1000 ease-out",
            b.id === active ? "opacity-100" : "opacity-0",
          )}
          style={{ objectPosition: b.position }}
        />
      ))}
      {/* Readability scrim: darker behind the sidebar and along the bottom. */}
      <div className="absolute inset-0 bg-background/15" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/55 via-transparent to-background/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/25" />
    </div>
  );
}
