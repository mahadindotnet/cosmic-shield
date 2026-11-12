"use client";

import { Camera, Droplets, ListOrdered, Utensils } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface GiEntry {
  id: string;
  at: string;
  bristol: number | null;
  hydrationL: number | null;
  meals: number | null;
  status: HealthStatus;
}

const entries: GiEntry[] = [];
const hydrationTrend: TrendPoint[] = [];

const BRISTOL = [
  { type: 1, desc: "Separate hard lumps", note: "Constipation" },
  { type: 2, desc: "Lumpy, sausage-shaped", note: "Mild constipation" },
  { type: 3, desc: "Sausage with cracks", note: "Normal" },
  { type: 4, desc: "Smooth, soft sausage", note: "Normal" },
  { type: 5, desc: "Soft blobs, clear edges", note: "Lacking fibre" },
  { type: 6, desc: "Mushy, ragged edges", note: "Mild diarrhoea" },
  { type: 7, desc: "Entirely liquid", note: "Diarrhoea" },
];

export function GiView() {
  return (
    <>
      <SectionHeader section={getSection("gi")!} />
      <MissionContext module="gi" />

      <ModuleGrid>
        <StatusCard title="Last Bristol type" icon={ListOrdered} unit="/7" reference="Normal: type 3–4" />
        <StatusCard title="Hydration today" icon={Droplets} unit="L" reference={`Target ${R.hydration.min}–${R.hydration.max} L`} />
        <StatusCard title="Meals logged" icon={Utensils} reference="Today" />
        <StatusCard title="AI image check" icon={Camera} reference="Bristol classifier" />
      </ModuleGrid>

      <ModuleRow
        main={
          <div className="grid gap-4">
            <TrendChart title="Daily hydration" data={hydrationTrend} unit="L" baseline={R.hydration} yDomain={[0, 4]} colorSlot={4} />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bristol stool scale</CardTitle>
                <CardDescription className="text-xs">Reference used by both the manual entry and the AI classifier.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {BRISTOL.map((b) => (
                  <div key={b.type} className="rounded-lg border border-border bg-background/40 p-2">
                    <p className="font-mono text-lg text-foreground">{b.type}</p>
                    <p className="text-[11px] leading-snug text-foreground/85">{b.desc}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{b.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        }
        side={
          <div className="grid gap-4">
            <EntryForm
              title="Bristol photo (AI)"
              description="Upload a photo; the classifier suggests a Bristol type."
              submitLabel="Upload for classification"
              footnote="Images are used for classification only. Not a diagnosis."
            >
              <EntryField label="Image" name="image" type="file" accept="image/*" required className="[&_input]:pt-1" />
            </EntryForm>
            <EntryForm title="Log GI & intake" description="Manual entry if no photo.">
              <SegmentedField
                label="Bristol type"
                name="bristol"
                options={BRISTOL.map((b) => ({ value: `${b.type}`, label: `${b.type}`, title: b.desc }))}
              />
              <EntryFieldGrid>
                <EntryField label="Fluids" name="hydrationL" unit="L" type="number" step="0.1" min={0} max={8} />
                <EntryField label="Meals" name="meals" type="number" min={0} max={10} />
              </EntryFieldGrid>
            </EntryForm>
          </div>
        }
      />

      <ModuleRow
        main={
          <HistoryTable
            rows={entries}
            getRowId={(r) => r.id}
            columns={[
              { key: "at", header: "Time", cell: (r) => r.at },
              { key: "b", header: "Bristol", align: "right", cell: (r) => r.bristol ?? "—" },
              { key: "h", header: "Fluids", align: "right", cell: (r) => (r.hydrationL != null ? `${r.hydrationL} L` : "—") },
              { key: "m", header: "Meals", align: "right", cell: (r) => r.meals ?? "—" },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        }
        side={
          <HowToMeasure
            title="How to take a usable photo"
            equipment={["Tablet camera", "Waste collection bag"]}
            steps={[
              { title: "Photograph inside the collection bag", detail: "Before sealing; fill the frame." },
              { title: "Use the cabin light, no flash", detail: "Flash washes out colour and texture." },
              { title: "Confirm or correct the AI's type", detail: "Your correction is what gets logged." },
            ]}
            tip="Types 6–7 on two consecutive logs trigger a Watch; keep fluids up."
          />
        }
      />
    </>
  );
}
