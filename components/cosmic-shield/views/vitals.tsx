"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Activity, Droplet, HeartPulse, OctagonAlert, Wind } from "lucide-react";
import { Await } from "@/components/cosmic-shield/await";
import { EntryField, EntryFieldGrid, EntryForm } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganImage, OrganStage, onImage } from "@/components/cosmic-shield/organ-stage";
import { StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import thresholds from "@/data/rules/thresholds.json";
import { REFERENCE_RANGES as R } from "@/lib/health/reference-ranges";
import { logVitalsAction, type LogVitalsState } from "@/lib/vitals/actions";
import { escalateGuidance, remeasureFirst } from "@/lib/vitals/escalation";
import type { MeasureCheck, VitalsMeasure } from "@/lib/vitals/rules";
import type { DailyPoint, VitalsSummary } from "@/lib/vitals/summary";

/** public/organs/heart.webp is 739 × 900. */
const HEART_ASPECT = 739 / 900;

export interface GlucoseReference {
  min: number;
  max: number;
  label: string;
  source: string;
  detail: string;
}

export interface VitalsPageData {
  /** The signed-in crew member's vitals; null for a flight surgeon. */
  summary: VitalsSummary | null;
  /** False for flight surgeons (view-only). */
  canEdit: boolean;
  /** Inspiration4 pre-flight glucose range (NASA OSDR OSD-575). */
  glucoseRef: GlucoseReference | null;
}

const toTrend = (points: DailyPoint[] | undefined): TrendPoint[] =>
  (points ?? []).map((p) => ({ label: p.label, value: p.value }));

/** "13 Nov 08:14" (UTC, station time). */
function formatTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return `${day} ${time}`;
}

/** Helpers over one page-data snapshot (null while loading). */
function view(d: VitalsPageData | null) {
  const latest = d?.summary?.latest ?? null;
  const check = (m: VitalsMeasure): MeasureCheck | undefined => latest?.evaluation.checks.find((c) => c.measure === m);
  return {
    latest,
    trends: d?.summary?.trends,
    status: (m: VitalsMeasure): HealthStatus | undefined => check(m)?.status,
    value: (m: VitalsMeasure) => check(m)?.display ?? null,
    takenAt: latest ? `Taken ${formatTime(latest.recordedAt)} UTC` : undefined,
    emptyCaption: !d ? "Loading…" : d.canEdit ? "No readings logged yet" : "Flight surgeons review crew data in Crew admin",
  };
}

/**
 * Vitals page. The frame renders at once; every block that shows crew data
 * streams in from `data` (read on the server, rules applied on read).
 */
