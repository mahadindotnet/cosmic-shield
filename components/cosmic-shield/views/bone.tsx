"use client";

import { Dumbbell, Milk, Sun, Timer } from "lucide-react";
import { EntryField, EntryFieldGrid, EntryForm } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { HowToMeasure } from "@/components/cosmic-shield/how-to-measure";
import { MissionContext } from "@/components/cosmic-shield/mission-context";
import { SectionHeader } from "@/components/cosmic-shield/section-header";
import { getSection } from "@/components/cosmic-shield/sections";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { ModuleGrid, ModuleRow } from "@/components/cosmic-shield/views/layout";
import { REFERENCE_RANGES as R } from "@/lib/health/reference-ranges";
import { useMissionEnvironment } from "@/lib/store/mission-store";

interface BoneEntry {
  id: string;
  date: string;
  aerobicMin: number;
  resistanceMin: number;
  loadKg: number;
  calciumMg: number;
  vitaminDIu: number;
}

const entries: BoneEntry[] = [];
const exerciseTrend: TrendPoint[] = [];

export function BoneView() {
  const env = useMissionEnvironment();
  const target = env
    ? { min: env.exerciseTargetMin, max: env.exerciseTargetMin + 60, label: "Daily target" }
    : R.exerciseMinutes;

  return (
    <>
      <SectionHeader section={getSection("bone")!} />
      <MissionContext module="bone" />

      <ModuleGrid>
        <StatusCard title="Exercise today" icon={Timer} unit="min" caption={env ? `${env.name} target · ${env.gravityLabel}` : undefined} reference={`Target ${target.min}+ min`} />
        <StatusCard title="Resistance load" icon={Dumbbell} unit="kg" reference="Peak set today" />
        <StatusCard title="Calcium" icon={Milk} unit="mg" reference="Target 1000–1200 mg" />
        <StatusCard title="Vitamin D" icon={Sun} unit="IU" reference="Target 800 IU" />
      </ModuleGrid>

      <ModuleRow
        main={<TrendChart title="Exercise minutes" data={exerciseTrend} unit="min" baseline={target} yDomain={[0, 240]} colorSlot={2} height={240} />}
        side={
          <EntryForm title="Log countermeasures" description="Today's exercise and supplements." footnote="Each logged session earns streak points.">
            <EntryFieldGrid>
              <EntryField label="Aerobic" name="aerobicMin" unit="min" type="number" min={0} max={300} required />
              <EntryField label="Resistance" name="resistanceMin" unit="min" type="number" min={0} max={300} required />
              <EntryField label="Peak load" name="loadKg" unit="kg" type="number" min={0} max={400} />
              <EntryField label="Calcium" name="calciumMg" unit="mg" type="number" min={0} max={5000} />
            </EntryFieldGrid>
            <EntryField label="Vitamin D" name="vitaminDIu" unit="IU" type="number" min={0} max={10000} />
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
              { key: "aer", header: "Aerobic", align: "right", cell: (r) => `${r.aerobicMin} min` },
              { key: "res", header: "Resistance", align: "right", cell: (r) => `${r.resistanceMin} min` },
              { key: "load", header: "Load", align: "right", cell: (r) => `${r.loadKg} kg` },
              { key: "ca", header: "Calcium", align: "right", cell: (r) => `${r.calciumMg} mg` },
              { key: "vd", header: "Vit D", align: "right", cell: (r) => `${r.vitaminDIu} IU` },
            ]}
          />
        }
        side={
          <HowToMeasure
            equipment={["Resistive exercise device", "Treadmill / cycle"]}
            steps={[
              { title: "Log aerobic and resistance time separately", detail: "Both protect bone; resistance work matters most." },
              { title: "Record the heaviest set you lifted", detail: "Use the device's load reading, not perceived effort." },
              { title: "Add supplements from your meal log", detail: "Calcium from food plus tablets; vitamin D from tablets." },
            ]}
            tip="Bone loss in microgravity is roughly 1–1.5% per month in weight-bearing bones without countermeasures."
          />
        }
      />
    </>
  );
}
