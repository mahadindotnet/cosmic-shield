"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Activity, BedDouble, Gauge, Moon } from "lucide-react";
import { Await } from "@/components/cosmic-shield/await";
import { EntryField, EntryFieldGrid, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { SleepHologram } from "@/components/cosmic-shield/holograms";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganStage } from "@/components/cosmic-shield/organ-stage";
import { SleepStages } from "@/components/cosmic-shield/sleep-stages";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { REFERENCE_RANGES as R } from "@/lib/health/reference-ranges";
import { logSleepAction, type LogSleepState } from "@/lib/sleep/actions";
import { SLEEP_LIMITS, type SleepMeasure } from "@/lib/sleep/rules";
import type { SleepSummary } from "@/lib/sleep/summary";
import type { DailyPoint } from "@/lib/vitals/summary";

export interface SleepPageData {
  /** The signed-in crew member's nights; null for a flight surgeon. */
  summary: SleepSummary | null;
  canEdit: boolean;
  /** YYYY-MM-DD (UTC): today, and last night (the form's default). */
  today: string;
  lastNight: string;
}

const toTrend = (points: DailyPoint[] | undefined): TrendPoint[] => (points ?? []).map((p) => ({ label: p.label, value: p.value }));
const scale = (n: number) => Array.from({ length: n }, (_, i) => ({ value: `${i + 1}`, label: `${i + 1}` }));

