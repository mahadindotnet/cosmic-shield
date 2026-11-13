"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { CalendarRange, Dumbbell, Milk, Sun, Timer } from "lucide-react";
import { Await } from "@/components/cosmic-shield/await";
import { EntryField, EntryFieldGrid, EntryForm } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganImage, OrganStage, onImage } from "@/components/cosmic-shield/organ-stage";
import { RingGauge } from "@/components/cosmic-shield/ring-gauge";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { ChooseEnvironmentPrompt } from "@/components/mission/choose-environment-prompt";
import { logBoneAction, type LogBoneState } from "@/lib/bone/actions";
import { BONE_LIMITS } from "@/lib/bone/rules";
import type { BoneSummary } from "@/lib/bone/summary";
import { useMissionEnvironment } from "@/lib/store/mission-store";
import type { DailyPoint } from "@/lib/vitals/summary";

/** public/organs/bone.webp is 1100 × 921 (front and back skeletons). */
const BONE_ASPECT = 1100 / 921;

export interface BonePageData {
  /** The signed-in crew member's logs; null for a flight surgeon. */
  summary: BoneSummary | null;
  canEdit: boolean;
  /** YYYY-MM-DD (UTC). */
  today: string;
}

const toTrend = (p: DailyPoint[] | undefined): TrendPoint[] => (p ?? []).map((x) => ({ label: x.label, value: x.value }));
const shortDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
const n = (v: number | null, unit: string) => (v === null ? "—" : `${v} ${unit}`);

/**
 * Bone protection: exercise (aerobic, resistance with load) and calcium /
 * vitamin D per day, against the environment's exercise target. All targets
 * are app defaults. The frame renders at once; crew data streams in.
 */
