"use client";

import Image from "next/image";
import { MISSION_ENVIRONMENTS } from "@/lib/mission/environments";
import { useMissionEnvironment } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";

/**
 * Full-screen background behind the dashboard: the chosen mission
 * environment's image, cross-faded on change. Before an environment is chosen
 * (or while the saved choice loads) it is a plain dark space gradient, so no
 * unrelated image flashes on first load. A scrim keeps panels readable.
 */
export function SpaceBackdrop() {
  const env = useMissionEnvironment();
  const active = env?.id ?? "none";

  return (
    <div
      aria-hidden="true"
      data-testid="space-backdrop"
      data-environment={active}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_10%,oklch(0.24_0.06_262/70%),transparent_60%),radial-gradient(90%_70%_at_10%_100%,oklch(0.22_0.07_290/45%),transparent_60%)]" />
      {MISSION_ENVIRONMENTS.map((m) => (
        <Image
          key={m.id}
          src={m.backdrop.src}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority={m.id === active ? "high" : "low"}
          className={cn(
            "object-cover transition-opacity duration-700 ease-out",
            m.id === active ? "opacity-100" : "opacity-0",
          )}
          style={{ objectPosition: m.backdrop.position }}
        />
      ))}
      {/* Readability scrim: darker behind the sidebar and along the bottom. */}
      <div className="absolute inset-0 bg-background/15" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/55 via-transparent to-background/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/25" />
    </div>
  );
}
