import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { STATUS_META, StatusBadge, type HealthStatus } from "@/components/cosmic-shield/status";
import { cn } from "@/lib/utils";

export interface StatusCardProps {
  title: string;
  icon?: LucideIcon;
  /** Latest reading. null/undefined renders the empty state. */
  value?: string | number | null;
  unit?: string;
  /** Defaults to "no-data" when there is no value. */
  status?: HealthStatus;
  /**
   * For reference facts that aren't crew health (e.g. mission environment):
   * neutral rail and a "Reference" tag instead of a status badge, since status
   * colours are reserved for health state.
   */
  neutral?: boolean;
  /** Secondary line, e.g. "Logged 08:14" or "Target 2.0–3.0 L". */
  caption?: string;
  /** Reference/baseline text shown at the bottom, e.g. "Normal 52–88 bpm". */
  reference?: string;
  /** Makes the whole card a link (used on Overview). */
  href?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * The single headline-number tile used across every tab. Status is
 * shown as a coloured rail + an icon/label badge (never colour alone).
 */
export function StatusCard({
  title,
  icon: Icon,
  value,
  unit,
  status,
  neutral,
  caption,
  reference,
  href,
  className,
  children,
}: StatusCardProps) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const resolved: HealthStatus = hasValue ? (status ?? "normal") : "no-data";
  const meta = STATUS_META[resolved];
  const rail = neutral && hasValue ? "bg-primary/70" : meta.solid;

  const body = (
    <Card
      size="sm"
      data-status={resolved}
      className={cn(
        "relative h-full gap-2 pl-1 transition-colors",
        href && "group-hover/status-card:ring-primary/40",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r-full", rail)}
      />
      <div className="flex items-start justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          {Icon && <Icon className="size-4 shrink-0 text-primary/80" aria-hidden="true" />}
          <span className="truncate text-[13px] font-medium">{title}</span>
        </div>
        {neutral && hasValue ? (
          <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-primary/30 bg-primary/10 px-2 font-mono text-[10px] font-medium tracking-wider text-primary uppercase">
            Reference
          </span>
        ) : (
          <StatusBadge status={resolved} />
        )}
      </div>

      <div className="px-3">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-mono text-3xl font-medium tabular-nums tracking-tight",
              hasValue ? "text-foreground" : "text-muted-foreground/50",
            )}
          >
            {hasValue ? value : "—"}
          </span>
          {unit && hasValue && <span className="font-mono text-xs text-muted-foreground">{unit}</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {caption ?? (hasValue ? "" : "No readings logged yet")}
        </p>
      </div>

      {children && <div className="px-3">{children}</div>}

      {(reference || href) && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 px-3 pt-2">
          <span className="console-label truncate">{reference}</span>
          {href && (
            <ArrowUpRight
              className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/status-card:text-primary"
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </Card>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      className="group/status-card block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {body}
    </Link>
  );
}