export function BoneView({ data }: { data: Promise<BonePageData> }) {
  const env = useMissionEnvironment();
  return (
    <ModulePage slug="bone">
      <ModuleHero
        slug="bone"
        title={
          <>
            Bone
            <br />
            protection
          </>
        }
        stage={
          <Await promise={data}>
            {(d) => {
              const t = d?.summary?.today;
              return (
                <OrganStage
                  visual={<OrganImage src="/organs/bone.webp" alt="Human skeleton, front and back views" />}
                  hotspots={[
                    { id: "exercise", ...onImage(0.21, 0.6, BONE_ASPECT), side: "left", label: "Exercise today", icon: Timer, unit: "min", field: "aerobicMinutes", value: t && d?.summary?.loggedToday ? t.totalMinutes : null },
                    { id: "vitd", ...onImage(0.26, 0.84, BONE_ASPECT), side: "left", label: "Vitamin D", icon: Sun, unit: "IU", field: "vitaminDIu", value: t && d?.summary?.loggedToday ? t.vitaminDIu : null },
                    { id: "calcium", ...onImage(0.76, 0.32, BONE_ASPECT), side: "right", label: "Calcium", icon: Milk, unit: "mg", field: "calciumMg", value: t && d?.summary?.loggedToday ? t.calciumMg : null },
                    { id: "load", ...onImage(0.83, 0.71, BONE_ASPECT), side: "right", label: "Peak load", icon: Dumbbell, unit: "kg", field: "loadKg", value: t?.peakLoadKg ?? null },
                  ]}
                />
              );
            }}
          </Await>
        }
        aside={
          <Await promise={data}>
            {(d) => {
              const s = d?.summary;
              return (
                <>
                  <RingGauge
                    title="Exercise today"
                    icon={Timer}
                    value={s ? s.today.totalMinutes : null}
                    max={s?.dailyTargetMin ?? env?.exerciseTargetMin ?? BONE_LIMITS.defaultDailyExerciseMin}
                    unit="min"
                    caption={
                      env
                        ? `Daily target on ${env.name}: ${s?.dailyTargetMin ?? env.exerciseTargetMin} min (app default).`
                        : `Daily target ${BONE_LIMITS.defaultDailyExerciseMin} min (app default) until you choose an environment.`
                    }
                  />
                  {!env && <ChooseEnvironmentPrompt className="glass-strong" text="Choose your mission environment in the top bar to tailor your exercise target" />}
                  <NextStepCard title="Log after each session" body="Each day with exercise logged earns streak points." />
                </>
              );
            }}
          </Await>
        }
      />

      <PageSection id="bone-status" eyebrow="Now" title="Today and this week" description="Exercise against your environment's target, and calcium and vitamin D against their daily targets. All targets are app defaults.">
        <Await promise={data}>
          {(d) => {
            const s = d?.summary;
            const empty = !d ? "Loading…" : d.canEdit ? "No entries yet: log your first session" : "Flight surgeons review crew in Crew admin";
            const today = s?.loggedToday ? s.today : null;
            return (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="bone-status-cards">
                <StatusCard
                  title="Exercise today"
                  icon={Timer}
                  value={today ? today.totalMinutes : null}
                  unit="min"
                  neutral
                  caption={today ? `${today.aerobicMinutes} aerobic · ${today.resistanceMinutes} resistance` : s ? "Nothing logged today yet" : empty}
                  reference={`Target ${s?.dailyTargetMin ?? BONE_LIMITS.defaultDailyExerciseMin} min/day · app default`}
                />
                <StatusCard
                  title="Last 7 days"
                  icon={CalendarRange}
                  value={s && s.week.status !== "no-data" ? s.week.totalMinutes : null}
                  unit="min"
                  status={s && s.week.status !== "no-data" ? s.week.status : undefined}
                  caption={s && s.week.status !== "no-data" ? `${s.week.pct} % of ${s.week.targetMinutes} min · ${s.week.daysLogged} days logged` : empty}
                  reference={`Watch below ${Math.round(BONE_LIMITS.weeklyWatchFraction * 100)} % of the weekly target`}
                >
                  {s?.week.reason && <p className="text-xs text-foreground">{s.week.reason}</p>}
                </StatusCard>
                <StatusCard
                  title="Calcium today"
                  icon={Milk}
                  value={today ? today.calciumMg : null}
                  unit="mg"
                  neutral
                  caption={today ? `${Math.round((today.calciumMg / BONE_LIMITS.calciumMgPerDay) * 100)} % of the daily target` : s ? "Nothing logged today yet" : empty}
                  reference={`Target ${BONE_LIMITS.calciumMgPerDay} mg/day · app default`}
                />
                <StatusCard
                  title="Vitamin D today"
                  icon={Sun}
                  value={today ? today.vitaminDIu : null}
                  unit="IU"
                  neutral
                  caption={today ? `${Math.round((today.vitaminDIu / BONE_LIMITS.vitaminDIuPerDay) * 100)} % of the daily target` : s ? "Nothing logged today yet" : empty}
                  reference={`Target ${BONE_LIMITS.vitaminDIuPerDay} IU/day · app default`}
                />
              </div>
            );
          }}
        </Await>
      </PageSection>

      <PageSection id="bone-log" eyebrow="Step 1" title="Log countermeasures" description="Exercise and calcium / vitamin D intake for a day. Several logs on one day add up.">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Await promise={data}>{(d) => <BoneForm data={d} />}</Await>
          <Await promise={data}>
            {(d) => {
              const target = d?.summary?.dailyTargetMin ?? env?.exerciseTargetMin ?? BONE_LIMITS.defaultDailyExerciseMin;
              return (
                <TrendChart
                  title="Exercise minutes"
                  description="Total per day (aerobic + resistance), last 14 days."
                  data={toTrend(d?.summary?.trends.exercise)}
                  unit="min"
                  baseline={{ min: target, max: target + 60, label: "Target (app default)" }}
                  yDomain={[0, 240]}
                  colorSlot={2}
                  height={260}
                  testId="trend-exercise"
                />
              );
            }}
          </Await>
        </div>
      </PageSection>

      <PageSection id="bone-trends" eyebrow="Trends" title="Calcium and vitamin D" description="Daily intake, last 14 days. The band starts at the daily target (app default).">
        <Await promise={data}>
          {(d) => (
            <div className="grid gap-4 lg:grid-cols-2">
              <TrendChart
                title="Calcium"
                data={toTrend(d?.summary?.trends.calcium)}
                unit="mg"
                baseline={{ min: BONE_LIMITS.calciumMgPerDay, max: BONE_LIMITS.calciumMgPerDay * 1.5, label: "Target (app default)" }}
                yDomain={[0, 2000]}
                colorSlot={1}
                height={180}
              />
              <TrendChart
                title="Vitamin D"
                data={toTrend(d?.summary?.trends.vitaminD)}
                unit="IU"
                baseline={{ min: BONE_LIMITS.vitaminDIuPerDay, max: BONE_LIMITS.vitaminDIuPerDay * 1.5, label: "Target (app default)" }}
                yDomain={[0, 2000]}
                colorSlot={4}
                height={180}
              />
            </div>
          )}
        </Await>
      </PageSection>

      <PageSection id="bone-history" eyebrow="Step 2" title="History" description="Every log, newest first.">
        <Await promise={data}>
          {(d) => (
            <HistoryTable
              testId="bone-history"
              rows={d?.summary?.history ?? []}
              getRowId={(r) => String(r.id)}
              rowProps={() => ({ "data-testid": "bone-history-row" }) as React.ComponentProps<"tr">}
              emptyMessage={!d ? "Loading…" : d.canEdit ? undefined : "Flight surgeons review crew in Crew admin."}
              columns={[
                { key: "day", header: "Day", cell: (r) => shortDay(r.day) },
                { key: "aer", header: "Aerobic", align: "right", cell: (r) => n(r.aerobicMinutes, "min") },
                { key: "res", header: "Resistance", align: "right", cell: (r) => n(r.resistanceMinutes, "min") },
                { key: "load", header: "Load", align: "right", cell: (r) => (r.loadKg === null ? "—" : r.reps ? `${r.loadKg} kg × ${r.reps}` : `${r.loadKg} kg`) },
                { key: "ca", header: "Calcium", align: "right", cell: (r) => n(r.calciumMg, "mg") },
                { key: "vd", header: "Vit D", align: "right", cell: (r) => n(r.vitaminDIu, "IU") },
                { key: "src", header: "Source", cell: (r) => <span className="text-xs text-muted-foreground">{r.source === "seed" ? "Demo seed" : "Logged"}</span> },
              ]}
            />
          )}
        </Await>
      </PageSection>
    </ModulePage>
  );
}

