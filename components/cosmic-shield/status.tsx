import { CircleCheck, CircleDashed, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rules-engine status levels (Watch and Escalate come from each module's rules.ts). */
export type EscalationLevel = "normal" | "watch" | "escalate";

/** Escalation tier from the rules engine, plus "no-data" for empty modules. */
export type HealthStatus = EscalationLevel | "no-data";

interface StatusMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Text colour for labels on dark surfaces. */
  text: string;
  /** Solid colour for rails, dots and chart marks. */
  solid: string;
  /** Tinted badge background + border. */
  badge: string;
}

export const STATUS_META: Record<HealthStatus, StatusMeta> = {
  normal: {
    label: "Normal",
    description: "Within baseline. Keep monitoring and logging countermeasures.",
    icon: CircleCheck,
    text: "text-normal-foreground",
    solid: "bg-normal",
    badge: "bg-normal/12 border-normal/35 text-normal-foreground",
  },
  watch: {
    label: "Watch",
    description: "A threshold or trend was crossed. Follow onboard guidance and re-check.",
    icon: TriangleAlert,
    text: "text-watch-foreground",
    solid: "bg-watch",
    badge: "bg-watch/12 border-watch/40 text-watch-foreground",
  },
  escalate: {
    label: "Escalate",
    description: "Contact the flight surgeon. An evidence packet is attached for ground review.",
    icon: OctagonAlert,
    text: "text-escalate-foreground",
    solid: "bg-escalate",
    badge: "bg-escalate/15 border-escalate/45 text-escalate-foreground",
  },
  "no-data": {
    label: "No data",
    description: "Nothing logged yet.",
    icon: CircleDashed,
    text: "text-muted-foreground",
    solid: "bg-muted-foreground/40",
    badge: "bg-muted/60 border-border text-muted-foreground",
  },
};

export const ESCALATION_TIERS: EscalationLevel[] = ["normal", "watch", "escalate"];

/** Status pill. Always icon + text so state never relies on colour alone. */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: HealthStatus;
  label?: string;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 font-mono text-[10px] font-medium tracking-wider uppercase",
        meta.badge,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label ?? meta.label}
    </span>
  );
}