/** "12 Nov" from YYYY-MM-DD. */
const nightLabel = (night: string) =>
  new Date(`${night}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });

function view(d: SleepPageData | null) {
  const latest = d?.summary?.latest ?? null;
  const check = (m: SleepMeasure) => latest?.evaluation.checks.find((c) => c.measure === m);
  return {
    latest,
    trends: d?.summary?.trends,
    status: (m: SleepMeasure): HealthStatus | undefined => check(m)?.status,
    value: (m: SleepMeasure) => check(m)?.display ?? null,
    caption: latest ? `Night of ${nightLabel(latest.night)}` : !d ? "Loading…" : d.canEdit ? "No nights logged yet" : "Flight surgeons review crew data in Crew admin",
  };
}

/**
 * Sleep & Stress page. The frame renders at once; blocks with crew data
 * stream in from `data` (read on the server, rules applied on read).
 */
export function SleepStressView({ data }: { data: Promise<SleepPageData> }) {
  return (
    <ModulePage slug="sleep-stress">
      <ModuleHero
        slug="sleep-stress"
        title={
          <>
            Sleep &amp;
            <br />
            recovery
          </>
        }
        stage={
          <Await promise={data}>
            {(d) => {
              const { latest, value, status } = view(d);
              return (
                <OrganStage
                  visual={<SleepHologram />}
                  hotspots={[
                    { id: "sleep", x: 140, y: 150, side: "left", label: "Sleep", icon: Moon, unit: "h", field: "sleepHours", value: value("sleepHours"), status: status("sleepHours") },
                    { id: "quality", x: 166, y: 262, side: "left", label: "Quality", icon: BedDouble, unit: "/5", field: "quality", value: latest?.quality ?? null },
                    { id: "hrv", x: 300, y: 312, side: "right", label: "HRV", icon: Activity, unit: "ms", field: "hrvRmssd", value: value("hrv"), status: status("hrv") },
                    { id: "stress", x: 286, y: 196, side: "right", label: "Stress", icon: Gauge, unit: "/5", field: "stress", value: value("stress"), status: status("stress") },
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
                <TrendChart
                  title="Sleep duration"
                  description="Last 14 nights"
                  data={toTrend(view(d).trends?.sleepHours)}
                  unit="h"
                  baseline={R.sleepHours}
                  yDomain={[0, 12]}
                  colorSlot={2}
                  height={150}
                  emptyWindow={14}
                />
                <NextStepCard title="Log last night" body="Fill this in right after waking, before coffee or exercise." />
              </>
            )}
          </Await>
        }
      />

      <PageSection id="sleep-stress-status" eyebrow="Now" title="Last night" description="Your most recent night, checked against its Watch levels (app defaults, see docs/rules.md).">
        <Await promise={data}>
          {(d) => {
            const { latest, value, status, caption } = view(d);
            const band = d?.summary?.hrvBand;
            return (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="sleep-status-cards">
                <StatusCard title="Sleep" icon={Moon} value={value("sleepHours")} unit="h" status={status("sleepHours")} caption={caption} reference={`Watch at or below ${SLEEP_LIMITS.sleepHoursWatchLow} h`} />
                <StatusCard
                  title="HRV (RMSSD)"
                  icon={Activity}
                  value={value("hrv")}
                  unit="ms"
                  status={status("hrv")}
                  caption={latest && latest.hrvRmssd === null ? "Not measured that night" : caption}
                  reference={band ? `Your 14-night mean ${band.mean} ms` : `Watch at or below ${SLEEP_LIMITS.hrvWatchLow} ms`}
                />
                <StatusCard title="Stress" icon={Gauge} value={value("stress")} unit="/5" status={status("stress")} caption={caption} reference={`Watch at ${SLEEP_LIMITS.stressWatchHigh}/5 or above`} />
                <StatusCard
                  title="Sleep quality"
                  icon={BedDouble}
                  value={latest?.quality ?? null}
                  unit="/5"
                  neutral
                  caption={caption}
                  reference="Self-rated, not scored"
                />
              </div>
            );
          }}
        </Await>
      </PageSection>

      <PageSection id="sleep-stress-log" eyebrow="Step 1" title="Log sleep & stress" description="Hours, quality, morning HRV and how stressed you feel.">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Await promise={data}>{(d) => <SleepForm data={d} />}</Await>
          <div className="grid gap-6">
            <Await promise={data}>
              {(d) => {
                const band = d?.summary?.hrvBand;
                return (
                  <TrendChart
                    title="Heart-rate variability"
                    description="RMSSD each night. The band is your own 14-night mean ±10 %; three nights below it can raise an early warning."
                    seriesLabel="HRV"
                    data={toTrend(view(d).trends?.hrvRmssd)}
                    unit="ms"
                    baseline={band ? { min: band.min, max: band.max, label: "Your mean ±10 %" } : undefined}
                    colorSlot={1}
                    height={180}
                    testId="trend-hrv"
                  />
                );
              }}
            </Await>
            <Await promise={data}>
              {(d) => (
                <TrendChart title="Stress" description="Self-rated, 1 calm – 5 overwhelmed" seriesLabel="Stress" data={toTrend(view(d).trends?.stress)} unit="/5" yDomain={[0, 5]} colorSlot={3} height={140} />
              )}
            </Await>
            <SleepStages />
          </div>
        </div>
      </PageSection>

      <PageSection id="sleep-stress-history" eyebrow="Step 2" title="History" description="Every night logged, newest first. A newer entry for the same night replaces the older one in trends and alerts.">
        <Await promise={data}>
          {(d) => (
            <HistoryTable
              testId="sleep-history"
              rows={d?.summary?.history ?? []}
              getRowId={(r) => String(r.id)}
              rowProps={(r) => ({ "data-status": r.status, "data-testid": "sleep-history-row", "data-current": r.current }) as React.ComponentProps<"tr">}
              emptyMessage={!d ? "Loading…" : d.canEdit ? undefined : "Flight surgeons review crew data in Crew admin."}
              columns={[
                { key: "night", header: "Night", cell: (r) => (r.current ? nightLabel(r.night) : <span className="text-muted-foreground line-through" title="Replaced by a newer entry">{nightLabel(r.night)}</span>) },
                { key: "sleep", header: "Sleep", align: "right", cell: (r) => `${r.sleepHours} h` },
                { key: "q", header: "Quality", align: "right", cell: (r) => (r.quality ? `${r.quality}/5` : "—") },
                { key: "hrv", header: "HRV", align: "right", cell: (r) => (r.hrvRmssd !== null ? `${r.hrvRmssd} ms` : "—") },
                { key: "stress", header: "Stress", align: "right", cell: (r) => (r.stress ? `${r.stress}/5` : "—") },
                { key: "src", header: "Source", cell: (r) => <span className="text-xs text-muted-foreground">{r.source === "seed" ? "Demo seed" : r.source === "device" ? "Device" : "Logged"}</span> },
                {
                  key: "status",
                  header: "Status",
                  cell: (r) => (
                    <span title={r.reasons.join(" ")}>
                      <StatusBadge status={r.status} />
                    </span>
                  ),
                },
              ]}
            />
          )}
        </Await>
      </PageSection>
    </ModulePage>
  );
}

function SleepForm({ data }: { data: SleepPageData | null }) {
  const [state, formAction, pending] = useActionState<LogSleepState, FormData>(logSleepAction, {});
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (!state.savedAt) return;
    if (state.status === "watch") toast.warning("Night saved: Watch", { description: state.reasons?.join(" ") });
    else toast.success("Night saved: Normal");
  }, [state.savedAt, state.status, state.reasons]);

  return (
    <EntryForm
      title="Log sleep & stress"
      description="Fill in after waking. Pick an earlier night to catch up."
      action={formAction}
      pending={pending}
      testId="sleep-form"
      disabledNote={!data ? "Loading…" : data.canEdit ? undefined : "Flight surgeons are view-only. Crew members log their own nights."}
      message={
        state.ok ? (
          <p className="flex flex-wrap items-center gap-2 text-xs text-foreground" data-testid="sleep-result" role="status">
            Saved night of {state.night && nightLabel(state.night)}. <StatusBadge status={state.status ?? "normal"} />
            {state.reasons?.[0]}
          </p>
        ) : state.error ? (
          <p className="text-xs text-escalate-foreground" role="alert" data-testid="sleep-error">
            {state.error}
          </p>
        ) : null
      }
    >
      <div key={state.savedAt ?? "draft"} className="flex flex-col gap-3">
        <EntryField
          label="Night of"
          name="night"
          type="date"
          required
          max={data?.today}
          defaultValue={v.night ?? data?.lastNight}
          hint="The date you went to sleep (UTC)."
          error={err.night}
        />
        <EntryFieldGrid>
          <EntryField label="Sleep" name="sleepHours" unit="h" type="number" inputMode="decimal" step="0.1" min={0} max={16} required defaultValue={v.sleepHours} error={err.sleepHours} />
          <EntryField label="HRV (optional)" name="hrvRmssd" unit="ms" type="number" inputMode="decimal" step="any" min={5} max={250} hint="RMSSD from your morning reading." defaultValue={v.hrvRmssd} error={err.hrvRmssd} />
        </EntryFieldGrid>
        <SegmentedField label="Sleep quality (1 poor – 5 great)" name="quality" options={scale(5)} required defaultValue={v.quality} error={err.quality} />
        <SegmentedField label="Stress (1 calm – 5 overwhelmed)" name="stress" options={scale(5)} required defaultValue={v.stress} error={err.stress} />
      </div>
    </EntryForm>
  );
}
