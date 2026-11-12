"use client";

import { Radiation, ShieldHalf, Sigma, Sun } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryField, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { HowToMeasure } from "@/components/cosmic-shield/how-to-measure";
import { MissionContext } from "@/components/cosmic-shield/mission-context";
import { SectionHeader } from "@/components/cosmic-shield/section-header";
import { getSection } from "@/components/cosmic-shield/sections";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { ModuleGrid, ModuleRow } from "@/components/cosmic-shield/views/layout";
import { CAREER_DOSE_LIMIT_MSV, REFERENCE_RANGES as R } from "@/lib/health/reference-ranges";
import { projectedMissionDose } from "@/lib/mission/environments";
import { useMissionEnvironment } from "@/lib/store/mission-store";

interface DoseEntry {
  id: string;
  at: string;
  dosimeterId: string;
  kind: "daily" | "cumulative";
  msv: number;
  status: HealthStatus;
}

const entries: DoseEntry[] = [];
const doseTrend: TrendPoint[] = [];
const careerDoseMsv: number | null = null;

export function RadiationView() {
  const env = useMissionEnvironment();
  const pct = careerDoseMsv === null ? 0 : (careerDoseMsv / CAREER_DOSE_LIMIT_MSV) * 100;
  const band = env
    ? { min: 0, max: env.radiationWatchMsvPerDay, label: "Below watch" }
    : R.radiationDay;
  const projected = env ? projectedMissionDose(env) : null;
  const projectedPct = projected === null ? null : Math.min((projected / CAREER_DOSE_LIMIT_MSV) * 100, 100);

  return (
    <>
      <SectionHeader section={getSection("radiation")!} />
      <MissionContext module="radiation" />

      <ModuleGrid>
        <StatusCard
          title="Today's dose"
          icon={Radiation}
          unit="mSv"
          caption={env ? `Typical on ${env.name}: ${env.radiationMsvPerDay} mSv/d` : undefined}
          reference={`Watch above ${band.max} mSv/d`}
        />
        <StatusCard title="Mission total" icon={Sigma} unit="mSv" reference="Since launch" />
        <StatusCard title="Career limit used" icon={ShieldHalf} unit="%" reference={`Limit ${CAREER_DOSE_LIMIT_MSV} mSv`} />
        <StatusCard title="Solar activity" icon={Sun} reference="NASA DONKI" caption="Feed not connected yet" />
      </ModuleGrid>

      {/* Running total against career limit */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Career dose vs NASA limit</CardTitle>
          <CardDescription className="text-xs">
            NASA-STD-3001 sets a {CAREER_DOSE_LIMIT_MSV} mSv career effective-dose limit for every astronaut.
          </CardDescription>
          <CardAction className="font-mono text-xs text-muted-foreground tabular-nums">
            {careerDoseMsv === null ? "—" : careerDoseMsv.toFixed(1)} / {CAREER_DOSE_LIMIT_MSV} mSv
          </CardAction>
        </CardHeader>
        <CardContent>
          <div
            className="relative h-3 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Career dose used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
          >
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.min(pct, 100)}%` }} />
            {projectedPct !== null && (
              <div
                aria-hidden="true"
                className="absolute inset-y-0 border-r-2 border-dashed border-foreground/70 bg-foreground/10"
                style={{ left: 0, width: `${projectedPct}%` }}
              />
            )}
          </div>
          {env && projected !== null && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span aria-hidden="true" className="inline-block h-2.5 w-4 rounded-[3px] border border-dashed border-foreground/70 bg-foreground/10" />
              Projected for {env.missionDaysLabel} on {env.name}: ≈ {Math.round(projected)} mSv (
              {Math.round((projected / CAREER_DOSE_LIMIT_MSV) * 100)}% of the limit)
            </p>
          )}
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>0</span>
            <span>150</span>
            <span>300</span>
            <span>450</span>
            <span>{CAREER_DOSE_LIMIT_MSV} mSv</span>
          </div>
        </CardContent>
      </Card>

      <ModuleRow
        main={
          <div className="grid gap-4">
            <TrendChart title="Daily dose" data={doseTrend} unit="mSv/d" baseline={band} yDomain={[0, Math.max(2, Math.ceil(band.max * 1.4))]} colorSlot={3} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sun className="size-4 text-primary" aria-hidden="true" />
                  Solar storm alerts
                </CardTitle>
                <CardDescription className="text-xs">
                  Solar flares, coronal mass ejections and solar energetic particle events from NASA&apos;s DONKI space-weather database.
                </CardDescription>
                <CardAction>
                  <StatusBadge status="no-data" label="Offline" />
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                  No alerts loaded. The DONKI feed connects in a later build.
                </div>
              </CardContent>
            </Card>
          </div>
        }
        side={
          <EntryForm title="Log dosimeter reading" description="Read from your personal dosimeter.">
            <EntryField label="Dosimeter ID" name="dosimeterId" placeholder="e.g. CPD-04" required />
            <SegmentedField
              label="Reading type"
              name="kind"
              required
              options={[
                { value: "daily", label: "Daily" },
                { value: "cumulative", label: "Cumulative" },
              ]}
            />
            <EntryField label="Dose" name="msv" unit="mSv" type="number" step="0.001" min={0} max={1000} required />
          </EntryForm>
        }
      />

      <ModuleRow
        main={
          <HistoryTable
            rows={entries}
            getRowId={(r) => r.id}
            columns={[
              { key: "at", header: "Time", cell: (r) => r.at },
              { key: "id", header: "Dosimeter", cell: (r) => r.dosimeterId },
              { key: "kind", header: "Type", cell: (r) => r.kind },
              { key: "msv", header: "Dose", align: "right", cell: (r) => `${r.msv} mSv` },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        }
        side={
          <HowToMeasure
            equipment={["Personal dosimeter"]}
            duration="≈ 1 min"
            steps={[
              { title: "Wear the dosimeter on your torso", detail: "Keep it on during the whole shift, including sleep." },
              { title: "Read at the same time each day", detail: "Note whether the display shows the daily or cumulative dose." },
              { title: "Log it with the device ID", detail: "So readings from swapped devices aren't mixed up." },
            ]}
            caution={
              env
                ? `Solar particle event on ${env.name}: ${env.shelter} Log afterwards.`
                : "During a solar particle event, move to the designated shelter first and log afterwards."
            }
          />
        }
      />
    </>
  );
}
