"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import {
  BedDouble,
  Bot,
  ClipboardCheck,
  Coffee,
  HeartPulse,
  Lightbulb,
  MessageCircleHeart,
  Moon,
  ChevronRight,
  Sunrise,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { showCopilotComingSoon } from "@/components/cosmic-shield/copilot-button";
import { StatusBadge } from "@/components/cosmic-shield/status";
import { dismissAlertAction } from "@/lib/alerts/actions";
import type { HrvSleepDeclineResult } from "@/lib/rules/hrv-sleep-decline";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** "2026-11-12" → "12 Nov" (fixed format, no locale differences between server and client). */
const shortDate = (d: string) =>
  `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const signed = (v: number, digits = 1) =>
  `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(digits)}`;

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

const MAY_MEAN = [
  "Accumulated fatigue that hasn't been recovered yet.",
  "Workload stress building up over several days.",
  "A disrupted sleep schedule, for example after shift changes.",
];

const NEXT_STEPS: { icon: LucideIcon; text: string }[] = [
  {
    icon: BedDouble,
    text: "Protect your next sleep period and keep a consistent schedule.",
  },
  {
    icon: Lightbulb,
    text: "Follow the station's sleep-shift lighting schedule.",
  },
  { icon: Coffee, text: "Ease your workload where you can over the next day." },
  { icon: Wind, text: "Try a few minutes of slow breathing before sleep." },
];

/**
 * Calm early-warning card for the `hrv_sleep_decline` pattern. Amber (Watch),
 * never red; fades in and draws its lines once, and stays still under
 * prefers-reduced-motion. Wording is non-diagnostic throughout.
 */
export function EarlyWarningCard({
  result,
}: {
  result: HrvSleepDeclineResult;
}) {
  const reduced = usePrefersReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();
  const b = result.baseline!;
  const flaggedNights = new Set(result.flagged.map((f) => f.night));
  const avgHrvPct =
    result.flagged.reduce((a, f) => a + f.hrvPctVsBaseline, 0) /
    result.flagged.length;

  const rows = result.recent.map((n) => ({
    label: shortDate(n.night),
    night: n.night,
    hrv: n.hrvMs,
    sleep: n.sleepHours,
    flagged: flaggedNights.has(n.night),
  }));
  const firstFlagged = rows.find((r) => r.flagged)?.label;
  const lastFlagged = rows.at(-1)?.label;

  if (dismissed) return null;

  return (
    <section
      data-testid="early-warning-card"
      aria-labelledby="ew-headline"
      className="relative overflow-hidden rounded-2xl border border-watch/30 bg-card/80 p-5 pl-6 backdrop-blur-md motion-safe:animate-[ew-fade_700ms_ease-out_both] md:p-6 md:pl-7"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-watch/70"
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status="watch" />
        <p className="console-label">Early warning · last 3 nights</p>
      </div>
      <h2
        id="ew-headline"
        className="mt-3 font-heading text-xl font-medium text-foreground md:text-2xl"
      >
        HRV has dropped for three nights. Sleep is down.
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Here&apos;s what this pattern may mean, and what you can do next.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <MiniTrend
          title="HRV"
          keyPoint={`About ${Math.abs(Math.round(avgHrvPct))}% below your baseline on each flagged night`}
          icon={HeartPulse}
          rows={rows}
          dataKey="hrv"
          unit="ms"
          colorSlot={1}
          band={{ mean: b.hrv.mean, sd: b.hrv.sd }}
          flaggedRange={[firstFlagged, lastFlagged]}
          animate={!reduced}
          digits={0}
        />
        <MiniTrend
          title="Sleep"
          keyPoint={`${result.sleepAvg!.toFixed(1)} h average vs your usual ${b.sleep.mean.toFixed(1)} h`}
          icon={Moon}
          rows={rows}
          dataKey="sleep"
          unit="h"
          colorSlot={2}
          band={{ mean: b.sleep.mean, sd: b.sleep.sd }}
          flaggedRange={[firstFlagged, lastFlagged]}
          animate={!reduced}
          digits={1}
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="console-label mb-2">What this may mean</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-foreground/90">
            {MAY_MEAN.map((m) => (
              <li key={m} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-watch/70"
                />
                {m}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            These are possibilities, not a finding.
          </p>
        </div>
        <div>
          <h3 className="console-label mb-2">What you can do next</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-foreground/90">
            {NEXT_STEPS.map((s) => (
              <li key={s.text} className="flex gap-2">
                <s.icon
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {s.text}
              </li>
            ))}
          </ul>
          <ul className="mt-3 flex flex-col gap-1.5 border-t border-border/60 pt-3 text-sm text-foreground/90">
            <li className="flex gap-2">
              <Sunrise
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              Re-check tomorrow morning.
            </li>
            <li className="flex gap-2">
              <MessageCircleHeart
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              Talk to your Crew Medical Officer if it continues or you feel
              unwell.
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          render={<Link href="/dashboard/mind#mind-log" />}
          data-testid="ew-checkin"
        >
          <ClipboardCheck aria-hidden="true" />
          Start check-in
        </Button>
        <Button
          variant="outline"
          onClick={showCopilotComingSoon}
          data-testid="ew-copilot"
        >
          <Bot aria-hidden="true" />
          Ask co-pilot
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          data-testid="ew-dismiss"
          onClick={() =>
            startTransition(async () => {
              const { ok } = await dismissAlertAction(result.ruleId);
              if (ok) setDismissed(true);
            })
          }
        >
          <X aria-hidden="true" />
          Dismiss for today
        </Button>
      </div>

      <WhyDetails result={result} />

      <p className="mt-4 text-[11px] text-muted-foreground/80">
        Decision support, not a diagnosis.
      </p>
    </section>
  );
}

function MiniTrend({
  title,
  keyPoint,
  icon: Icon,
  rows,
  dataKey,
  unit,
  colorSlot,
  band,
  flaggedRange,
  animate,
  digits,
}: {
  title: string;
  keyPoint: string;
  icon: LucideIcon;
  rows: {
    label: string;
    hrv: number | null;
    sleep: number | null;
    flagged: boolean;
  }[];
  dataKey: "hrv" | "sleep";
  unit: string;
  colorSlot: 1 | 2;
  band: { mean: number; sd: number };
  flaggedRange: [string | undefined, string | undefined];
  animate: boolean;
  digits: number;
}) {
  const values = rows.flatMap((r) =>
    r[dataKey] === null ? [] : [r[dataKey]!],
  );
  const lo = Math.min(...values, band.mean - band.sd);
  const hi = Math.max(...values, band.mean + band.sd);
  const pad = Math.max((hi - lo) * 0.25, dataKey === "hrv" ? 3 : 0.4);
  const domain: [number, number] =
    dataKey === "hrv"
      ? [
          Math.max(0, Math.floor((lo - pad) / 5) * 5),
          Math.ceil((hi + pad) / 5) * 5,
        ]
      : [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)];
  const config = {
    [dataKey]: { label: title, color: `var(--chart-${colorSlot})` },
  } satisfies ChartConfig;
  const yLabel = dataKey === "hrv" ? "RMSSD, ms" : "hours";

  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="mb-1 flex items-start gap-2 px-1">
        <Icon className="mt-0.5 size-4 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">
            {title}{" "}
            <span className="font-normal text-muted-foreground">
              · {yLabel}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">{keyPoint}</p>
        </div>
      </div>
      <ChartContainer
        config={config}
        className="aspect-auto h-[130px] w-full"
        role="img"
        aria-label={`${title}, last 7 nights, in ${yLabel}. The last 3 nights are below your personal baseline band.`}
      >
        <LineChart
          data={rows}
          margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            fontSize={10}
            interval={0}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            domain={domain}
            tickLine={false}
            axisLine={false}
            width={30}
            fontSize={10}
            tickCount={3}
          />
          {/* Personal baseline: mean ± 1 SD of the baseline nights */}
          <ReferenceArea
            y1={band.mean - band.sd}
            y2={band.mean + band.sd}
            fill="var(--chart-baseline)"
            stroke="var(--chart-baseline-edge)"
            strokeDasharray="3 4"
            ifOverflow="extendDomain"
          />
          {/* Flagged nights (status annotation, labelled) */}
          {flaggedRange[0] && flaggedRange[1] && (
            <ReferenceArea
              x1={flaggedRange[0]}
              x2={flaggedRange[1]}
              fill="var(--status-watch)"
              fillOpacity={0.1}
              stroke="none"
              label={{
                value: "Flagged nights",
                position: "insideTop",
                fontSize: 9,
                fill: "var(--muted-foreground)",
              }}
            />
          )}
          <ChartTooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }}
            content={
              <ChartTooltipContent
                indicator="line"
                formatter={(v) => (
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{title}</span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {Number(v).toFixed(digits)} {unit}
                    </span>
                  </span>
                )}
              />
            }
          />
          <Line
            dataKey={dataKey}
            type="monotone"
            stroke={`var(--color-${dataKey})`}
            strokeWidth={2}
            isAnimationActive={animate}
            animationDuration={1400}
            animationEasing="ease-out"
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const flagged =
                props.index !== undefined && rows[props.index]?.flagged;
              if (props.cx === undefined || props.cy === undefined)
                return <g key={props.index} />;
              return (
                <circle
                  key={props.index}
                  cx={props.cx}
                  cy={props.cy}
                  r={flagged ? 4 : 2.5}
                  fill={
                    flagged ? `var(--color-${dataKey})` : "var(--background)"
                  }
                  stroke={
                    flagged ? "var(--status-watch)" : `var(--color-${dataKey})`
                  }
                  strokeWidth={flagged ? 2 : 1.5}
                />
              );
            }}
            activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
          />
        </LineChart>
      </ChartContainer>
      <p className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-3.5 rounded-[2px] border border-dashed border-(--chart-baseline-edge) bg-(--chart-baseline)"
        />
        Your baseline {(band.mean - band.sd).toFixed(digits)}–
        {(band.mean + band.sd).toFixed(digits)} {unit}
        <span
          aria-hidden="true"
          className="ml-2 inline-block h-2 w-3.5 rounded-[2px] bg-watch/25"
        />
        Flagged nights
      </p>
    </div>
  );
}

function WhyDetails({ result }: { result: HrvSleepDeclineResult }) {
  const b = result.baseline!;
  const c = result.config;
  return (
    <details
      className="group mt-5 rounded-xl border border-border bg-background/30 px-4 py-3"
      data-testid="ew-why"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <ChevronRight
          className="size-4 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
        Why am I seeing this?
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-xs text-muted-foreground">
        <p>
          Rule{" "}
          <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-foreground">
            {result.ruleId}
          </code>{" "}
          · basis: <span className="text-foreground">{result.basis}</span> ·
          status: Watch (this rule never escalates on its own).
        </p>
        <p>
          It checks your HRV (RMSSD) and sleep against{" "}
          <strong className="font-medium text-foreground">your own</strong>{" "}
          baseline, not population norms. It shows when HRV is at least{" "}
          {c.hrvDropPct}% below your baseline on each of the last{" "}
          {c.flaggedNights} consecutive nights, and your average sleep over
          those nights is at least {c.sleepDropHours} h below your baseline or
          under {c.sleepFloorHours} h.
        </p>
        <p>
          Baseline: nights {b.start} to {b.end} ({b.hrv.n} nights). HRV{" "}
          {b.hrv.mean.toFixed(1)} ± {b.hrv.sd.toFixed(1)} ms RMSSD; sleep{" "}
          {b.sleep.mean.toFixed(1)} ± {b.sleep.sd.toFixed(1)} h (mean ± SD).
        </p>
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[440px] text-left"
            data-testid="ew-why-table"
          >
            <thead>
              <tr className="border-b border-border text-[10px] tracking-wide uppercase">
                <th className="py-1.5 pr-3 font-medium">Night</th>
                <th className="py-1.5 pr-3 font-medium">HRV (RMSSD, ms)</th>
                <th className="py-1.5 pr-3 font-medium">vs baseline</th>
                <th className="py-1.5 pr-3 font-medium">Sleep (h)</th>
                <th className="py-1.5 font-medium">vs baseline (h)</th>
              </tr>
            </thead>
            <tbody className="font-mono text-foreground">
              {result.flagged.map((f) => (
                <tr key={f.night} className="border-b border-border/50">
                  <td className="py-1.5 pr-3">{f.night}</td>
                  <td className="py-1.5 pr-3">{f.hrvMs.toFixed(0)}</td>
                  <td className="py-1.5 pr-3">{signed(f.hrvPctVsBaseline)}%</td>
                  <td className="py-1.5 pr-3">{f.sleepHours.toFixed(1)}</td>
                  <td className="py-1.5">
                    {signed(f.sleepVsBaselineHours, 2)}
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  className="py-1.5 pr-3 font-sans text-muted-foreground"
                  colSpan={3}
                >
                  3-night sleep average
                </td>
                <td className="py-1.5 pr-3">{result.sleepAvg!.toFixed(2)}</td>
                <td className="py-1.5">
                  {signed(result.sleepAvgVsBaselineHours!, 2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <p className="mb-1 font-medium text-foreground">Citations</p>
          <ul className="flex flex-col gap-1.5">
            {result.citations.map((cit) => (
              <li key={cit.title}>
                {cit.url ? (
                  <a
                    href={cit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {cit.title}
                  </a>
                ) : (
                  <span className="text-foreground">{cit.title}</span>
                )}{" "}
                <span>
                  ({cit.source}). {cit.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
