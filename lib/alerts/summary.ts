import { MIND_SAFETY_ID } from "@/lib/ai/safety";
import type { ActiveAlerts } from "./active";

/**
 * The Health Dashboard's Alerts card, built only from activeAlertsFor()
 * (lib/alerts/active.ts), the same source as the bell and the co-pilot. Pure.
 */

export interface AlertSummaryItem {
  key: string;
  ruleId: string;
  /** "follow-up": an open support follow-up (no status colour, no details). */
  level: "escalate" | "watch" | "follow-up";
  title: string;
  href: string;
}

export interface AlertSummary {
  items: AlertSummaryItem[];
  allClear: boolean;
}

export function dashboardAlertSummary(active: Pick<ActiveAlerts, "alerts" | "openEscalations">): AlertSummary {
  const items: AlertSummaryItem[] = active.alerts.map((a) => ({ key: a.key, ruleId: a.ruleId, level: a.level, title: a.title, href: a.href }));
  items.sort((a, b) => Number(b.level === "escalate") - Number(a.level === "escalate"));
  // A safety escalation is shown to the crew member only as an open follow-up:
  // no reason, no excerpt (those are for the flight surgeon).
  if (active.openEscalations.some((e) => e.ruleId === MIND_SAFETY_ID))
    items.push({ key: "support-follow-up", ruleId: MIND_SAFETY_ID, level: "follow-up", title: "Support follow-up open", href: "/dashboard/mind#mind-talk" });
  return { items, allClear: items.length === 0 };
}
