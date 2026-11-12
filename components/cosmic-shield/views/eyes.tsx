"use client";

import { CalendarClock, Camera, Eye, Grid3x3, ScanEye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryField, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { EyeHologram } from "@/components/cosmic-shield/holograms";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganStage } from "@/components/cosmic-shield/organ-stage";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { useMissionEnvironment } from "@/lib/store/mission-store";

interface EyeEntry {
  id: string;
  at: string;
  test: "Fundoscope" | "Amsler";
  eye: "Left" | "Right";
  result: string;
  status: HealthStatus;
}

const entries: EyeEntry[] = [];
const EYE_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

export function EyesView() {
  const env = useMissionEnvironment();

  return (
    <ModulePage slug="eyes">
      <ModuleHero
        slug="eyes"
        title={
          <>
            Vision &amp;
            <br />
            SANS screening
          </>
        }
        primaryAction={{ label: "Start a test", anchor: "eyes-log" }}
        stage={
          <OrganStage
            visual={<EyeHologram />}
            hotspots={[
              { id: "sans", x: 304, y: 210, side: "right", label: "SANS screen", icon: ScanEye, field: "image" },
              { id: "capture", x: 262, y: 120, side: "right", label: "Last capture", icon: Camera, anchor: "eyes-history" },
              { id: "amsler-l", x: 104, y: 160, side: "left", label: "Amsler · L", icon: Grid3x3, field: "lines" },
              { id: "amsler-r", x: 104, y: 244, side: "left", label: "Amsler · R", icon: Grid3x3, field: "lines" },
            ]}
          />
        }
        aside={
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                Screening schedule
              </CardTitle>
              <CardDescription className="text-xs">App default for your environment.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                { k: "Fundoscope", v: env ? env.sansCadence : "Choose a mission" },
                { k: "Amsler grid", v: "Weekly, each eye" },
                { k: "Last screened", v: "Never" },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <span className="text-xs text-muted-foreground">{r.k}</span>
                  <span className="font-mono text-xs text-foreground">{r.v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        }
      />

      <PageSection id="eyes-log" eyebrow="Step 1" title="Run a screening" description="Upload a retina photo for AI screening, then take the Amsler test for each eye.">
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <EntryForm
            title="Fundoscope capture"
            description="Upload a retina / optic-nerve image for AI screening of SANS signs."
            submitLabel="Upload for screening"
            footnote="AI screening flags images for review. It does not diagnose."
          >
            <SegmentedField label="Eye" name="captureEye" options={EYE_OPTIONS} required />
            <EntryField label="Image" name="image" type="file" accept="image/*" required className="[&_input]:pt-1" />
          </EntryForm>
          <AmslerGridCard />
          <EntryForm title="Amsler result" description="Record what you saw for one eye.">
            <SegmentedField label="Eye tested" name="eye" options={EYE_OPTIONS} required />
            <SegmentedField
              label="Were all lines straight and complete?"
              name="lines"
              required
              options={[
                { value: "yes", label: "Yes, all normal" },
                { value: "no", label: "No, wavy / missing / blurred" },
              ]}
            />
            <EntryField label="Where? (optional)" name="area" placeholder="e.g. upper-left of centre" />
          </EntryForm>
        </div>
      </PageSection>

      <PageSection id="eyes-history" eyebrow="Step 2" title="History" description="All fundoscope and Amsler results.">
        <HistoryTable
          rows={entries}
          getRowId={(r) => r.id}
          columns={[
            { key: "at", header: "Time", cell: (r) => r.at },
            { key: "test", header: "Test", cell: (r) => r.test },
            { key: "eye", header: "Eye", cell: (r) => r.eye },
            { key: "res", header: "Result", cell: (r) => r.result },
            { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </PageSection>
    </ModulePage>
  );
}

function AmslerGridCard() {
  const n = 20;
  const cell = 10;
  const size = n * cell;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="size-4 text-primary" aria-hidden="true" />
          Amsler grid
        </CardTitle>
        <CardDescription className="text-xs">Hold ~35 cm away and look at the centre dot with one eye covered.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="aspect-square w-full max-w-64 rounded-md bg-white"
          role="img"
          aria-label="Amsler grid: 20 by 20 black grid with a centre dot"
        >
          {Array.from({ length: n + 1 }, (_, i) => (
            <g key={i} stroke="#111" strokeWidth={0.6}>
              <line x1={i * cell} y1={0} x2={i * cell} y2={size} />
              <line x1={0} y1={i * cell} x2={size} y2={i * cell} />
            </g>
          ))}
          <circle cx={size / 2} cy={size / 2} r={2.4} fill="#111" />
        </svg>
      </CardContent>
    </Card>
  );
}
