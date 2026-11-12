"use client";

import { Activity, Bot, MessageCircleHeart, Send, Smile, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EntryField, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { BrainHologram } from "@/components/cosmic-shield/holograms";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganStage } from "@/components/cosmic-shield/organ-stage";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";

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
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

export function MindView() {
  return (
    <ModulePage slug="mind">
      <ModuleHero
        slug="mind"
        title={
          <>
            Mind &amp;
            <br />
            mood
          </>
        }
        primaryAction={{ label: "Check in now", anchor: "mind-log" }}
        stage={
          <OrganStage
            visual={<BrainHologram />}
            hotspots={[
              { id: "mood", x: 150, y: 150, side: "left", label: "Mood", icon: Smile, unit: "/5", field: "mood" },
              { id: "stress", x: 288, y: 166, side: "right", label: "Stress", icon: Activity, unit: "/5", field: "stress" },
              { id: "checkins", x: 272, y: 214, side: "right", label: "Check-ins", icon: MessageCircleHeart, anchor: "mind-history" },
              { id: "talk", x: 142, y: 212, side: "left", label: "Conversations", icon: Bot, field: "message" },
            ]}
          />
        }
        aside={
          <>
            <Card className="gap-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageCircleHeart className="size-4 text-primary" aria-hidden="true" />
                  This week
                </CardTitle>
                <CardDescription className="text-xs">Goal: one check-in a day.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between">
                {WEEK.map((d, i) => (
                  <span key={i} className="flex flex-col items-center gap-1.5">
                    <span className="size-6 rounded-full border border-dashed border-border bg-muted/40" />
                    <span className="font-mono text-[10px] text-muted-foreground">{d}</span>
                  </span>
                ))}
              </CardContent>
            </Card>
            <NextStepCard title="Take one minute" body="Rate mood and stress, add a note if something stands out." />
          </>
        }
      />

      <PageSection id="mind-log" eyebrow="Step 1" title="Check in & talk it through" description="Private to you and the flight surgeon. Nothing here diagnoses or prescribes.">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <EntryForm title="Daily check-in" description="Takes under a minute." footnote="Counts toward your check-in streak.">
            <SegmentedField label="Mood (1 low – 5 great)" name="mood" options={scale(5)} required />
            <SegmentedField label="Stress (1 calm – 5 overwhelmed)" name="stress" options={scale(5)} required />
            <EntryField label="Anything on your mind? (optional)" name="note" placeholder="Short note" maxLength={280} />
          </EntryForm>

          <Card className="min-h-[380px]">
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
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-full border border-nebula/40 bg-nebula/10 shadow-[0_0_30px_-8px_var(--nebula)]">
                <Bot className="size-7 text-nebula" aria-hidden="true" />
              </div>
              <p className="text-sm text-foreground/85">The AI companion connects in a later build.</p>
              <p className="max-w-md text-xs text-muted-foreground">
                It will listen, reflect and suggest coping techniques. It will not diagnose conditions or prescribe
                medication. Anything serious is routed to the flight surgeon.
              </p>
            </CardContent>
            <CardFooter className="gap-2 bg-transparent">
              <Input name="message" disabled placeholder="Type a message…" aria-label="Message" />
              <Button disabled size="icon" aria-label="Send">
                <Send />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PageSection>

      <PageSection id="mind-history" eyebrow="Step 2" title="History" description="Your past check-ins.">
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
      </PageSection>
    </ModulePage>
  );
}