function BoneForm({ data }: { data: BonePageData | null }) {
  const [state, formAction, pending] = useActionState<LogBoneState, FormData>(logBoneAction, {});
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (state.savedAt) toast.success("Countermeasures saved", { description: state.minutes ? "A day with exercise earns streak points." : undefined });
  }, [state.savedAt, state.minutes]);

  return (
    <EntryForm
      title="Log countermeasures"
      description="Fill in what you did; leave the rest blank."
      footnote="Each day with exercise logged earns streak points."
      action={formAction}
      pending={pending}
      testId="bone-form"
      disabledNote={!data ? "Loading…" : data.canEdit ? undefined : "Flight surgeons are view-only. Crew members log their own countermeasures."}
      message={
        state.ok ? (
          <p className="text-xs text-foreground" data-testid="bone-result" role="status">
            Saved{state.minutes ? `: ${state.minutes} min of exercise` : ""}.
          </p>
        ) : state.error ? (
          <p className="text-xs text-escalate-foreground" role="alert" data-testid="bone-error">
            {state.error}
          </p>
        ) : null
      }
    >
      <div key={state.savedAt ?? "draft"} className="flex flex-col gap-3">
        <EntryField label="Day" name="day" type="date" required max={data?.today} defaultValue={v.day ?? data?.today} error={err.day} />
        <EntryFieldGrid>
          <EntryField label="Aerobic" name="aerobicMinutes" unit="min" type="number" inputMode="numeric" min={0} max={600} defaultValue={v.aerobicMinutes} error={err.aerobicMinutes} />
          <EntryField label="Resistance" name="resistanceMinutes" unit="min" type="number" inputMode="numeric" min={0} max={600} defaultValue={v.resistanceMinutes} error={err.resistanceMinutes} />
          <EntryField label="Load" name="loadKg" unit="kg" type="number" inputMode="decimal" step="any" min={0} max={500} hint="Resistance load per rep" defaultValue={v.loadKg} error={err.loadKg} />
          <EntryField label="Reps" name="reps" type="number" inputMode="numeric" min={0} max={2000} hint="Total reps at that load" defaultValue={v.reps} error={err.reps} />
          <EntryField label="Calcium" name="calciumMg" unit="mg" type="number" inputMode="numeric" min={0} max={5000} defaultValue={v.calciumMg} error={err.calciumMg} />
          <EntryField label="Vitamin D" name="vitaminDIu" unit="IU" type="number" inputMode="numeric" min={0} max={10000} defaultValue={v.vitaminDIu} error={err.vitaminDIu} />
        </EntryFieldGrid>
        <EntryField label="Note (optional)" name="note" maxLength={200} placeholder="e.g. ARED squats, treadmill" defaultValue={v.note} error={err.note} />
      </div>
    </EntryForm>
  );
}
