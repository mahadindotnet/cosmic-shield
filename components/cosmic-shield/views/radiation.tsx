"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { ExternalLink, OctagonAlert, Radiation, ShieldHalf, Sigma, Sun } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Await } from "@/components/cosmic-shield/await";
import { EntryField, EntryFieldGrid, EntryForm } from "@/components/cosmic-shield/entry-form";
import { RadiationHologram } from "@/components/cosmic-shield/holograms";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganStage } from "@/components/cosmic-shield/organ-stage";
import { RingGauge } from "@/components/cosmic-shield/ring-gauge";
import { StatusBadge } from "@/components/cosmic-shield/status";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { CAREER_DOSE_LIMIT_MSV, REFERENCE_RANGES as R } from "@/lib/health/reference-ranges";
import type { MissionEnvironment } from "@/lib/mission/environments";
import { logDoseAction, type LogDoseState } from "@/lib/radiation/actions";
import { RADIATION_LIMITS } from "@/lib/radiation/rules";
import { projectedMissionMsv, type RadiationSummary } from "@/lib/radiation/summary";
import type { SpaceWeatherView } from "@/lib/radiation/space-weather";
import { useMissionEnvironment } from "@/lib/store/mission-store";
import { ChooseEnvironmentPrompt } from "@/components/mission/choose-environment-prompt";

export interface RadiationPageData {
  /** The signed-in crew member's dose entries; null for a flight surgeon. */
  summary: RadiationSummary | null;
  canEdit: boolean;
  /** YYYY-MM-DD (UTC), the form's default and maximum day. */
  today: string;
}

const DONKI_LABELS: Record<string, string> = {
  FLR: "Solar flare",
  SEP: "Solar energetic particles",
  CME: "Coronal mass ejection",
  GST: "Geomagnetic storm",
};

/** "13 Nov 08:14" (UTC). */
function formatTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return `${day} ${time}`;
}
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const toTrend = (s: RadiationSummary | null | undefined): TrendPoint[] => (s?.trend ?? []).map((p) => ({ label: p.label, value: p.value }));

/** Projected dose for a full mission in this environment, and where the career would then stand. */
function projection(env: MissionEnvironment | null, careerMsv: number | null) {
  if (!env) return null;
  const mission = projectedMissionMsv(env.radiationMsvPerDay, env.missionDays);
  return { mission, careerAfter: careerMsv === null ? null : Math.round(careerMsv + mission) };
}

/**
 * Radiation page. The frame renders at once; the dose data and the DONKI
 * feed stream in separately from the server.
 */
