import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Progress ring for a single value against a target or limit (career dose,
 * exercise minutes, hydration). Optional dashed marker for a projection.
 */
export function RingGauge({
  title,
  icon: Icon,
  value,
  max,
  unit,
  caption,
  marker,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  value: number | null;
  max: number;
  unit: string;
  caption?: string;
  marker?: { value: number; label: string };
  className?: string;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.min(value / max, 1);
  const markerRad = marker ? Math.min(marker.value / max, 1) * 2 * Math.PI : null;

  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {Icon && <Icon className="size-4 text-primary" aria-hidden="true" />}
          {title}
        </CardTitle>
        {caption && <CardDescription className="text-xs">{caption}</CardDescription>}
      </CardHeader>
      <div className="flex items-center justify-center px-4 pb-2">
        <div
          className="relative size-40"
          role="meter"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value ?? 0}
        >
          <svg viewBox="0 0 140 140" className="size-full -rotate-90">
            <circle cx={70} cy={70} r={r} fill="none" stroke="var(--muted)" strokeWidth={10} />
            <circle cx={70} cy={70} r={r + 9} fill="none" stroke="var(--chart-1)" strokeOpacity={0.25} strokeDasharray="1 5" />
            {value !== null && (
              <circle
                cx={70}
                cy={70}
                r={r}
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={`${pct * c} ${c}`}
              />
            )}
            {markerRad !== null && (
              <line
                x1={70 + (r - 9) * Math.cos(markerRad)}
                y1={70 + (r - 9) * Math.sin(markerRad)}
                x2={70 + (r + 9) * Math.cos(markerRad)}
                y2={70 + (r + 9) * Math.sin(markerRad)}
                stroke="var(--foreground)"
                strokeOpacity={0.85}
                strokeWidth={3}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-mono text-3xl tabular-nums", value === null ? "text-muted-foreground/60" : "text-foreground")}>
              {value === null ? "—" : value}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              / {max} {unit}
            </span>
          </div>
        </div>
      </div>
      {marker && (
        <p className="flex items-center justify-center gap-1.5 px-4 text-center text-[11px] text-muted-foreground">
          <span aria-hidden="true" className="inline-block h-[3px] w-3 rounded-full bg-foreground/80" />
          {marker.label}
        </p>
      )}
    </Card>
  );
}
