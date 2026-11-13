"use client";

import Image from "next/image";
import { Orbit, Radiation, SatelliteDish } from "lucide-react";
import { MissionPicker } from "@/components/cosmic-shield/mission-picker";
import type { ModuleSlug } from "@/lib/mission/environments";
import { useMissionEnvironment } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";
import { ShowEnvironmentButton } from "@/components/mission/choose-environment-prompt";

/**
 * Banner under each page header with what the current mission environment
 * means for this module. With no environment selected it shows the picker.
 */
export function MissionContext({
  module,
  showPicker = true,
  className,
}: {
  /** Omit on Overview to show the environment summary instead of a module note. */
  module?: ModuleSlug;
  /** False where the top-bar picker is enough (Health Dashboard). */
  showPicker?: boolean;
  className?: string;
}) {
  const env = useMissionEnvironment();

  if (!env && !showPicker) {
    return (
      <div
        data-testid="mission-context"
        className={cn(
          "mb-4 rounded-xl border border-dashed border-primary/30 bg-(--glass) p-3 pl-4 backdrop-blur-(--glass-blur)",
          className,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Choose your mission environment in the top bar</p>
          <ShowEnvironmentButton />
        </div>
        <p className="text-xs text-muted-foreground">
          Thresholds, targets, projected dose and guidance adapt to ISS, the lunar surface, Mars transit or the Mars surface.
        </p>
      </div>
    );
  }

  if (!env) {
    return (
      <div
        className={cn(
          "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-(--glass) p-3 pl-4 backdrop-blur-(--glass-blur)",
          className,
        )}
      >
        <div>
          <p className="text-sm font-medium text-foreground">Choose your mission environment</p>
          <p className="text-xs text-muted-foreground">
            Thresholds, targets and guidance adapt to ISS, the lunar surface, Mars transit or the Mars surface.
          </p>
        </div>
        <MissionPicker />
      </div>
    );
  }

  return (
    <div
      data-testid="mission-context"
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-xl border border-(--glass-border) bg-(--glass) p-3 backdrop-blur-(--glass-blur) md:flex-row md:items-center",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/15">
          <Image src={env.backdrop.src} alt="" fill sizes="44px" className="object-cover" />
        </span>
        <div className="min-w-0">
          <p className="console-label !text-[10px]">
            {env.name} · {env.tagline}
          </p>
          <p className="mt-0.5 text-[13px] text-foreground/90">{module ? env.notes[module] : env.summary}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Chip icon={Radiation} label="Dose" value={`${env.radiationMsvPerDay} mSv/d`} />
        <Chip icon={Orbit} label="Gravity" value={env.gravityLabel} />
        <Chip icon={SatelliteDish} label="Ground" value={env.commsDelayLabel} />
        {!module && showPicker && <MissionPicker className="md:ml-2" />}
      </div>
    </div>
  );
}

function Chip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <span className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5">
      <Icon className="size-3.5 text-primary" aria-hidden="true" />
      <span className="console-label !text-[9px]">{label}</span>
      <span className="font-mono text-[11px] text-foreground">{value}</span>
    </span>
  );
}
