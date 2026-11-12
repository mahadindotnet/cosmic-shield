"use client";

import { Activity, BedDouble, Gauge, Moon } from "lucide-react";
import { EntryField, EntryFieldGrid, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { SleepHologram } from "@/components/cosmic-shield/holograms";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganStage } from "@/components/cosmic-shield/organ-stage";
import { SleepStages } from "@/components/cosmic-shield/sleep-stages";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { REFERENCE_RANGES as R } from "@/lib/health/reference-ranges";

interface SleepEntry {
  id: string;
  date: string;
  sleepHours: number;
  quality: number;
  hrvMs: number | null;
  stress: number;
  status: HealthStatus;
}

const entries: SleepEntry[] = [];
const sleepTrend: TrendPoint[] = [];
const hrvTrend: TrendPoint[] = [];
const scale = (n: number) => Array.from({ length: n }, (_, i) => ({ value: `${i + 1}`, label: `${i + 1}` }));

export function SleepStressView() {
  return (
    <ModulePage slug="sleep-stress">
      <ModuleHero
        slug="sleep-stress"
        title={
          <>
            Sleep &amp;
            <br />
            recovery
          </>
        }
        stage={
          <OrganStage
            visual={<SleepHologram />}
            hotspots={[
              { id: "sleep", x: 140, y: 150, side: "left", label: "Sleep", icon: Moon, unit: "h", field: "sleepHours" },
              { id: "quality", x: 166, y: 262, side: "left", label: "Quality", icon: BedDouble, unit: "/5", field: "quality" },
              { id: "hrv", x: 300, y: 312, side: "right", label: "HRV", icon: Activity, unit: "ms", field: "hrvMs" },
              { id: "stress", x: 286, y: 196, side: "right", label: "Stress", icon: Gauge, unit: "/5", field: "stress" },
            ]}
          />
        }
        aside={
          <>
            <TrendChart title="Sleep duration" data={sleepTrend} unit="h" baseline={R.sleepHours} yDomain={[0, 12]} colorSlot={2} height={150} emptyWindow={7} />
            <NextStepCard title="Log last night" body="Fill this in right after waking, before coffee or exercise." />
          </>
        }
      />

      <PageSection id="sleep-stress-log" eyebrow="Step 1" title="Log sleep & stress" description="Hours, quality, morning HRV and how stressed you feel.">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <EntryForm title="Log sleep & stress" description="Fill in after waking.">
            <EntryFieldGrid>
              <EntryField label="Sleep" name="sleepHours" unit="h" type="number" step="0.25" min={0} max={16} required />
              <EntryField label="HRV (optional)" name="hrvMs" unit="ms" type="number" min={5} max={250} />
            </EntryFieldGrid>
            <SegmentedField label="Sleep quality (1 poor – 5 great)" name="quality" options={scale(5)} required />
            <SegmentedField label="Stress (1 calm – 5 overwhelmed)" name="stress" options={scale(5)} required />
          </EntryForm>
          <div className="grid gap-6">
            <SleepStages />
            <TrendChart title="Heart-rate variability" seriesLabel="HRV" data={hrvTrend} unit="ms" baseline={R.hrv} colorSlot={1} height={180} />
          </div>
        </div>
      </PageSection>

      <PageSection id="sleep-stress-history" eyebrow="Step 2" title="History" description="Past nights, newest first.">
        <HistoryTable
          rows={entries}
          getRowId={(r) => r.id}
          columns={[
            { key: "date", header: "Date", cell: (r) => r.date },
            { key: "sleep", header: "Sleep", align: "right", cell: (r) => `${r.sleepHours} h` },
            { key: "q", header: "Quality", align: "right", cell: (r) => `${r.quality}/5` },
            { key: "hrv", header: "HRV", align: "right", cell: (r) => (r.hrvMs ? `${r.hrvMs} ms` : "—") },
            { key: "stress", header: "Stress", align: "right", cell: (r) => `${r.stress}/5` },
            { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </PageSection>
    </ModulePage>
  );
}
