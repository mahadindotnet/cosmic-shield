"use client";

import { Clock, Orbit, Radiation, SatelliteDish } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HowToMeasure } from "@/components/cosmic-shield/how-to-measure";
import { MissionPicker } from "@/components/cosmic-shield/mission-picker";
import { SectionHeader } from "@/components/cosmic-shield/section-header";
import { SECTIONS, getSection } from "@/components/cosmic-shield/sections";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { ModuleGrid, ModuleRow } from "@/components/cosmic-shield/views/layout";
import { CAREER_DOSE_LIMIT_MSV } from "@/lib/health/reference-ranges";
import { projectedMissionDose, type ModuleSlug } from "@/lib/mission/environments";
import { useMissionEnvironment } from "@/lib/store/mission-store";

export function MissionView() {
  const mission = useMissionEnvironment();
  const projected = mission ? projectedMissionDose(mission) : null;
  const pick = mission ? undefined : "Select an environment";

  return (
    <>
      <SectionHeader section={getSection("mission")!} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mission environment</CardTitle>
          <CardDescription className="text-xs">
            Switching changes the background, radiation thresholds, exercise targets, screening cadence and the
            guidance in every module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MissionPicker variant="full" />
        </CardContent>
      </Card>

      <div className="mt-4">
        <ModuleGrid>
          <StatusCard
            title="Expected dose"
            icon={Radiation}
            value={mission?.radiationMsvPerDay ?? null}
            unit="mSv/d"
            neutral
            caption={pick ?? `Watch above ${mission!.radiationWatchMsvPerDay} mSv/d`}
            reference="Typical daily dose"
          />
          <StatusCard
            title="Projected mission dose"
            icon={Clock}
            value={projected === null ? null : Math.round(projected)}
            unit="mSv"
            neutral
            caption={
              pick ??
              `${mission!.missionDaysLabel} · ${Math.round((projected! / CAREER_DOSE_LIMIT_MSV) * 100)}% of career limit`
            }
            reference={`Career limit ${CAREER_DOSE_LIMIT_MSV} mSv`}
          />
          <StatusCard
            title="Gravity"
            icon={Orbit}
            value={mission ? mission.gravityG.toFixed(2) : null}
            unit="g"
            neutral
            caption={pick ?? mission!.gravityLabel}
            reference="Relative to Earth"
          />
          <StatusCard
            title="Ground comms delay"
            icon={SatelliteDish}
            value={mission?.commsDelayLabel ?? null}
            neutral
            caption={pick ?? `Round trip ${mission!.commsRoundTripLabel}`}
            reference="One-way signal time"
          />
        </ModuleGrid>
      </div>

      <ModuleRow
        main={
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {mission ? `What ${mission.name} means for each module` : "Module briefing"}
              </CardTitle>
              <CardDescription className="text-xs">
                {mission ? mission.groundSupport : "Choose an environment above to see tailored guidance."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mission ? (
                <ul className="grid gap-2 md:grid-cols-2">
                  {SECTIONS.filter((s) => s.group === "health").map((s) => (
                    <li key={s.slug} className="flex gap-2.5 rounded-lg border border-border bg-background/40 p-3">
                      <s.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{s.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{mission.notes[s.slug as ModuleSlug]}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                  No environment selected.
                </p>
              )}
            </CardContent>
          </Card>
        }
        side={
          <HowToMeasure
            title="Changing environment"
            hideAutonomyNote
            steps={[
              { title: "Select the current mission phase", detail: "Usually set once at launch or at a phase change." },
              { title: "Review the expected dose", detail: "Radiation Watch thresholds scale with the environment." },
              { title: "Note the ground delay", detail: "Above ~5 min one way, act on onboard guidance first." },
            ]}
            tip={mission ? `Solar storm procedure: ${mission.shelter}` : undefined}
          />
        }
      />
    </>
  );
}
