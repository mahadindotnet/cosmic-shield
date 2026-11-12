"use client";

import Image from "next/image";
import { Clock, Orbit, Radiation, SatelliteDish, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MissionPicker } from "@/components/cosmic-shield/mission-picker";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganStage } from "@/components/cosmic-shield/organ-stage";
import { SECTIONS } from "@/components/cosmic-shield/sections";
import { CAREER_DOSE_LIMIT_MSV } from "@/lib/health/reference-ranges";
import { projectedMissionDose, type MissionEnvironment, type ModuleSlug } from "@/lib/mission/environments";
import { useMissionEnvironment } from "@/lib/store/mission-store";

export function MissionView() {
  const mission = useMissionEnvironment();
  const projected = mission ? Math.round(projectedMissionDose(mission)) : null;

  return (
    <ModulePage slug="mission">
      <ModuleHero
        slug="mission"
        title={
          mission ? (
            <>
              {mission.name}
              <br />
              <span className="text-primary">{mission.tagline.split(" · ")[0]}</span>
            </>
          ) : (
            <>
              Mission
              <br />
              environment
            </>
          )
        }
        primaryAction={{ label: "Choose environment", anchor: "mission-picker" }}
        stage={
          <OrganStage
            visual={<MissionOrb mission={mission} />}
            hotspots={[
              { id: "dose", x: 92, y: 120, side: "left", label: "Daily dose", icon: Radiation, value: mission?.radiationMsvPerDay ?? null, unit: "mSv/d", anchor: "mission-picker" },
              { id: "gravity", x: 82, y: 262, side: "left", label: "Gravity", icon: Orbit, value: mission?.gravityLabel ?? null, anchor: "mission-picker" },
              { id: "delay", x: 312, y: 122, side: "right", label: "Ground delay", icon: SatelliteDish, value: mission?.commsDelayLabel ?? null, anchor: "mission-picker" },
              {
                id: "projected",
                x: 316,
                y: 262,
                side: "right",
                label: "Projected dose",
                icon: Clock,
                value: projected,
                unit: projected !== null ? `mSv · ${Math.round((projected / CAREER_DOSE_LIMIT_MSV) * 100)}%` : undefined,
                anchor: "mission-picker",
              },
            ]}
          />
        }
        aside={
          mission ? (
            <>
              <NextStepCard title="Ground support" body={mission.groundSupport} />
              <div className="rounded-2xl border border-watch/30 bg-background/45 p-4 backdrop-blur-md">
                <p className="console-label flex items-center gap-1.5 !text-[10px]">
                  <ShieldAlert className="size-3.5 text-watch-foreground" aria-hidden="true" />
                  Solar storm procedure
                </p>
                <p className="mt-1.5 text-xs text-foreground/85">{mission.shelter}</p>
              </div>
            </>
          ) : (
            <NextStepCard title="Choose where the crew is" body="ISS, Lunar surface, Mars transit or Mars surface. The whole app adapts to your choice." />
          )
        }
      />

      <PageSection
        id="mission-picker"
        eyebrow="Step 1"
        title="Choose environment"
        description="Switching changes the background, radiation thresholds, exercise targets, screening schedule and guidance in every module."
      >
        <MissionPicker variant="full" />
      </PageSection>

      <PageSection
        id="mission-briefing"
        eyebrow="Step 2"
        title={mission ? `What ${mission.name} means for each module` : "Module briefing"}
        description={mission ? mission.summary : "Choose an environment above to see tailored guidance."}
      >
        {mission ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SECTIONS.filter((s) => s.group === "health").map((s) => (
              <Card key={s.slug} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <s.icon className="size-4 text-primary" aria-hidden="true" />
                    {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs leading-relaxed">{mission.notes[s.slug as ModuleSlug]}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-10 text-center text-sm text-muted-foreground">
            No environment selected.
          </p>
        )}
      </PageSection>
    </ModulePage>
  );
}

/** The chosen environment's image as a glowing orb, or a holographic planet. */
function MissionOrb({ mission }: { mission: MissionEnvironment | null }) {
  return (
    <div className="relative size-full">
      <div className="absolute inset-[16%] overflow-hidden rounded-full shadow-[0_0_60px_-10px_oklch(0.82_0.12_210/70%)] ring-2 ring-primary/50">
        {mission ? (
          <Image
            key={mission.id}
            src={mission.backdrop.src}
            alt=""
            fill
            sizes="300px"
            className="object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
            style={{ objectPosition: mission.backdrop.position }}
          />
        ) : (
          <svg viewBox="0 0 100 100" className="size-full bg-[radial-gradient(circle_at_35%_30%,#1d6fa3,#081a30_70%)]" aria-hidden="true">
            <g fill="none" stroke="#5ee3f5" strokeOpacity={0.35} strokeWidth={0.5}>
              {[12, 24, 36, 48].map((ry) => (
                <ellipse key={ry} cx={50} cy={50} rx={50} ry={ry} />
              ))}
              {[14, 30, 46].map((rx) => (
                <ellipse key={rx} cx={50} cy={50} rx={rx} ry={50} />
              ))}
            </g>
          </svg>
        )}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,transparent_40%,oklch(0.1_0.03_262/70%))]" />
      </div>
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <g transform="rotate(-18 200 200)" fill="none" stroke="#5ee3f5">
          <ellipse cx={200} cy={200} rx={190} ry={52} strokeOpacity={0.5} strokeDasharray="120 14 6 14" />
          <circle cx={30} cy={222} r={5} fill="#e6fbff" stroke="none" />
        </g>
      </svg>
    </div>
  );
}
