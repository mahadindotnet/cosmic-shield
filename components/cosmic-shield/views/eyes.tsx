"use client";

import { Camera, Eye, Grid3x3, ScanEye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryField, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { HowToMeasure } from "@/components/cosmic-shield/how-to-measure";
import { MissionContext } from "@/components/cosmic-shield/mission-context";
import { SectionHeader } from "@/components/cosmic-shield/section-header";
import { getSection } from "@/components/cosmic-shield/sections";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { ModuleGrid, ModuleRow } from "@/components/cosmic-shield/views/layout";
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
    <>
      <SectionHeader section={getSection("eyes")!} />
      <MissionContext module="eyes" />

      <ModuleGrid>
        <StatusCard
          title="SANS screen"
          icon={ScanEye}
          caption={env ? `Screen ${env.sansCadence.toLowerCase()} on ${env.name}` : undefined}
          reference="AI fundus screening"
        />
        <StatusCard title="Amsler · left" icon={Grid3x3} reference="Self-test" />
        <StatusCard title="Amsler · right" icon={Grid3x3} reference="Self-test" />
        <StatusCard title="Last fundus capture" icon={Camera} reference="Fundoscope" />
      </ModuleGrid>

      <ModuleRow
        main={
          <div className="grid gap-4 md:grid-cols-2">
            <AmslerGridCard />
            <EntryForm
              title="Amsler result"
              description="Record what you saw for one eye."
            >
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
        }
        side={
          <EntryForm
            title="Fundoscope capture"
            description="Upload a retina / optic-nerve image for AI screening of SANS signs."
            submitLabel="Upload for screening"
            footnote="AI screening flags images for review. It does not diagnose."
          >
            <SegmentedField label="Eye" name="eye" options={EYE_OPTIONS} required />
            <EntryField label="Image" name="image" type="file" accept="image/*" required className="[&_input]:pt-1" />
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
              { key: "test", header: "Test", cell: (r) => r.test },
              { key: "eye", header: "Eye", cell: (r) => r.eye },
              { key: "res", header: "Result", cell: (r) => r.result },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        }
        side={
          <HowToMeasure
            title="How to take the Amsler test"
            equipment={["Reading glasses if used"]}
            duration="≈ 2 min"
            steps={[
              { title: "Hold the screen ~35 cm away", detail: "Good, even lighting; wear your normal reading glasses." },
              { title: "Cover one eye", detail: "Look only at the centre dot. Don't move your gaze." },
              { title: "Check the lines", detail: "Are any wavy, broken, blurred or missing? Note where." },
              { title: "Repeat with the other eye", detail: "Log each eye as its own entry." },
            ]}
            caution="New distortion in central vision should be logged right away. It may trigger a Watch for SANS."
          />
        }
      />
    </>
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
        <CardDescription className="text-xs">Focus on the centre dot with one eye covered.</CardDescription>
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
