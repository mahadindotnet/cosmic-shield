"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Activity, Bot, CalendarCheck, MessageCircleHeart, Smile, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Await } from "@/components/cosmic-shield/await";
import { EntryField, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganImage, OrganStage, onImage } from "@/components/cosmic-shield/organ-stage";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { CopilotChat, FormattedAnswer, SafetyLine } from "@/components/copilot/copilot-chat";
import { crisisResponse } from "@/lib/ai/safety";
import { SUPPORT_INTRO } from "@/lib/ai/support";
import { logCheckinAction, type LogCheckinState } from "@/lib/mind/actions";
import { MIND_LIMITS } from "@/lib/mind/rules";
import { NOTE_MAX } from "@/lib/mind/schema";
import type { MindSummary } from "@/lib/mind/summary";
import { addDays, type DailyPoint } from "@/lib/vitals/summary";

/** public/organs/mind.webp is 142 × 121. */
const MIND_ASPECT = 142 / 121;

export interface MindPageData {
  /** The signed-in crew member's check-ins; null for a flight surgeon. */
  summary: MindSummary | null;
  canEdit: boolean;
  /** YYYY-MM-DD (UTC). */
  today: string;
}

const scale = (n: number) => Array.from({ length: n }, (_, i) => ({ value: `${i + 1}`, label: `${i + 1}` }));
const toTrend = (p: DailyPoint[] | undefined): TrendPoint[] => (p ?? []).map((x) => ({ label: x.label, value: x.value }));
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

