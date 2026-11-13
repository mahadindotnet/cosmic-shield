"use client";

import Image from "next/image";
import { useEffect } from "react";
import { DEFAULT_BACKDROP_BLUR, MISSION_ENVIRONMENTS } from "@/lib/mission/environments";
import { useMissionEnvironment } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";

/**
 * Full-screen background behind the dashboard: the chosen mission
 * environment's image, cross-faded on change and clearly visible (light blur,
 * per-image brightness, full opacity). Before an environment is chosen it is
 * a plain dark space gradient, so no unrelated image flashes on first load.
 *
 * Readability comes from the frosted-glass panels (see `--glass` in
 * globals.css) and a soft vignette only at the screen edges and behind the
 * top bar and sidebar, so the centre of the image stays bright.
 */
export function SpaceBackdrop() {
  const env = useMissionEnvironment();
  const active = env?.id ?? "none";

  // Panels read their glass opacity from <html data-environment> (globals.css).
  useEffect(() => {
    document.documentElement.dataset.environment = active;
  }, [active]);

  return (
    <div
      aria-hidden="true"
      data-testid="space-backdrop"
      data-environment={active}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_10%,oklch(0.24_0.06_262/70%),transparent_60%),radial-gradient(90%_70%_at_10%_100%,oklch(0.22_0.07_290/45%),transparent_60%)]" />
      {MISSION_ENVIRONMENTS.map((m) => {
        const blur = m.backdrop.blur ?? DEFAULT_BACKDROP_BLUR;
        return (
          <Image
            key={m.id}
            src={m.backdrop.src}
            alt=""
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority={m.id === active ? "high" : "low"}
            className={cn(
              // Slightly scaled so the blurred edges never show.
              "scale-[1.03] object-cover transition-opacity duration-700 ease-out",
              m.id === active ? "opacity-100" : "opacity-0",
            )}
            style={{
              objectPosition: m.backdrop.position,
              filter: `blur(${blur}px) brightness(${m.backdrop.dim})`,
            }}
          />
        );
      })}

      {/* Edge vignette: dark at the screen edges only, centre untouched. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_55%_50%,transparent_55%,oklch(0.1_0.025_262/60%)_100%)]" />
      {/* Behind the top bar */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/70 to-transparent" />
      {/* Behind the sidebar (desktop) */}
      <div className="absolute inset-y-0 left-0 hidden w-80 bg-gradient-to-r from-background/75 via-background/40 to-transparent md:block" />
    </div>
  );
}
