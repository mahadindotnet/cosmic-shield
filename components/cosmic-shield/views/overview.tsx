"use client";

import Link from "next/link";
import {
  Bell,
  Dumbbell,
  Eye,
  Gauge,
  Droplets,
  HeartPulse,
  Moon,
  Radiation,
  Smile,
  Sun,
  type LucideIcon,
} from "lucide-react";
import spaceWeather from "@/data/nasa/fixtures/space-weather.json";
import { Await } from "@/components/cosmic-shield/await";
import { BodyMap } from "@/components/cosmic-shield/body-map";
import {
  HBars,
  MiniChart,
  StatPanel,
  type MiniPoint,
} from "@/components/cosmic-shield/dashboard-stats";
import { MissionContext } from "@/components/cosmic-shield/mission-context";
import {
  getSection,
  type SectionSlug,
} from "@/components/cosmic-shield/sections";
import {
  StatusBadge,
  type HealthStatus,
} from "@/components/cosmic-shield/status";
import { StreakPanel } from "@/components/cosmic-shield/streak-panel";
import {
  CAREER_DOSE_LIMIT_MSV,
  REFERENCE_RANGES as R,
} from "@/lib/health/reference-ranges";
import {
  MISSION_ENVIRONMENTS,
  projectedMissionDose,
  type MissionEnvironment,
} from "@/lib/mission/environments";
import { useMissionEnvironment } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";
import { ChooseEnvironmentPrompt } from "@/components/mission/choose-environment-prompt";
import type { TileReading } from "@/lib/vitals/summary";

/** Server data for the signed-in crew member (null for a flight surgeon or while loading). */
export interface OverviewData {
  vitals: {
    tile: TileReading | null;
    /** Daily mean heart rate, last 7 days, oldest first. */
    heartRateWeek: (number | null)[];
  };
  sleep: {
    /** Latest night: metric label (e.g. "Sleep last night"), hours, status. */
    tile: { metric: string; value: string; unit: string; status: "normal" | "watch" } | null;
    /** Sleep hours, last 7 nights, oldest first. */
    week: MiniPoint[];
  };
  radiation: {
    /** Latest reading's daily rate and status. */
    tile: { metric: string; value: string; unit: string; status: "normal" | "watch" } | null;
    /** Sum of every dose entry, mSv, and its status against the career limit. */
    careerMsv: number;
    careerStatus: "normal" | "watch" | "escalate";
  };
}

const NO_DATA: Promise<OverviewData | null> = Promise.resolve(null);

/** Key point shown on each module tile: one reading, nothing else. */
interface TileDef {
  slug: Exclude<SectionSlug, "overview" | "mission">;
  metric: string;
  unit?: string;
  value?: string | null;
  status?: HealthStatus;
}

const LEFT: TileDef[] = [
  { slug: "vitals", metric: "Heart rate", unit: "bpm" },
  { slug: "sleep-stress", metric: "Sleep last night", unit: "h" },
  { slug: "radiation", metric: "Latest dose", unit: "mSv/d" },
  { slug: "bone", metric: "Exercise today", unit: "min" },
];
const RIGHT: TileDef[] = [
  { slug: "eyes", metric: "Last screening" },
  { slug: "gi", metric: "Hydration today", unit: "L" },
  { slug: "mind", metric: "Mood", unit: "/10" },
];

const WEEK = ["6d", "5d", "4d", "3d", "2d", "1d", "Today"];
const FORTNIGHT = Array.from({ length: 14 }, (_, i) =>
  i === 13 ? "Today" : i % 3 === 1 ? `${13 - i}d` : "",
);

/**
 * `earlyWarning`: server-rendered pattern alerts for the signed-in crew member (shown first).
 * `data`: the crew member's latest readings, read on the server. Only the
 * blocks that show them wait for it; the body map and layout render at once.
 */