/** "13 Nov 20:00" (UTC). */
function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}`;
}

/**
 * Mind page: daily check-in, the support conversation, trends and history.
 * The frame renders at once; crew data streams in from `data`.
 */
export function MindView({ data }: { data: Promise<MindPageData> }) {
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
          <Await promise={data}>
            {(d) => {
              const s = d?.summary;
              const status = s?.pattern.status;
              return (
                <OrganStage
                  visual={<OrganImage src="/organs/mind.webp" alt="Brain" />}
                  hotspots={[
                    { id: "mood", ...onImage(0.24, 0.32, MIND_ASPECT), side: "left", label: "Mood", icon: Smile, unit: "/5", field: "mood", value: s?.latest?.mood ?? null, status: s?.latest ? (s.pattern.lowMood ? "watch" : "normal") : undefined },
                    { id: "talk", ...onImage(0.34, 0.62, MIND_ASPECT), side: "left", label: "Talk it through", icon: Bot, anchor: "mind-talk" },
                    { id: "stress", ...onImage(0.7, 0.3, MIND_ASPECT), side: "right", label: "Stress", icon: Activity, unit: "/5", field: "stress", value: s?.latest?.stress ?? null, status: s?.latest ? (s.pattern.highStress ? "watch" : "normal") : undefined },
                    { id: "checkins", ...onImage(0.74, 0.62, MIND_ASPECT), side: "right", label: "Check-ins", icon: MessageCircleHeart, anchor: "mind-history", value: s ? s.daysThisMonth : null, unit: "this month", status },
                  ]}
                />
              );
            }}
          </Await>
        }
        aside={
          <Await promise={data}>
            {(d) => (
              <>
                <WeekCard data={d} />
                <NextStepCard
                  title={d?.summary?.checkedInToday ? "Checked in today" : "Take one minute"}
                  body={d?.summary?.checkedInToday ? "Thanks. Come back tomorrow to keep your streak going." : "Rate mood and stress, add a note if something stands out."}
                />
              </>
            )}
          </Await>
        }
      />

      <PageSection id="mind-status" eyebrow="Now" title="How you've been" description="Your latest check-in and the 3-day pattern (app default, Watch only; not a screening tool).">
        <Await promise={data}>
          {(d) => {
            const s = d?.summary;
            const latest = s?.latest;
            const empty = !d ? "Loading…" : d.canEdit ? "No check-ins yet" : "Flight surgeons see check-in scores in Crew admin";
            const caption = latest ? `Checked in ${formatTime(latest.recordedAt)} UTC` : empty;
            return (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="mind-status-cards">
                <StatusCard title="Mood" icon={Smile} value={latest?.mood ?? null} unit="/5" status={latest ? (s!.pattern.lowMood ? "watch" : "normal") : undefined} caption={caption} reference={`Watch: ${MIND_LIMITS.lowMoodMax} or lower, ${MIND_LIMITS.consecutiveDays} days in a row`} />
                <StatusCard title="Stress" icon={Activity} value={latest?.stress ?? null} unit="/5" status={latest ? (s!.pattern.highStress ? "watch" : "normal") : undefined} caption={caption} reference={`Watch: ${MIND_LIMITS.highStressMin} or higher, ${MIND_LIMITS.consecutiveDays} days in a row`} />
                <StatusCard
                  title="3-day pattern"
                  icon={Sparkles}
                  value={s ? (s.pattern.status === "watch" ? "Watch" : "Normal") : null}
                  status={s ? s.pattern.status : undefined}
                  caption={s ? (s.pattern.reason ?? "No run of hard days.") : empty}
                  reference="Rule mind_pattern"
                />
                <StatusCard
                  title="Check-ins this month"
                  icon={CalendarCheck}
                  value={s ? s.daysThisMonth : null}
                  unit="days"
                  neutral
                  caption={s ? (s.checkedInToday ? "Checked in today" : "Not yet today") : empty}
                  reference="Each day counts toward your streak"
                />
              </div>
            );
          }}
        </Await>
      </PageSection>

      <PageSection id="mind-log" eyebrow="Step 1" title="Check in & talk it through" description="Scores are shared with the flight surgeon; your note and the conversation stay private to you.">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Await promise={data}>{(d) => <CheckinForm data={d} />}</Await>
          <Card id="mind-talk" className="min-h-[460px] scroll-mt-20 gap-0 p-0" data-testid="mind-support">
            <CardHeader className="border-b border-border/70 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-nebula" aria-hidden="true" />
                Talk it through
              </CardTitle>
              <CardDescription className="text-xs">A short, supportive check-in conversation. It listens and suggests simple steps; it never diagnoses or prescribes.</CardDescription>
            </CardHeader>
            <Await promise={data}>
              {(d) =>
                d && !d.canEdit ? (
                  <CardContent className="px-4 py-4 text-xs text-muted-foreground">The support conversation is for crew members. Flight surgeons see check-in scores and escalations in Crew admin.</CardContent>
                ) : (
                  <CopilotChat purpose="support" chatId="mind-support" intro={SUPPORT_INTRO} safetyLine placeholder="Type your reply…" className="min-h-[400px]" testId="mind-chat" />
                )
              }
            </Await>
          </Card>
        </div>
      </PageSection>

      <PageSection id="mind-trends" eyebrow="Trends" title="14-day mood and stress" description="The latest check-in of each day (UTC).">
        <Await promise={data}>
          {(d) => (
            <div className="grid gap-4 lg:grid-cols-2">
              <TrendChart title="Mood" description="1 low – 5 great" data={toTrend(d?.summary?.trends.mood)} unit="/5" yDomain={[0, 5]} colorSlot={2} height={180} testId="trend-mood" />
              <TrendChart title="Stress" description="1 calm – 5 overwhelmed" data={toTrend(d?.summary?.trends.stress)} unit="/5" yDomain={[0, 5]} colorSlot={3} height={180} testId="trend-stress" />
            </div>
          )}
        </Await>
      </PageSection>

      <PageSection id="mind-history" eyebrow="Step 2" title="History" description="Your past check-ins, newest first. Times are UTC.">
        <Await promise={data}>
          {(d) => (
            <HistoryTable
              testId="mind-history"
              rows={d?.summary?.history ?? []}
              getRowId={(r) => String(r.id)}
              rowProps={(r) => ({ "data-status": r.status, "data-testid": "mind-history-row" }) as React.ComponentProps<"tr">}
              emptyMessage={!d ? "Loading…" : d.canEdit ? undefined : "Flight surgeons see check-in scores in Crew admin."}
              columns={[
                { key: "at", header: "Time (UTC)", cell: (r) => (r.current ? formatTime(r.recordedAt) : <span className="text-muted-foreground line-through" title="A later check-in that day replaced this one">{formatTime(r.recordedAt)}</span>) },
                { key: "mood", header: "Mood", align: "right", cell: (r) => `${r.mood}/5` },
                { key: "stress", header: "Stress", align: "right", cell: (r) => (r.stress !== null ? `${r.stress}/5` : "—") },
                { key: "sleep", header: "Sleep quality", align: "right", cell: (r) => (r.sleepQuality !== null ? `${r.sleepQuality}/5` : "—") },
                { key: "note", header: "Note", cell: (r) => <span className="block max-w-72 truncate" title={r.note ?? undefined}>{r.note ?? "—"}</span> },
                { key: "src", header: "Source", cell: (r) => <span className="text-xs text-muted-foreground">{r.source === "seed" ? "Demo seed" : "Logged"}</span> },
                { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status as HealthStatus} /> },
              ]}
            />
          )}
        </Await>
      </PageSection>

      <SafetyLine className="glass mx-auto w-fit rounded-full px-4 py-2" />
    </ModulePage>
  );
}

/** The last 7 UTC days, filled where there was a check-in. */
function WeekCard({ data }: { data: MindPageData | null }) {
  const today = data?.today;
  const days = today ? Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)) : Array.from({ length: 7 }, () => "");
  const counts = data?.summary?.checkinsByDay ?? {};
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircleHeart className="size-4 text-primary" aria-hidden="true" />
          This week
        </CardTitle>
        <CardDescription className="text-xs">Goal: one check-in a day.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-between" data-testid="mind-week">
        {days.map((d, i) => {
          const done = Boolean(d && counts[d]);
          return (
            <span key={i} className="flex flex-col items-center gap-1.5" title={d ? `${d}: ${done ? "checked in" : "no check-in"}` : undefined}>
              <span
                data-done={done || undefined}
                className={done ? "size-6 rounded-full border border-primary/60 bg-primary/30" : "size-6 rounded-full border border-dashed border-border bg-muted/40"}
              />
              <span className="font-mono text-[10px] text-muted-foreground">{d ? WEEKDAY[new Date(`${d}T00:00:00Z`).getUTCDay()] : "·"}</span>
            </span>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CheckinForm({ data }: { data: MindPageData | null }) {
  const [state, formAction, pending] = useActionState<LogCheckinState, FormData>(logCheckinAction, {});
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (!state.savedAt || state.safety) return;
    toast.success("Check-in saved", { description: "It counts toward your streak." });
  }, [state.savedAt, state.safety]);

  return (
    <EntryForm
      title="Daily check-in"
      description="Takes under a minute."
      footnote="Counts toward your check-in streak."
      action={formAction}
      pending={pending}
      testId="checkin-form"
      disabledNote={!data ? "Loading…" : data.canEdit ? undefined : "Flight surgeons are view-only. Crew members check in for themselves."}
      message={
        state.ok ? (
          state.safety ? (
            <FormattedAnswer text={crisisResponse(state.environment ?? null)} safety testId="checkin-safety" />
          ) : (
            <p className="text-xs text-foreground" data-testid="checkin-result" role="status">
              Saved. Thanks for checking in.
            </p>
          )
        ) : state.error ? (
          <p className="text-xs text-escalate-foreground" role="alert" data-testid="checkin-error">
            {state.error}
          </p>
        ) : null
      }
    >
      <div key={state.savedAt ?? "draft"} className="flex flex-col gap-3">
        <SegmentedField label="Mood (1 low – 5 great)" name="mood" options={scale(5)} required defaultValue={v.mood} error={err.mood} />
        <SegmentedField label="Stress (1 calm – 5 overwhelmed)" name="stress" options={scale(5)} required defaultValue={v.stress} error={err.stress} />
        <SegmentedField label="Sleep quality (optional, 1 poor – 5 great)" name="sleepQuality" options={scale(5)} defaultValue={v.sleepQuality} error={err.sleepQuality} />
        <EntryField label="Anything on your mind? (optional)" name="note" placeholder="Short note, private to you" maxLength={NOTE_MAX} defaultValue={v.note} error={err.note} />
      </div>
    </EntryForm>
  );
}
