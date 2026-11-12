"use client";

import { Activity, BedDouble, Gauge, Moon } from "lucide-react";
import { EntryField, EntryFieldGrid, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { HowToMeasure } from "@/components/cosmic-shield/how-to-measure";
import { MissionContext } from "@/components/cosmic-shield/mission-context";
import { SectionHeader } from "@/components/cosmic-shield/section-header";
import { getSection } from "@/components/cosmic-shield/sections";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { ModuleGrid, ModuleRow } from "@/components/cosmic-shield/views/layout";
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
    <>
      <SectionHeader section={getSection("sleep-stress")!} />
      <MissionContext module="sleep-stress" />

      <ModuleGrid>
        <StatusCard title="Sleep duration" icon={Moon} unit="h" reference={`Watch below ${R.sleepHours.min} h`} />
        <StatusCard title="Sleep quality" icon={BedDouble} unit="/5" reference="Self-rated" />
        <StatusCard title="HRV (RMSSD)" icon={Activity} unit="ms" reference={`Watch below ${R.hrv.min} ms`} />
        <StatusCard title="Stress" icon={Gauge} unit="/5" reference="Self-rated · HRV-informed" />
      </ModuleGrid>

      <ModuleRow
        main={
          <div className="grid gap-4 md:grid-cols-2">
            <TrendChart title="Sleep duration" data={sleepTrend} unit="h" baseline={R.sleepHours} yDomain={[0, 12]} colorSlot={2} />
            <TrendChart title="Heart-rate variability" seriesLabel="HRV" data={hrvTrend} unit="ms" baseline={R.hrv} colorSlot={1} />
          </div>
        }
        side={
          <EntryForm title="Log sleep & stress" description="Fill in after waking.">
            <EntryFieldGrid>
              <EntryField label="Sleep" name="sleepHours" unit="h" type="number" step="0.25" min={0} max={16} required />
              <EntryField label="HRV (optional)" name="hrvMs" unit="ms" type="number" min={5} max={250} />
            </EntryFieldGrid>
            <SegmentedField label="Sleep quality (1 poor – 5 great)" name="quality" options={scale(5)} required />
            <SegmentedField label="Stress (1 calm – 5 overwhelmed)" name="stress" options={scale(5)} required />
          </EntryForm>
        }
      />

      <ModuleRow
        main={
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
        }
        side={
          <HowToMeasure
            equipment={["Wearable / chest strap"]}
            duration="≈ 3 min"
            steps={[
              { title: "Log right after waking", detail: "Before coffee, exercise or screens." },
              { title: "Take a 2-minute HRV reading", detail: "Lie still, breathe normally; use the wearable's RMSSD value." },
              { title: "Rate sleep quality and stress honestly", detail: "Compare against your own normal, not the crew's." },
            ]}
            tip="HRV is personal. The trend matters more than any single number."
          />
        }
      />
    </>
  );
}
