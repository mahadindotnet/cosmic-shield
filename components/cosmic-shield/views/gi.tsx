"use client";

import { Camera, Droplets, ListOrdered, Utensils } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EntryField, EntryFieldGrid, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganImage, OrganStage, onImage } from "@/components/cosmic-shield/organ-stage";
import { RingGauge } from "@/components/cosmic-shield/ring-gauge";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { REFERENCE_RANGES as R } from "@/lib/health/reference-ranges";

interface GiEntry {
  id: string;
  at: string;
  bristol: number | null;
  hydrationL: number | null;
  meals: number | null;
  status: HealthStatus;
}

/** public/organs/gi.webp is 416 × 398. */
const GI_ASPECT = 416 / 398;

const entries: GiEntry[] = [];
const hydrationTrend: TrendPoint[] = [];
const fluidsTodayL: number | null = null;

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
    <ModulePage slug="gi">
      <ModuleHero
        slug="gi"
        title={
          <>
            Gut &amp;
            <br />
            hydration
          </>
        }
        stage={
          <OrganStage
            visual={<OrganImage src="/organs/gi.webp" alt="Intestines" />}
            hotspots={[
              { id: "bristol", ...onImage(0.52, 0.86, GI_ASPECT), side: "right", label: "Bristol type", icon: ListOrdered, unit: "/7", field: "bristol" },
              { id: "fluids", ...onImage(0.74, 0.42, GI_ASPECT), side: "right", label: "Fluids", icon: Droplets, unit: "L", field: "hydrationL" },
              { id: "meals", ...onImage(0.42, 0.46, GI_ASPECT), side: "left", label: "Meals", icon: Utensils, field: "meals" },
              { id: "photo", ...onImage(0.3, 0.66, GI_ASPECT), side: "left", label: "AI photo check", icon: Camera, field: "image" },
            ]}
          />
        }
        aside={
          <RingGauge
            title="Fluids today"
            icon={Droplets}
            value={fluidsTodayL}
            max={R.hydration.min}
            unit="L"
            caption={`Daily target ${R.hydration.min}–${R.hydration.max} L.`}
          />
        }
      />

      <PageSection id="gi-log" eyebrow="Step 1" title="Log GI & intake" description="A photo is quickest. Confirm or correct the suggested type; your answer is what gets logged.">
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <EntryForm
            title="Bristol photo (AI)"
            description="Upload a photo; the classifier suggests a Bristol type."
            submitLabel="Upload for classification"
            footnote="Images are used for classification only. Not a diagnosis."
          >
            <EntryField label="Image" name="image" type="file" accept="image/*" required className="[&_input]:pt-1" />
          </EntryForm>
          <EntryForm title="Manual entry" description="No photo? Log it yourself.">
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
          <TrendChart title="Daily hydration" data={hydrationTrend} unit="L" baseline={R.hydration} yDomain={[0, 4]} colorSlot={4} height={200} />
        </div>
      </PageSection>

      <PageSection id="gi-scale" eyebrow="Reference" title="Bristol stool scale" description="Used by both the manual entry and the AI classifier. Types 3–4 are normal.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {BRISTOL.map((b) => (
            <Card key={b.type} size="sm" className="gap-1">
              <CardContent className="flex flex-col gap-1">
                <span className="font-mono text-3xl font-light text-primary">{b.type}</span>
                <span className="text-xs leading-snug text-foreground/90">{b.desc}</span>
                <span className="text-[11px] text-muted-foreground">{b.note}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageSection>

      <PageSection id="gi-history" eyebrow="Step 2" title="History" description="Past GI and intake entries.">
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
      </PageSection>
    </ModulePage>
  );
}
