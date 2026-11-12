"use client";

import { Activity, Droplet, HeartPulse, Wind } from "lucide-react";
import { EntryField, EntryFieldGrid, EntryForm } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganImage, OrganStage, onImage } from "@/components/cosmic-shield/organ-stage";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
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

/** public/organs/heart.webp is 739 × 900. */
const HEART_ASPECT = 739 / 900;

const entries: VitalsEntry[] = [];
const hrTrend: TrendPoint[] = [];
const spo2Trend: TrendPoint[] = [];

export function VitalsView() {
  return (
    <ModulePage slug="vitals">
      <ModuleHero
        slug="vitals"
        title={
          <>
            Heart &amp;
            <br />
            vitals
          </>
        }
        stage={
          <OrganStage
            visual={<OrganImage src="/organs/heart.webp" alt="Anatomical heart" />}
            hotspots={[
              { id: "hr", ...onImage(0.66, 0.72, HEART_ASPECT), side: "right", label: "Heart rate", icon: HeartPulse, unit: "bpm", field: "heartRate" },
              { id: "bp", ...onImage(0.6, 0.2, HEART_ASPECT), side: "right", label: "Blood pressure", icon: Activity, unit: "mmHg", field: "systolic" },
              { id: "spo2", ...onImage(0.27, 0.17, HEART_ASPECT), side: "left", label: "SpO₂", icon: Wind, unit: "%", field: "spo2" },
              { id: "glucose", ...onImage(0.22, 0.6, HEART_ASPECT), side: "left", label: "Glucose", icon: Droplet, unit: "mg/dL", field: "glucose" },
            ]}
          />
        }
        aside={
          <>
            <TrendChart title="Heart rate" data={hrTrend} unit="bpm" baseline={R.heartRate} colorSlot={1} height={150} emptyWindow={7} />
            <NextStepCard title="Log today's vitals" body="One set of readings takes about five minutes. Tap a callout to jump to its field." />
          </>
        }
      />

      <PageSection
        id="vitals-log"
        eyebrow="Step 1"
        title="Log a reading"
        description="Take heart rate, SpO₂ and blood pressure together, after five minutes of rest."
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <EntryForm title="Log vitals" description="Enter one set of readings taken together.">
            <EntryFieldGrid>
              <EntryField label="Heart rate" name="heartRate" unit="bpm" type="number" inputMode="numeric" min={20} max={250} required />
              <EntryField label="SpO₂" name="spo2" unit="%" type="number" inputMode="numeric" min={50} max={100} required />
              <EntryField label="Systolic" name="systolic" unit="mmHg" type="number" inputMode="numeric" min={50} max={250} required />
              <EntryField label="Diastolic" name="diastolic" unit="mmHg" type="number" inputMode="numeric" min={30} max={150} required />
            </EntryFieldGrid>
            <EntryField label="Glucose (optional)" name="glucose" unit="mg/dL" type="number" inputMode="numeric" min={20} max={600} />
          </EntryForm>
          <TrendChart title="Oxygen saturation" seriesLabel="SpO₂" data={spo2Trend} unit="%" baseline={R.spo2} yDomain={[88, 100]} colorSlot={4} height={260} />
        </div>
      </PageSection>

      <PageSection id="vitals-history" eyebrow="Step 2" title="History" description="Every reading you have logged, newest first.">
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
      </PageSection>
    </ModulePage>
  );
}