export function OverviewView({
  earlyWarning,
  data = NO_DATA,
}: {
  earlyWarning?: React.ReactNode;
  data?: Promise<OverviewData | null>;
}) {
  const env = useMissionEnvironment();
  const withData = (t: TileDef) =>
    t.slug === "vitals" || t.slug === "sleep-stress" || t.slug === "radiation" ? (
      <Await key={t.slug} promise={data}>
        {(d) => {
          const tile = t.slug === "vitals" ? d?.vitals.tile : t.slug === "sleep-stress" ? d?.sleep.tile : d?.radiation.tile;
          return (
            <ModuleTile
              {...(tile ? { ...t, metric: tile.metric, value: tile.value, unit: tile.unit, status: tile.status } : t)}
            />
          );
        }}
      </Await>
    ) : (
      <ModuleTile key={t.slug} {...t} />
    );

  return (
    <div className="flex flex-col gap-10 pb-6">
      {/* Title lives in the top bar and the Instructions popup. */}
      <h1 className="sr-only">{getSection("overview")!.title}</h1>

      {earlyWarning}

      <div id="overview-mission" className="-mb-6 scroll-mt-20">
        <MissionContext showPicker={false} />
      </div>

      {/* Body map with module tiles on either side */}
      <section
        aria-label="Body map and modules"
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(400px,500px)_minmax(0,1fr)]"
      >
        <div
          id="overview-body"
          className="relative order-first flex scroll-mt-20 items-center justify-center rounded-2xl border border-(--glass-border) bg-(--glass) px-16 py-10 backdrop-blur-(--glass-blur) lg:order-none lg:col-start-2 lg:row-start-1"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(60%_50%_at_50%_45%,oklch(0.82_0.12_210/10%),transparent)]"
          />
          <BodyMap className="xl:max-w-[310px]" />
        </div>

        <div
          id="overview-modules"
          className="grid scroll-mt-20 gap-3 sm:grid-cols-2 lg:col-start-1 lg:row-start-1 lg:auto-rows-fr lg:grid-cols-1"
        >
          {LEFT.map(withData)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-start-3 lg:row-start-1 lg:auto-rows-fr lg:grid-cols-1">
          {RIGHT.map((t) => (
            <ModuleTile key={t.slug} {...t} />
          ))}
          <div className="flex items-center gap-3 rounded-xl border border-(--glass-border) bg-(--glass) px-4 py-3 backdrop-blur-(--glass-blur)">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/50">
              <Bell
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">Alerts</p>
              <p className="text-[11px] text-muted-foreground">
                <span aria-hidden="true">—</span>
                <span className="sr-only">Alert summary not available yet</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Statistics env={env} data={data} />

      <section aria-labelledby="streak-heading" className="flex flex-col gap-4">
        <SectionTitle
          id="streak-heading"
          eyebrow="Gamification"
          title="Streak"
        />
        <StreakPanel />
      </section>
    </div>
  );
}

