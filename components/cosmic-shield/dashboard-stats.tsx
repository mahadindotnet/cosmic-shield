"use client";

import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------ panel */

/** Compact statistics panel: icon, title, one-line key point, link to the module. */
export function StatPanel({
  icon: Icon,
  title,
  keyPoint,
  href,
  className,
  children,
  testId,
}: {
  icon: LucideIcon;
  title: string;
  /** One short line, e.g. "Target 90 min/day". */
  keyPoint?: React.ReactNode;
  href?: string;
  className?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <Card
      size="sm"
      data-testid={testId}
      className={cn("gap-3 px-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
            <Icon className="size-4 text-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">
              {title}
            </p>
            {keyPoint && (
              <p className="truncate text-[11px] text-muted-foreground">
                {keyPoint}
              </p>
            )}
          </div>
        </div>
        {href && (
          <Link
            href={href}
            aria-label={`Open ${title}`}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}

/* ------------------------------------------------------- mini chart */

export interface MiniPoint {
  label: string;
  value: number | null;
}

/**
 * Small single-series chart for the dashboard (bar or line). One measure,
 * one axis. Without data it draws faint placeholder marks under a "No data
 * yet" note so the shape of the chart is visible before the first entry.
 */
export function MiniChart({
  kind,
  data,
  window,
  unit,
  seriesLabel,
  colorSlot,
  band,
  target,
  yDomain,
  height = 120,
}: {
  kind: "bar" | "line";
  data: MiniPoint[];
  /** Placeholder slot labels when there is no data (e.g. weekdays). */
  window: string[];
  unit: string;
  seriesLabel: string;
  colorSlot: 1 | 2 | 3 | 4;
  /** Shaded expected range. */
  band?: { min: number; max: number };
  /** Dashed target line. */
  target?: number;
  yDomain: [number, number];
  height?: number;
}) {
  const isEmpty = data.every((d) => d.value === null);
  // Placeholder heights only shape the empty chart; they are never shown as values.
  const ghost = [0.45, 0.6, 0.4, 0.7, 0.55, 0.65, 0.5];
  const rows: { label: string; value: number | null; ghost: number | null }[] = isEmpty
    ? window.map((label, i) => ({ label, value: null, ghost: yDomain[1] * ghost[i % ghost.length] }))
    : data.map((d) => ({ ...d, ghost: null }));

  const config = {
    value: { label: seriesLabel, color: `var(--chart-${colorSlot})` },
  } satisfies ChartConfig;
  const aria = `${seriesLabel}${isEmpty ? ", no data yet" : ""}`;

  const common = (
    <>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tickMargin={6}
        interval={0}
        fontSize={10}
        padding={kind === "line" ? { left: 10, right: 16 } : undefined}
      />
      <YAxis
        domain={yDomain}
        tickLine={false}
        axisLine={false}
        width={28}
        fontSize={10}
        tickCount={3}
      />
      {band && (
        <ReferenceArea
          y1={band.min}
          y2={band.max}
          fill="var(--chart-baseline)"
          stroke="var(--chart-baseline-edge)"
          strokeDasharray="3 4"
          ifOverflow="extendDomain"
        />
      )}
      {target !== undefined && (
        <ReferenceLine
          y={target}
          stroke="var(--chart-baseline-edge)"
          strokeDasharray="4 4"
          ifOverflow="extendDomain"
        />
      )}
      {!isEmpty && (
        <ChartTooltip
          cursor={
            kind === "bar"
              ? { fill: "var(--chart-grid)" }
              : { stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }
          }
          content={
            <ChartTooltipContent
              indicator={kind === "bar" ? "dot" : "line"}
              formatter={(v) => (
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{seriesLabel}</span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {Number(v)} {unit}
                  </span>
                </span>
              )}
            />
          }
        />
      )}
    </>
  );

  return (
    <div className="relative">
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height }}
        role="img"
        aria-label={aria}
      >
        {kind === "bar" ? (
          <BarChart
            data={rows}
            margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
            barCategoryGap="28%"
          >
            {common}
            {isEmpty ? (
              <Bar
                dataKey="ghost"
                fill="var(--muted-foreground)"
                fillOpacity={0.12}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ) : (
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            )}
          </BarChart>
        ) : (
          <LineChart
            data={rows}
            margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
          >
            {common}
            <Line
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ChartContainer>
      {isEmpty && (
        <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] whitespace-nowrap text-muted-foreground backdrop-blur">
          No data yet
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------- horizontal bars */

export interface HBarRow {
  id: string;
  label: string;
  value: number | null;
  /** Shown after the value, e.g. "measured". */
  tag?: string;
  /** Text shown instead of a bar when value is null. */
  missing?: string;
  highlight?: boolean;
}

/**
 * Labelled horizontal bars in plain HTML: one measure, shared scale, value
 * printed at the end of each bar. Highlighted rows use the series colour,
 * the rest a neutral tone.
 */
export function HBars({
  rows,
  unit,
  colorSlot,
  max,
  digits = 2,
}: {
  rows: HBarRow[];
  unit: string;
  colorSlot: 1 | 2 | 3 | 4;
  max?: number;
  digits?: number;
}) {
  const top = max ?? Math.max(...rows.map((r) => r.value ?? 0), 1);
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-2 text-[11px]"
          title={
            r.value === null
              ? `${r.label}: ${r.missing ?? "no data"}`
              : `${r.label}: ${r.value} ${unit}${r.tag ? ` (${r.tag})` : ""}`
          }
        >
          <span
            className={cn(
              "truncate",
              r.highlight
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {r.label}
          </span>
          {r.value === null ? (
            <span className="text-muted-foreground italic">
              {r.missing ?? "No data"}
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 rounded-r-[4px]"
                style={{
                  width: `max(4px, ${(r.value / top) * 48}%)`,
                  background: r.highlight
                    ? `var(--chart-${colorSlot})`
                    : "var(--chart-5)",
                  opacity: r.highlight ? 1 : 0.6,
                }}
              />
              <span className="shrink-0 font-mono text-foreground tabular-nums">
                {r.value.toFixed(digits)}
                <span className="ml-0.5 text-muted-foreground">{unit}</span>
              </span>
              {r.tag && (
                <span className="truncate text-[10px] text-muted-foreground">
                  {r.tag}
                </span>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
