"use client";

import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ReferenceRange } from "@/lib/health/reference-ranges";
import { cn } from "@/lib/utils";

export interface TrendPoint {
  /** X-axis label, e.g. "D12" or "08 Nov". */
  label: string;
  value: number | null;
}

export interface TrendChartProps {
  title: string;
  description?: string;
  /** Series name in the tooltip, e.g. "Heart rate". Defaults to title. */
  seriesLabel?: string;
  data: TrendPoint[];
  unit: string;
  /** Shaded band for the expected range (e.g. rules-engine thresholds). */
  baseline?: Pick<ReferenceRange, "min" | "max" | "label">;
  /**
   * Optional second band for an external reference population (e.g. the
   * Inspiration4 crew). Drawn as a violet outline so it never reads as the
   * normal band.
   */
  reference?: { min: number; max: number; label: string };
  /** Categorical slot 1–4. Status colours are reserved and not allowed here. */
  colorSlot?: 1 | 2 | 3 | 4;
  /** Fixed y-domain; defaults to the baseline padded by 20%. */
  yDomain?: [number, number];
  /** Number of empty slots drawn when there is no data yet. */
  emptyWindow?: number;
  height?: number;
  className?: string;
}

/**
 * Single-series trend line with a baseline band. One measure per chart (no
 * dual axes). Without data it still draws the frame and baseline band, so
 * the expected range is visible before the first reading.
 */
export function TrendChart({
  title,
  description,
  seriesLabel,
  data,
  unit,
  baseline,
  reference,
  colorSlot = 1,
  yDomain,
  emptyWindow = 14,
  height = 200,
  className,
  testId,
}: TrendChartProps & { testId?: string }) {
  const isEmpty = data.every((d) => d.value === null);
  const rows: TrendPoint[] = isEmpty
    ? Array.from({ length: emptyWindow }, (_, i) => ({ label: `${i + 1}`, value: null }))
    : data;

  const lo = Math.min(...[baseline?.min, reference?.min].filter((n): n is number => n !== undefined));
  const hi = Math.max(...[baseline?.max, reference?.max].filter((n): n is number => n !== undefined));
  const domain: [number, number] = yDomain ?? (Number.isFinite(lo) && Number.isFinite(hi) ? niceDomain(lo, hi) : [0, 100]);

  const config = {
    value: { label: seriesLabel ?? title, color: `var(--chart-${colorSlot})` },
  } satisfies ChartConfig;

  return (
    <Card className={cn("gap-3", className)} data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
        {(baseline || reference) && (
          <CardAction className="flex flex-col items-end gap-1">
            {baseline && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-4 rounded-[3px] border border-dashed border-(--chart-baseline-edge) bg-(--chart-baseline)"
                />
                {baseline.label} {formatNum(baseline.min)}–{formatNum(baseline.max)} {unit}
              </span>
            )}
            {reference && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground" data-testid="trend-reference-legend">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-4 rounded-[3px] border border-(--chart-2) bg-(--chart-2)/15"
                />
                {reference.label} {formatNum(reference.min)}–{formatNum(reference.max)} {unit}
              </span>
            )}
          </CardAction>
        )}
      </CardHeader>

      <div className="relative px-2">
        <ChartContainer
          config={config}
          className="aspect-auto w-full"
          style={{ height }}
          aria-label={`${title} trend${isEmpty ? ", no data yet" : ""}`}
          role="img"
        >
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tick={isEmpty ? false : undefined}
            />
            <YAxis
              domain={domain}
              tickLine={false}
              axisLine={false}
              width={36}
              tickMargin={4}
              tickFormatter={formatNum}
            />
            {baseline && (
              <ReferenceArea
                y1={baseline.min}
                y2={baseline.max}
                fill="var(--chart-baseline)"
                stroke="var(--chart-baseline-edge)"
                strokeDasharray="3 4"
                strokeWidth={1}
                ifOverflow="extendDomain"
              />
            )}
            {reference && (
              <ReferenceArea
                y1={reference.min}
                y2={reference.max}
                fill="var(--chart-2)"
                fillOpacity={0.08}
                stroke="var(--chart-2)"
                strokeOpacity={0.7}
                strokeWidth={1}
                ifOverflow="extendDomain"
              />
            )}
            {!isEmpty && (
              <ChartTooltip
                cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(v) => (
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">{seriesLabel ?? title}</span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatNum(Number(v))} {unit}
                        </span>
                      </span>
                    )}
                  />
                }
              />
            )}
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
        </ChartContainer>

        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              No readings yet. Log an entry to start the trend.
            </span>
          </div>
        )}
      </div>
      <p className="px-4 text-[11px] text-muted-foreground">
        {isEmpty
          ? `${emptyWindow}-day window`
          : `${rows.length}-day window · ${rows.filter((r) => r.value !== null).length} days with readings`}{" "}
        · {unit}
      </p>
    </Card>
  );
}

/** Pads the baseline by 20% and snaps to a round step so ticks read cleanly. */
function niceDomain(min: number, max: number): [number, number] {
  const pad = (max - min) * 0.2;
  const raw = max - min + pad * 2;
  const step = raw >= 50 ? 10 : raw >= 10 ? 5 : raw >= 2 ? 1 : 0.1;
  return [Math.max(0, Math.floor((min - pad) / step) * step), Math.ceil((max + pad) / step) * step];
}

function formatNum(n: number) {
  return Number.isInteger(n) ? `${n}` : n.toFixed(n < 1 ? 2 : 1);
}