function Statistics({ env, data }: { env: MissionEnvironment | null; data: Promise<OverviewData | null> }) {
  const hrData = (d: OverviewData | null): MiniPoint[] =>
    (d?.vitals.heartRateWeek ?? []).map((value, i) => ({ label: WEEK[i] ?? "", value }));
  const hrDomain: [number, number] = [
    Math.floor((R.heartRate.min * 0.8) / 10) * 10,
    Math.ceil((R.heartRate.max * 1.15) / 10) * 10,
  ];
  const projected = env ? Math.round(projectedMissionDose(env)) : null;

  const feeds = spaceWeather.feeds;
  const latest = spaceWeather.events[0];

  return (
    <section
      id="overview-stats"
      aria-labelledby="stats-heading"
      className="flex scroll-mt-20 flex-col gap-4"
    >
      <SectionTitle
        id="stats-heading"
        eyebrow="Statistics"
        title="Trends at a glance"
        note="Crew charts fill in as entries are logged. Reference charts use NASA data."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatPanel
          icon={HeartPulse}
          title="Heart rate"
          keyPoint={`7 days · normal ${R.heartRate.min}–${R.heartRate.max} bpm`}
          href="/dashboard/vitals"
        >
          <Await promise={data}>
            {(d) => (
              <MiniChart
                kind="line"
                data={hrData(d)}
                window={WEEK}
                unit="bpm"
                seriesLabel="Heart rate"
                colorSlot={1}
                band={R.heartRate}
                yDomain={hrDomain}
              />
            )}
          </Await>
        </StatPanel>

        <StatPanel
          icon={Moon}
          title="Sleep"
          keyPoint={`7 nights · target ${R.sleepHours.min}–${R.sleepHours.max} h`}
          href="/dashboard/sleep-stress"
        >
          <Await promise={data}>
            {(d) => (
              <MiniChart
                kind="bar"
                data={d?.sleep.week ?? []}
                window={WEEK}
                unit="h"
                seriesLabel="Sleep"
                colorSlot={2}
                band={R.sleepHours}
                yDomain={[0, 10]}
              />
            )}
          </Await>
        </StatPanel>

        <StatPanel
          icon={Dumbbell}
          title="Exercise"
          keyPoint={`7 days · target ${env?.exerciseTargetMin ?? R.exerciseMinutes.min} min/day`}
          href="/dashboard/bone"
        >
          <MiniChart
            kind="bar"
            data={[]}
            window={WEEK}
            unit="min"
            seriesLabel="Exercise"
            colorSlot={4}
            target={env?.exerciseTargetMin ?? R.exerciseMinutes.min}
            yDomain={[0, 180]}
          />
        </StatPanel>

        <StatPanel
          icon={Droplets}
          title="Hydration"
          keyPoint={`7 days · target ${R.hydration.min}–${R.hydration.max} L`}
          href="/dashboard/gi"
        >
          <MiniChart
            kind="bar"
            data={[]}
            window={WEEK}
            unit="L"
            seriesLabel="Hydration"
            colorSlot={1}
            band={R.hydration}
            yDomain={[0, 4]}
          />
        </StatPanel>

        <StatPanel
          icon={Smile}
          title="Mood"
          keyPoint="14 days · self-rated 0–10"
          href="/dashboard/mind"
        >
          <MiniChart
            kind="line"
            data={[]}
            window={FORTNIGHT}
            unit="/10"
            seriesLabel="Mood"
            colorSlot={2}
            yDomain={[0, 10]}
          />
        </StatPanel>

        <Await promise={data}>
          {(d) => (
            <StatPanel
              icon={Radiation}
              title="Career dose"
              keyPoint={d ? `${d.radiation.careerMsv} of ${CAREER_DOSE_LIMIT_MSV} mSv logged` : `Limit ${CAREER_DOSE_LIMIT_MSV} mSv`}
              href="/dashboard/radiation"
              testId="stat-career-dose"
            >
              <CareerDoseMeter
                logged={d?.radiation.careerMsv ?? null}
                status={d?.radiation.careerStatus ?? null}
                projected={projected}
                missionLabel={env?.missionDaysLabel ?? null}
              />
            </StatPanel>
          )}
        </Await>

        <StatPanel
          icon={Gauge}
          title="Daily dose by environment"
          keyPoint="Dose equivalent, NASA RadLab and published"
          href="/dashboard/mission"
          testId="stat-env-dose"
        >
          <HBars
            unit="mSv/d"
            colorSlot={3}
            rows={MISSION_ENVIRONMENTS.map((m) => ({
              id: m.id,
              label: m.name,
              value: m.radiation.mSvPerDay,
              tag: m.radiation.basis,
              highlight: env ? m.id === env.id : true,
            }))}
          />
        </StatPanel>

        <StatPanel
          icon={Sun}
          title="Space weather"
          keyPoint={`NASA DONKI · ${feeds.find((f) => f.status === "ok" && "start_date" in f)?.start_date ?? ""} → ${feeds.find((f) => f.status === "ok" && "end_date" in f)?.end_date ?? ""}`}
          testId="stat-space-weather"
        >
          <HBars
            unit=""
            colorSlot={4}
            digits={0}
            rows={feeds.map((f) => ({
              id: f.type,
              label: DONKI_LABELS[f.type] ?? f.type,
              value:
                f.status === "ok" && "event_count" in f
                  ? (f.event_count ?? null)
                  : null,
              missing: "Feed unavailable",
              highlight: true,
            }))}
          />
          {latest && (
            <p className="truncate border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
              Latest: <span className="text-foreground">{latest.type}</span>{" "}
              {latest.start_time.slice(0, 10)}
              {latest.class_or_intensity
                ? ` · ${latest.class_or_intensity}`
                : ""}
            </p>
          )}
        </StatPanel>

        <StatPanel
          icon={Eye}
          title="Eye screening"
          keyPoint={
            env
              ? `SANS check ${env.sansCadence.toLowerCase()}`
              : "SANS and Amsler"
          }
          href="/dashboard/eyes"
        >
          <dl className="grid grid-cols-2 gap-3">
            {[
              { k: "Last fundus scan", v: "—" },
              { k: "Last Amsler test", v: "—" },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-lg border border-border bg-background/40 px-3 py-2.5"
              >
                <dt className="text-[11px] text-muted-foreground">{x.k}</dt>
                <dd className="mt-0.5 font-mono text-xl text-muted-foreground/60">
                  {x.v}
                </dd>
              </div>
            ))}
          </dl>
        </StatPanel>
      </div>
    </section>
  );
}

