"use client";

import { Radiation, ShieldHalf, Sigma, Sun } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryField, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { RadiationHologram } from "@/components/cosmic-shield/holograms";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganStage } from "@/components/cosmic-shield/organ-stage";
import { RingGauge } from "@/components/cosmic-shield/ring-gauge";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
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
  const band = env ? { min: 0, max: env.radiationWatchMsvPerDay, label: "Below watch" } : R.radiationDay;
  const projected = env ? Math.round(projectedMissionDose(env)) : null;

  return (
    <ModulePage slug="radiation">
      <ModuleHero
        slug="radiation"
        title={
          <>
            Radiation
            <br />
            exposure
          </>
        }
        stage={
          <OrganStage
            visual={<RadiationHologram />}
            hotspots={[
              { id: "today", x: 200, y: 142, side: "right", label: "Today", icon: Radiation, unit: "mSv", field: "msv" },
              { id: "total", x: 128, y: 196, side: "left", label: "Mission total", icon: Sigma, unit: "mSv", field: "msv" },
              { id: "career", x: 236, y: 268, side: "right", label: "Career limit", icon: ShieldHalf, unit: "%", anchor: "radiation-hero" },
              { id: "solar", x: 74, y: 84, side: "left", label: "Solar activity", icon: Sun, anchor: "radiation-solar" },
            ]}
          />
        }
        aside={
          <RingGauge
            title="Career dose"
            icon={ShieldHalf}
            value={careerDoseMsv}
            max={CAREER_DOSE_LIMIT_MSV}
            unit="mSv"
            caption="NASA-STD-3001 career limit for every astronaut."
            marker={
              env && projected !== null
                ? { value: projected, label: `Projected ${env.missionDaysLabel}: ≈ ${projected} mSv` }
                : undefined
            }
          />
        }
      />

      <PageSection id="radiation-log" eyebrow="Step 1" title="Log dosimeter reading" description="Read your personal dosimeter at the same time every day.">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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
          <TrendChart
            title="Daily dose"
            description={env ? `Typical on ${env.name}: ${env.radiationMsvPerDay} mSv/d (${env.radiation.basis}: ${env.radiation.sourceLabel})` : undefined}
            data={doseTrend}
            unit="mSv/d"
            baseline={band}
            yDomain={[0, Math.max(2, Math.ceil(band.max * 1.4))]}
            colorSlot={3}
            height={240}
          />
        </div>
      </PageSection>

      <PageSection id="radiation-solar" eyebrow="Space weather" title="Solar storm alerts" description="Flares, coronal mass ejections and solar energetic particle events from NASA's DONKI database.">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sun className="size-4 text-primary" aria-hidden="true" />
              Active alerts
            </CardTitle>
            <CardDescription className="text-xs">
              {env ? `If an alert fires on ${env.name}: ${env.shelter}` : "Shelter instructions adapt to your mission environment."}
            </CardDescription>
            <CardAction>
              <StatusBadge status="no-data" label="Offline" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              No alerts loaded. The DONKI feed connects in a later build.
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection id="radiation-history" eyebrow="Step 2" title="History" description="Every dosimeter reading you have logged.">
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
      </PageSection>
    </ModulePage>
  );
}
