"use client";

import { Activity, Bot, MessageCircleHeart, Send, Smile, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EntryField, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { HowToMeasure } from "@/components/cosmic-shield/how-to-measure";
import { MissionContext } from "@/components/cosmic-shield/mission-context";
import { SectionHeader } from "@/components/cosmic-shield/section-header";
import { getSection } from "@/components/cosmic-shield/sections";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { ModuleGrid, ModuleRow } from "@/components/cosmic-shield/views/layout";

interface MindEntry {
  id: string;
  at: string;
  mood: number;
  stress: number;
  note: string;
  status: HealthStatus;
}

const entries: MindEntry[] = [];
const scale = (n: number) => Array.from({ length: n }, (_, i) => ({ value: `${i + 1}`, label: `${i + 1}` }));

export function MindView() {
  return (
    <>
      <SectionHeader section={getSection("mind")!} />
      <MissionContext module="mind" />

      <ModuleGrid>
        <StatusCard title="Mood" icon={Smile} unit="/5" reference="Self-rated" />
        <StatusCard title="Stress" icon={Activity} unit="/5" reference="Self-rated · HRV-informed" />
        <StatusCard title="Check-ins this week" icon={MessageCircleHeart} reference="Goal: daily" />
        <StatusCard title="Conversations" icon={Bot} reference="AI companion" />
      </ModuleGrid>

      <ModuleRow
        main={
          <Card className="min-h-[360px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-nebula" aria-hidden="true" />
                Talk it through
              </CardTitle>
              <CardDescription className="text-xs">
                A supportive conversation that combines how you feel with your HRV and sleep trends.
              </CardDescription>
              <CardAction>
                <StatusBadge status="no-data" label="Offline" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-nebula/40 bg-nebula/10">
                <Bot className="size-6 text-nebula" aria-hidden="true" />
              </div>
              <p className="text-sm text-foreground/85">The AI companion connects in a later build.</p>
              <p className="max-w-md text-xs text-muted-foreground">
                It will listen, reflect and suggest coping techniques. It will not diagnose conditions or
                prescribe medication. Anything serious is routed to the flight surgeon.
              </p>
            </CardContent>
            <CardFooter className="gap-2 bg-transparent">
              <Input disabled placeholder="Type a message…" aria-label="Message" />
              <Button disabled size="icon" aria-label="Send">
                <Send />
              </Button>
            </CardFooter>
          </Card>
        }
        side={
          <EntryForm title="Daily check-in" description="Takes under a minute." footnote="Counts toward your check-in streak.">
            <SegmentedField label="Mood (1 low – 5 great)" name="mood" options={scale(5)} required />
            <SegmentedField label="Stress (1 calm – 5 overwhelmed)" name="stress" options={scale(5)} required />
            <EntryField label="Anything on your mind? (optional)" name="note" placeholder="Short note" maxLength={280} />
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
              { key: "mood", header: "Mood", align: "right", cell: (r) => `${r.mood}/5` },
              { key: "stress", header: "Stress", align: "right", cell: (r) => `${r.stress}/5` },
              { key: "note", header: "Note", cell: (r) => <span className="block max-w-72 truncate">{r.note}</span> },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        }
        side={
          <HowToMeasure
            title="How to check in"
            duration="≈ 1 min"
            steps={[
              { title: "Pick a fixed time", detail: "End of the work shift works well for most crews." },
              { title: "Rate mood and stress honestly", detail: "Entries are private to you and the flight surgeon." },
              { title: "Add a note if something stands out", detail: "Sleep, workload, conflict, homesickness…" },
            ]}
            tip="Persistent low mood or high stress on 3+ days triggers a Watch, never an automatic diagnosis."
          />
        }
      />
    </>
  );
}