const DONKI_LABELS: Record<string, string> = {
  FLR: "Solar flares",
  SEP: "Particle events",
  CME: "CMEs",
  GST: "Geomag. storms",
};

function SectionTitle({
  id,
  eyebrow,
  title,
  note,
}: {
  id: string;
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="glass flex flex-wrap items-end justify-between gap-x-6 gap-y-2 rounded-2xl px-5 py-4">
      <div>
        <p className="console-label">{eyebrow}</p>
        <h2
          id={id}
          className="text-halo mt-1 font-heading text-xl font-medium text-foreground"
        >
          {title}
        </h2>
      </div>
      {note && (
        <p className="text-halo text-xs text-muted-foreground">{note}</p>
      )}
    </div>
  );
}

function ModuleTile({ slug, metric, unit, value = null, status }: TileDef) {
  const s = getSection(slug)!;
  const Icon: LucideIcon = s.icon;
  const has = value !== null && value !== "";
  return (
    <Link
      href={s.href}
      data-testid={`tile-${slug}`}
      data-status={has ? (status ?? "normal") : "no-data"}
      className="group flex items-center gap-3 rounded-xl border border-(--glass-border) bg-(--glass) px-4 py-3 backdrop-blur-(--glass-blur) transition-colors hover:border-primary/40 hover:bg-card/85 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 transition-colors group-hover:border-primary/50">
        <Icon className="size-5 text-primary" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">
          {s.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{metric}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            "font-mono text-xl tabular-nums",
            has ? "text-foreground" : "text-muted-foreground/50",
          )}
        >
          {has ? value : "—"}
          {has && unit && (
            <span className="ml-0.5 text-[11px] text-muted-foreground">
              {unit}
            </span>
          )}
        </span>
        <StatusBadge
          status={has ? (status ?? "normal") : "no-data"}
          className="h-4 px-1.5 text-[9px]"
        />
      </div>
    </Link>
  );
}

function CareerDoseMeter({
  logged,
  status,
  projected,
  missionLabel,
}: {
  /** Sum of dose entries, mSv; null before data (or for a flight surgeon). */
  logged: number | null;
  status: "normal" | "watch" | "escalate" | null;
  /** Projected dose for a full mission in the chosen environment, mSv. */
  projected: number | null;
  missionLabel: string | null;
}) {
  const pct = (v: number) =>
    `${Math.min(100, (v / CAREER_DOSE_LIMIT_MSV) * 100)}%`;
  const after = logged !== null && projected !== null ? Math.round(logged + projected) : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-3xl text-foreground tabular-nums" data-testid="career-dose-value">
            {logged ?? "—"}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            / {CAREER_DOSE_LIMIT_MSV} mSv career limit
          </span>
        </div>
        {status && <StatusBadge status={status} />}
      </div>
      <div
        className="relative h-3 rounded-full bg-muted/50"
        role="meter"
        aria-label="Career dose logged"
        aria-valuemin={0}
        aria-valuemax={CAREER_DOSE_LIMIT_MSV}
        aria-valuenow={logged ?? 0}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-(--chart-3)"
          style={{ width: pct(logged ?? 0) }}
        />
        {after !== null && (
          <span
            className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground/80"
            style={{ left: pct(after) }}
            title={`After a full mission here: ${after} mSv`}
          />
        )}
      </div>
      {projected === null ? (
        <ChooseEnvironmentPrompt />
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {after !== null
            ? `Marker: ≈ ${after} mSv after a full ${missionLabel?.toLowerCase()} here (+${projected} mSv)`
            : "Sum of your dose entries"}
        </p>
      )}
    </div>
  );
}
