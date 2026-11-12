"use client";

import { CalendarClock, Camera, Grid3x3, ScanEye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryField, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { AmslerTest } from "@/components/cosmic-shield/amsler-test";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganImage, OrganStage, onImage } from "@/components/cosmic-shield/organ-stage";
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
            visual={<OrganImage src="/organs/eye.webp" alt="Eye" />}
            hotspots={[
              { id: "amsler-l", ...onImage(0.2, 0.36, 1), side: "left", label: "Amsler · L", icon: Grid3x3, anchor: "eyes-amsler" },
              { id: "amsler-r", ...onImage(0.2, 0.64, 1), side: "left", label: "Amsler · R", icon: Grid3x3, anchor: "eyes-amsler" },
              { id: "sans", ...onImage(0.5, 0.5, 1), side: "right", label: "SANS screen", icon: ScanEye, field: "image" },
              { id: "capture", ...onImage(0.74, 0.22, 1), side: "right", label: "Last capture", icon: Camera, anchor: "eyes-history" },
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
          <div id="eyes-amsler" className="scroll-mt-24">
            <AmslerTest />
          </div>
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

