"use client";

import { Activity, Droplet, HeartPulse, Wind } from "lucide-react";
import { EntryField, EntryFieldGrid, EntryForm } from "@/components/cosmic-shield/entry-form";
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

interface VitalsEntry {
  id: string;
  at: string;
  heartRate: number;
  systolic: number;
  diastolic: number;
  spo2: number;
  glucose: number | null;
  status: HealthStatus;
}

const entries: VitalsEntry[] = [];
const hrTrend: TrendPoint[] = [];
const spo2Trend: TrendPoint[] = [];

export function VitalsView() {
  return (
    <>
      <SectionHeader section={getSection("vitals")!} />
      <MissionContext module="vitals" />

      <ModuleGrid>
        <StatusCard title="Heart rate" icon={HeartPulse} unit="bpm" reference={`Normal ${R.heartRate.min}–${R.heartRate.max} bpm`} />
        <StatusCard title="Blood pressure" icon={Activity} unit="mmHg" reference={`Normal ≤ ${R.systolic.max}/${R.diastolic.max}`} />
        <StatusCard title="Oxygen saturation" icon={Wind} unit="%" reference={`Normal ≥ ${R.spo2.min}%`} />
        <StatusCard title="Glucose" icon={Droplet} unit="mg/dL" reference={`Ref ${R.glucose.min}–${R.glucose.max} mg/dL`} />
      </ModuleGrid>

      <ModuleRow
        main={
          <div className="grid gap-4 md:grid-cols-2">
            <TrendChart title="Heart rate" data={hrTrend} unit="bpm" baseline={R.heartRate} colorSlot={1} />
            <TrendChart title="Oxygen saturation" seriesLabel="SpO₂" data={spo2Trend} unit="%" baseline={R.spo2} yDomain={[88, 100]} colorSlot={4} />
          </div>
        }
        side={
          <EntryForm title="Log vitals" description="Enter one set of readings taken together.">
            <EntryFieldGrid>
              <EntryField label="Heart rate" name="heartRate" unit="bpm" type="number" inputMode="numeric" min={20} max={250} required />
              <EntryField label="SpO₂" name="spo2" unit="%" type="number" inputMode="numeric" min={50} max={100} required />
              <EntryField label="Systolic" name="systolic" unit="mmHg" type="number" inputMode="numeric" min={50} max={250} required />
              <EntryField label="Diastolic" name="diastolic" unit="mmHg" type="number" inputMode="numeric" min={30} max={150} required />
            </EntryFieldGrid>
            <EntryField label="Glucose (optional)" name="glucose" unit="mg/dL" type="number" inputMode="numeric" min={20} max={600} />
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
              { key: "hr", header: "HR", align: "right", cell: (r) => r.heartRate },
              { key: "bp", header: "BP", align: "right", cell: (r) => `${r.systolic}/${r.diastolic}` },
              { key: "spo2", header: "SpO₂", align: "right", cell: (r) => `${r.spo2}%` },
              { key: "glu", header: "Glucose", align: "right", cell: (r) => r.glucose ?? "—" },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        }
        side={
          <HowToMeasure
            equipment={["Pulse oximeter", "BP cuff", "Glucometer"]}
            duration="≈ 5 min"
            steps={[
              { title: "Rest for 5 minutes", detail: "Sit or restrain yourself in a neutral position; no exercise in the last 30 min." },
              { title: "Clip the oximeter on a warm finger", detail: "Wait for a steady reading (≈ 30 s); log HR and SpO₂." },
              { title: "Fit the cuff at heart level", detail: "Bare upper arm, cuff 2 cm above the elbow. Stay still and silent." },
              { title: "Glucose: clean, lance, sample", detail: "Use the side of the fingertip; discard the first drop if instructed." },
            ]}
            tip="Measure at the same time each day so trends are comparable."
          />
        }
      />
    </>
  );
}