export function RadiationView({ data, spaceWeather }: { data: Promise<RadiationPageData>; spaceWeather: Promise<SpaceWeatherView> }) {
  const env = useMissionEnvironment();
  const band = env ? { min: 0, max: env.radiationWatchMsvPerDay, label: "Below watch" } : R.radiationDay;

  return (
    <ModulePage slug="radiation">
      <ModuleHero
        slug="radiation"
        title={
          <>
            Radiation
            <br />
            exposure
          </>
        }
        stage={
          <Await promise={data}>
            {(d) => {
              const s = d?.summary;
              return (
                <OrganStage
                  visual={<RadiationHologram />}
                  hotspots={[
                    { id: "today", x: 200, y: 142, side: "right", label: "Latest", icon: Radiation, unit: "mSv/d", field: "doseMsv", value: s?.tile?.value ?? null, status: s?.tile?.status },
                    { id: "total", x: 128, y: 196, side: "left", label: "Career total", icon: Sigma, unit: "mSv", anchor: "radiation-status", value: s ? s.career.totalMsv : null, status: s?.career.status },
                    { id: "career", x: 236, y: 268, side: "right", label: "Career limit", icon: ShieldHalf, unit: "%", anchor: "radiation-status", value: s ? s.career.pctOfLimit : null, status: s?.career.status },
                    { id: "solar", x: 74, y: 84, side: "left", label: "Solar activity", icon: Sun, anchor: "radiation-solar" },
                  ]}
                />
              );
            }}
          </Await>
        }
        aside={
          <Await promise={data}>
            {(d) => {
              const career = d?.summary?.career ?? null;
              const p = projection(env, career?.totalMsv ?? null);
              return (
                <>
                <RingGauge
                  title="Career dose"
                  icon={ShieldHalf}
                  value={career?.totalMsv ?? null}
                  max={CAREER_DOSE_LIMIT_MSV}
                  unit="mSv"
                  caption="Sum of every dose entry, against the NASA-STD-3001 career limit for every astronaut."
                  marker={env && p?.careerAfter != null ? { value: p.careerAfter, label: `After a full ${env.missionDaysLabel.toLowerCase()} here: ≈ ${p.careerAfter} mSv` } : undefined}
                />
                {!env && <ChooseEnvironmentPrompt className="glass-strong" />}
                </>
              );
            }}
          </Await>
        }
      />

      <PageSection id="radiation-status" eyebrow="Now" title="Dose status" description="Your latest reading, your career total and what a full mission here would add.">
        <Await promise={data}>
          {(d) => {
            const s = d?.summary;
            const latest = s?.latest;
            const p = projection(env, s?.career.totalMsv ?? null);
            const empty = !d ? "Loading…" : d.canEdit ? "No readings logged yet" : "Flight surgeons review crew data in Crew admin";
            return (
              <div className="flex flex-col gap-3">
                {s?.career.status === "escalate" && (
                  <div role="alert" data-testid="radiation-escalate" className="flex gap-3 rounded-xl border border-escalate/45 bg-escalate/12 p-3">
                    <OctagonAlert className="mt-0.5 size-4 shrink-0 text-escalate-foreground" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-escalate-foreground">Contact the flight surgeon</p>
                      <p className="mt-1 text-xs text-foreground">{s.career.reason} An evidence record has been sent.</p>
                    </div>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="radiation-status-cards">
                  <StatusCard
                    title="Latest reading"
                    icon={Radiation}
                    value={latest ? latest.evaluation.rate : null}
                    unit="mSv/d"
                    status={latest?.evaluation.status}
                    caption={latest ? `${latest.doseMsv} mSv over ${latest.periodHours} h · ${formatTime(latest.recordedAt)} UTC` : empty}
                    reference={latest ? `Watch at ${latest.evaluation.watchLevel} mSv/d` : `Watch at ${band.max} mSv/d`}
                  >
                    {latest?.evaluation.reason && <p className="text-xs text-foreground">{latest.evaluation.reason}</p>}
                  </StatusCard>
                  <StatusCard
                    title="Career total"
                    icon={Sigma}
                    value={s ? s.career.totalMsv : null}
                    unit="mSv"
                    status={s?.career.status}
                    caption={s ? `${s.career.pctOfLimit} % of the ${CAREER_DOSE_LIMIT_MSV} mSv limit` : empty}
                    reference={`Watch ${RADIATION_LIMITS.careerWatch} · limit ${CAREER_DOSE_LIMIT_MSV} mSv`}
                  />
                  <StatusCard
                    title="Last 14 days"
                    icon={Radiation}
                    value={s ? s.windowTotalMsv : null}
                    unit="mSv"
                    neutral
                    caption={s ? "Logged in the trend window" : empty}
                    reference="Sum of readings"
                  />
                  <StatusCard
                    title="Projected mission dose"
                    icon={ShieldHalf}
                    value={p ? p.mission : null}
                    unit="mSv"
                    neutral
                    caption={env ? `${env.radiationMsvPerDay} mSv/d × ${env.missionDays} days (${env.radiation.basis})` : "No environment chosen"}
                    reference={env ? env.name : "No environment"}
                  >
                    {!env && <ChooseEnvironmentPrompt />}
                  </StatusCard>
                </div>
              </div>
            );
          }}
        </Await>
      </PageSection>

      <PageSection id="radiation-log" eyebrow="Step 1" title="Log dosimeter reading" description="Read your personal dosimeter at the same time every day.">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Await promise={data}>{(d) => <DoseForm data={d} env={env} />}</Await>
          <Await promise={data}>
            {(d) => (
              <TrendChart
                title="Daily dose"
                description={env ? `Typical on ${env.name}: ${env.radiationMsvPerDay} mSv/d (${env.radiation.basis}: ${env.radiation.sourceLabel})` : "Mean daily rate of each day's readings."}
                data={toTrend(d?.summary)}
                unit="mSv/d"
                baseline={band}
                yDomain={[0, Math.max(2, Math.ceil(band.max * 1.4))]}
                colorSlot={3}
                height={240}
                testId="trend-dose"
              />
            )}
          </Await>
        </div>
      </PageSection>

      <PageSection id="radiation-solar" eyebrow="Space weather" title="Solar storm alerts" description="Flares, coronal mass ejections, solar energetic particle events and geomagnetic storms from NASA's DONKI database.">
        <Await promise={spaceWeather}>{(sw) => <SpaceWeatherCard sw={sw} env={env} />}</Await>
      </PageSection>

      <PageSection id="radiation-history" eyebrow="Step 2" title="History" description="Every dosimeter reading, newest first. Times are UTC.">
        <Await promise={data}>
          {(d) => (
            <HistoryTable
              testId="radiation-history"
              rows={d?.summary?.history ?? []}
              getRowId={(r) => String(r.id)}
              rowProps={(r) => ({ "data-status": r.status, "data-testid": "radiation-history-row" }) as React.ComponentProps<"tr">}
              emptyMessage={!d ? "Loading…" : d.canEdit ? undefined : "Flight surgeons review crew data in Crew admin."}
              columns={[
                { key: "at", header: "Time (UTC)", cell: (r) => formatTime(r.recordedAt) },
                { key: "dose", header: "Dose", align: "right", cell: (r) => `${r.doseMsv} mSv` },
                { key: "period", header: "Period", align: "right", cell: (r) => (r.periodHours % 24 === 0 && r.periodHours > 24 ? `${r.periodHours / 24} d` : `${r.periodHours} h`) },
                { key: "rate", header: "Rate", align: "right", cell: (r) => `${r.rate} mSv/d` },
                { key: "env", header: "Environment", cell: (r) => <span className="text-xs text-muted-foreground">{r.environment ?? "—"}</span> },
                { key: "src", header: "Source", cell: (r) => <span className="text-xs text-muted-foreground" title={r.note ?? undefined}>{r.source === "seed" ? "Demo seed" : r.source === "device" ? "Device" : "Logged"}</span> },
                {
                  key: "status",
                  header: "Status",
                  cell: (r) => (
                    <span title={r.reason}>
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

/** DONKI events with a badge saying whether they are live or cached, and when they were fetched. */
function SpaceWeatherCard({ sw, env }: { sw: SpaceWeatherView | null; env: MissionEnvironment | null }) {
  const badge = !sw ? "Loading…" : sw.origin === "live" ? "Live · NASA DONKI" : `Cached · NASA DONKI${sw.fetchedAt ? `, fetched ${shortDate(sw.fetchedAt)}` : ""}`;
  return (
    <Card data-testid="donki-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sun className="size-4 text-primary" aria-hidden="true" />
          Recent solar events
        </CardTitle>
        <CardDescription className="text-xs">
          {env ? `If a particle event is announced on ${env.name}: ${env.shelter}` : "Shelter instructions adapt to your mission environment."}
          {sw?.startDate && sw.endDate ? ` Window ${sw.startDate} → ${sw.endDate}.` : ""}
        </CardDescription>
        <CardAction>
          <span
            data-testid="donki-source"
            data-origin={sw?.origin ?? "loading"}
            className="inline-flex h-5 items-center rounded-full border border-primary/30 bg-primary/10 px-2 font-mono text-[10px] font-medium tracking-wider text-primary uppercase"
          >
            {badge}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sw && (
          <ul className="flex flex-wrap gap-2" aria-label="Feeds">
            {sw.feeds.map((f) => (
              <li key={f.type} className="rounded-lg border border-border bg-background/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                {DONKI_LABELS[f.type] ?? f.type}: <span className="font-mono text-foreground">{f.ok ? (f.count ?? "—") : "unavailable"}</span>
              </li>
            ))}
          </ul>
        )}
        {!sw ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : sw.events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events in this window.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/70" data-testid="donki-events">
            {sw.events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="text-foreground">
                  <span className="font-mono text-muted-foreground">{e.start_time.replace("T", " ").replace("Z", " UTC")}</span> · {DONKI_LABELS[e.type] ?? e.type}
                  {e.class_or_intensity ? ` · ${e.class_or_intensity}` : ""}
                </span>
                {e.link && (
                  <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    DONKI <ExternalLink className="size-3" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">Space weather is context, not a health status: it never changes your dose status on its own.</p>
      </CardContent>
    </Card>
  );
}

function DoseForm({ data, env }: { data: RadiationPageData | null; env: MissionEnvironment | null }) {
  const [state, formAction, pending] = useActionState<LogDoseState, FormData>(logDoseAction, {});
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (!state.savedAt) return;
    if (state.careerStatus === "escalate") toast.error("Reading saved: career limit exceeded", { description: "Contact the flight surgeon." });
    else if (state.status === "watch" || state.careerStatus === "watch") toast.warning("Reading saved: Watch", { description: state.reasons?.join(" ") });
    else toast.success("Reading saved: Normal");
  }, [state.savedAt, state.status, state.careerStatus, state.reasons]);

  const worst = state.careerStatus === "escalate" ? "escalate" : state.status === "watch" || state.careerStatus === "watch" ? "watch" : "normal";
  return (
    <EntryForm
      title="Log dosimeter reading"
      description={env ? `Saved for ${env.name}.` : "Saved without an environment (default Watch level). Choose one in the top bar."}
      action={formAction}
      pending={pending}
      testId="dose-form"
      disabledNote={!data ? "Loading…" : data.canEdit ? undefined : "Flight surgeons are view-only. Crew members log their own readings."}
      message={
        state.ok ? (
          <p className="flex flex-wrap items-center gap-2 text-xs text-foreground" data-testid="dose-result" role="status">
            Saved: {state.rate} mSv/d, career {state.careerTotalMsv} mSv. <StatusBadge status={worst} />
            {state.reasons?.[0]}
          </p>
        ) : state.error ? (
          <p className="text-xs text-escalate-foreground" role="alert" data-testid="dose-error">
            {state.error}
          </p>
        ) : null
      }
    >
      <div key={state.savedAt ?? "draft"} className="flex flex-col gap-3">
        <EntryFieldGrid>
          <EntryField label="Day" name="day" type="date" required max={data?.today} defaultValue={v.day ?? data?.today} error={err.day} />
          <EntryField label="Dose" name="doseMsv" unit="mSv" type="number" inputMode="decimal" step="any" min={0} max={500} required defaultValue={v.doseMsv} error={err.doseMsv} />
        </EntryFieldGrid>
        <EntryField
          label="Period covered"
          name="periodHours"
          unit="h"
          type="number"
          inputMode="numeric"
          step="any"
          min={1}
          max={720}
          required
          defaultValue={v.periodHours ?? "24"}
          hint="24 for a daily reading."
          error={err.periodHours}
        />
        <EntryField label="Note (optional)" name="note" maxLength={200} placeholder="e.g. dosimeter CPD-04, EVA day" defaultValue={v.note} error={err.note} />
      </div>
    </EntryForm>
  );
}