export function VitalsView({ data }: { data: Promise<VitalsPageData> }) {
  return (
    <ModulePage slug="vitals">
      <ModuleHero
        slug="vitals"
        title={
          <>
            Heart &amp;
            <br />
            vitals
          </>
        }
        stage={
          <Await promise={data}>
            {(d) => {
              const { value, status } = view(d);
              return (
                <OrganStage
                  visual={<OrganImage src="/organs/heart.webp" alt="Anatomical heart (AI-generated illustration)" aiGenerated />}
                  hotspots={[
                    { id: "hr", ...onImage(0.66, 0.72, HEART_ASPECT), side: "right", label: "Heart rate", icon: HeartPulse, unit: "bpm", field: "heartRate", value: value("heartRate"), status: status("heartRate") },
                    { id: "bp", ...onImage(0.6, 0.2, HEART_ASPECT), side: "right", label: "Blood pressure", icon: Activity, unit: "mmHg", field: "systolic", value: value("bloodPressure"), status: status("bloodPressure") },
                    { id: "spo2", ...onImage(0.27, 0.17, HEART_ASPECT), side: "left", label: "SpO₂", icon: Wind, unit: "%", field: "spo2", value: value("spo2"), status: status("spo2") },
                    { id: "glucose", ...onImage(0.22, 0.6, HEART_ASPECT), side: "left", label: "Glucose", icon: Droplet, unit: "mg/dL", field: "glucose", value: value("glucose"), status: status("glucose") },
                  ]}
                />
              );
            }}
          </Await>
        }
        aside={
          <Await promise={data}>
            {(d) => {
              const { latest, takenAt, emptyCaption } = view(d);
              const level = latest?.evaluation.status;
              const flagged = latest?.evaluation.reasons ?? [];
              return (
                <>
                  <StatusCard
                    title="Latest reading"
                    icon={HeartPulse}
                    value={latest ? (level === "escalate" ? "Escalate" : level === "watch" ? "Watch" : "Normal") : null}
                    status={latest?.evaluation.status}
                    caption={latest ? takenAt : emptyCaption}
                    reference={latest ? `${flagged.length} measure${flagged.length === 1 ? "" : "s"} flagged` : undefined}
                    className="min-h-0"
                  >
                    {flagged.length > 0 && (
                      <ul className="flex flex-col gap-1 text-xs text-foreground" data-testid="vitals-latest-reasons">
                        {flagged.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </StatusCard>
                  {level === "escalate" ? (
                    <EscalateNotice guidance={latest ? escalateGuidance(latest.evaluation) : []} remeasure={!!latest && remeasureFirst(latest.evaluation)} />
                  ) : (
                    <NextStepCard
                      title={level === "watch" ? "Re-check in 30 minutes" : "Log today's vitals"}
                      body={
                        level === "watch"
                          ? "Rest seated for five minutes and take the flagged measure again. If it stays in Watch, follow onboard guidance."
                          : "One set of readings takes about five minutes. Tap a callout to jump to its field."
                      }
                    />
                  )}
                </>
              );
            }}
          </Await>
        }
      />

      <PageSection
        id="vitals-status"
        eyebrow="Now"
        title="Latest status"
        description="Each measure from your most recent reading, checked against its Watch levels (app defaults, see docs/rules.md)."
      >
        <Await promise={data}>
          {(d) => {
            const { latest, value, status, takenAt, emptyCaption } = view(d);
            const glucoseRef = d?.glucoseRef ?? null;
            const caption = latest ? takenAt : emptyCaption;
            return (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="vitals-status-cards">
                <StatusCard title="Heart rate" icon={HeartPulse} value={value("heartRate")} unit="bpm" status={status("heartRate")} caption={caption} reference={`Normal ${R.heartRate.min}–${R.heartRate.max} bpm`} />
                <StatusCard title="Blood pressure" icon={Activity} value={value("bloodPressure")} unit="mmHg" status={status("bloodPressure")} caption={caption} reference={`Normal ${R.systolic.min}–${R.systolic.max} / <${R.diastolic.max}`} />
                <StatusCard title="SpO₂" icon={Wind} value={value("spo2")} unit="%" status={status("spo2")} caption={caption} reference={`Normal above ${R.spo2.min}% · Escalate below ${thresholds.vitals.spo2Pct.escalateBelow}% (WHO)`} />
                <StatusCard
                  title="Glucose"
                  icon={Droplet}
                  value={value("glucose")}
                  unit="mg/dL"
                  status={status("glucose")}
                  caption={latest ? (latest.glucose === null ? "Not measured in the latest reading" : takenAt) : emptyCaption}
                  reference={`Normal ${R.glucose.min}–${R.glucose.max} mg/dL`}
                >
                  {glucoseRef && (
                    <p className="text-[11px] text-muted-foreground" data-testid="glucose-crew-reference" title={`${glucoseRef.source}. ${glucoseRef.detail}`}>
                      {glucoseRef.label}: {glucoseRef.min}–{glucoseRef.max} mg/dL
                    </p>
                  )}
                </StatusCard>
              </div>
            );
          }}
        </Await>
      </PageSection>

      <PageSection
        id="vitals-log"
        eyebrow="Step 1"
        title="Log a reading"
        description="Take heart rate, SpO₂ and blood pressure together, after five minutes of rest."
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Await promise={data}>{(d) => <VitalsForm canEdit={d ? d.canEdit : null} />}</Await>
          <Await promise={data}>
            {(d) => (
              <TrendChart
                title="Heart rate"
                description="Daily mean, last 14 days"
                data={toTrend(view(d).trends?.heartRate)}
                unit="bpm"
                baseline={R.heartRate}
                colorSlot={1}
                height={260}
                testId="trend-heart-rate"
              />
            )}
          </Await>
        </div>
      </PageSection>

      <PageSection id="vitals-trends" eyebrow="Trends" title="14-day trends" description="Daily means. The shaded band is where readings count as Normal.">
        <Await promise={data}>
          {(d) => {
            const trends = view(d).trends;
            const glucoseRef = d?.glucoseRef ?? null;
            return (
              <div className="grid gap-4 lg:grid-cols-2">
                <TrendChart title="Systolic pressure" seriesLabel="Systolic" data={toTrend(trends?.systolic)} unit="mmHg" baseline={R.systolic} colorSlot={4} height={180} />
                <TrendChart title="Diastolic pressure" seriesLabel="Diastolic" data={toTrend(trends?.diastolic)} unit="mmHg" baseline={R.diastolic} colorSlot={4} height={180} />
                <TrendChart title="Oxygen saturation" seriesLabel="SpO₂" data={toTrend(trends?.spo2)} unit="%" baseline={R.spo2} yDomain={[88, 100]} colorSlot={1} height={180} />
                <TrendChart
                  title="Glucose"
                  description={glucoseRef ? `Violet band: ${glucoseRef.label}, pre-flight, ${glucoseRef.source}` : undefined}
                  data={toTrend(trends?.glucose)}
                  unit="mg/dL"
                  baseline={R.glucose}
                  reference={glucoseRef ?? undefined}
                  colorSlot={3}
                  height={180}
                  testId="trend-glucose"
                />
              </div>
            );
          }}
        </Await>
      </PageSection>

      <PageSection id="vitals-history" eyebrow="Step 2" title="History" description="Every reading, newest first. Times are UTC (station time).">
        <Await promise={data}>
          {(d) => (
            <HistoryTable
              testId="vitals-history"
              rows={d?.summary?.history ?? []}
              getRowId={(r) => String(r.id)}
              rowProps={(r) => ({ "data-status": r.status, "data-testid": "vitals-history-row" }) as React.ComponentProps<"tr">}
              emptyMessage={!d ? "Loading…" : d.canEdit ? undefined : "Flight surgeons review crew data in Crew admin."}
              columns={[
                { key: "at", header: "Time (UTC)", cell: (r) => formatTime(r.recordedAt) },
                { key: "hr", header: "HR", align: "right", cell: (r) => r.heartRate },
                { key: "bp", header: "BP", align: "right", cell: (r) => `${r.systolic}/${r.diastolic}` },
                { key: "spo2", header: "SpO₂", align: "right", cell: (r) => `${r.spo2}%` },
                { key: "glu", header: "Glucose", align: "right", cell: (r) => r.glucose ?? "—" },
                {
                  key: "src",
                  header: "Source",
                  cell: (r) => (
                    <span className="text-xs text-muted-foreground">{r.source === "seed" ? "Demo seed" : r.source === "device" ? "Device" : "Logged"}</span>
                  ),
                },
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

/** `canEdit` is null while the session is still loading (no fields to type into yet). */
function VitalsForm({ canEdit }: { canEdit: boolean | null }) {
  const [state, formAction, pending] = useActionState<LogVitalsState, FormData>(logVitalsAction, {});
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (!state.savedAt) return;
    if (state.status === "escalate") toast.error("Reading saved: Escalate", { description: state.guidance?.join(" ") });
    else if (state.status === "watch") toast.warning("Reading saved: Watch", { description: state.reasons?.join(" ") });
    else toast.success("Reading saved: Normal");
  }, [state.savedAt, state.status, state.reasons, state.guidance]);

  return (
    <EntryForm
      title="Log vitals"
      description="Enter one set of readings taken together."
      action={formAction}
      pending={pending}
      testId="vitals-form"
      disabledNote={canEdit === null ? "Loading…" : canEdit ? undefined : "Flight surgeons are view-only. Crew members log their own vitals."}
      message={
        state.ok ? (
          <div className="flex flex-col gap-2" data-testid="vitals-result" role="status">
            <p className="flex flex-wrap items-center gap-2 text-xs text-foreground">
              Saved. <StatusBadge status={state.status ?? "normal"} />
              {state.reasons?.[0]}
            </p>
            {state.status === "escalate" && <EscalateNotice compact guidance={state.guidance ?? []} />}
          </div>
        ) : state.error ? (
          <p className="text-xs text-escalate-foreground" role="alert" data-testid="vitals-error">
            {state.error}
          </p>
        ) : null
      }
    >
      {/* Re-mount after each save so the fields clear; keep typed values after a rejected submit. */}
      <div key={state.savedAt ?? "draft"} className="flex flex-col gap-3">
        <EntryFieldGrid>
          <EntryField label="Heart rate" name="heartRate" unit="bpm" type="number" inputMode="numeric" min={20} max={250} required defaultValue={v.heartRate} error={err.heartRate} />
          <EntryField label="SpO₂" name="spo2" unit="%" type="number" inputMode="numeric" min={50} max={100} required defaultValue={v.spo2} error={err.spo2} />
          <EntryField label="Systolic" name="systolic" unit="mmHg" type="number" inputMode="numeric" min={50} max={250} required defaultValue={v.systolic} error={err.systolic} />
          <EntryField label="Diastolic" name="diastolic" unit="mmHg" type="number" inputMode="numeric" min={30} max={150} required defaultValue={v.diastolic} error={err.diastolic} />
        </EntryFieldGrid>
        <EntryField label="Glucose (optional)" name="glucose" unit="mg/dL" type="number" inputMode="decimal" min={20} max={600} step="any" defaultValue={v.glucose} error={err.glucose} />
      </div>
    </EntryForm>
  );
}

/**
 * "Contact the flight surgeon" guidance for an Escalate reading, one line per
 * escalating measure. Icon + text, never colour alone.
 */
function EscalateNotice({ guidance, compact, remeasure }: { guidance: string[]; compact?: boolean; remeasure?: boolean }) {
  return (
    <div
      role="alert"
      data-testid="escalate-guidance"
      className="flex gap-3 rounded-xl border border-escalate/45 bg-escalate/12 p-3 text-left"
    >
      <OctagonAlert className="mt-0.5 size-4 shrink-0 text-escalate-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-escalate-foreground">
          {remeasure ? "Re-measure, then contact the flight surgeon" : "Contact the flight surgeon"}
        </p>
        <ul className="mt-1 flex flex-col gap-1 text-xs text-foreground">
          {guidance.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {compact ? "An evidence record was sent with this reading." : "An evidence record has been sent with this reading."}
        </p>
      </div>
    </div>
  );
}
