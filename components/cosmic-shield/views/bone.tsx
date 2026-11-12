"use client";

import { Dumbbell, Milk, Sun, Timer } from "lucide-react";
import { EntryField, EntryFieldGrid, EntryForm } from "@/components/cosmic-shield/entry-form";
import { BoneHologram } from "@/components/cosmic-shield/holograms";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganStage } from "@/components/cosmic-shield/organ-stage";
import { RingGauge } from "@/components/cosmic-shield/ring-gauge";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
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
const exerciseTodayMin: number | null = null;

export function BoneView() {
  const env = useMissionEnvironment();
  const target = env
    ? { min: env.exerciseTargetMin, max: env.exerciseTargetMin + 60, label: "Daily target" }
    : R.exerciseMinutes;

  return (
    <ModulePage slug="bone">
      <ModuleHero
        slug="bone"
        title={
          <>
            Bone
            <br />
            protection
          </>
        }
        stage={
          <OrganStage
            visual={<BoneHologram />}
            hotspots={[
              { id: "exercise", x: 156, y: 170, side: "left", label: "Exercise", icon: Timer, unit: "min", field: "aerobicMin" },
              { id: "load", x: 242, y: 252, side: "right", label: "Peak load", icon: Dumbbell, unit: "kg", field: "loadKg" },
              { id: "calcium", x: 202, y: 190, side: "right", label: "Calcium", icon: Milk, unit: "mg", field: "calciumMg" },
              { id: "vitd", x: 204, y: 336, side: "left", label: "Vitamin D", icon: Sun, unit: "IU", field: "vitaminDIu" },
            ]}
          />
        }
        aside={
          <>
            <RingGauge
              title="Exercise today"
              icon={Timer}
              value={exerciseTodayMin}
              max={target.min}
              unit="min"
              caption={env ? `Daily target on ${env.name} (${env.gravityLabel}).` : "Daily target. Choose a mission to tailor it."}
            />
            <NextStepCard title="Log after each session" body="Every logged session earns streak points." />
          </>
        }
      />

      <PageSection id="bone-log" eyebrow="Step 1" title="Log countermeasures" description="Today's exercise and supplements.">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <EntryForm title="Log countermeasures" description="Exercise and supplements for today." footnote="Each logged session earns streak points.">
            <EntryFieldGrid>
              <EntryField label="Aerobic" name="aerobicMin" unit="min" type="number" min={0} max={300} required />
              <EntryField label="Resistance" name="resistanceMin" unit="min" type="number" min={0} max={300} required />
              <EntryField label="Peak load" name="loadKg" unit="kg" type="number" min={0} max={400} />
              <EntryField label="Calcium" name="calciumMg" unit="mg" type="number" min={0} max={5000} />
            </EntryFieldGrid>
            <EntryField label="Vitamin D" name="vitaminDIu" unit="IU" type="number" min={0} max={10000} />
          </EntryForm>
          <TrendChart
            title="Exercise minutes"
            description="Calcium target 1000–1200 mg · vitamin D 800 IU daily."
            data={exerciseTrend}
            unit="min"
            baseline={target}
            yDomain={[0, 240]}
            colorSlot={2}
            height={260}
          />
        </div>
      </PageSection>

      <PageSection id="bone-history" eyebrow="Step 2" title="History" description="Past days of exercise and supplements.">
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
      </PageSection>
    </ModulePage>
  );
}
