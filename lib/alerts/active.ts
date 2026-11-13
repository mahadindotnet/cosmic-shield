import "server-only";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { isAcknowledged, utcToday } from "@/lib/alerts/data";
import { db } from "@/lib/db";
import { escalation } from "@/lib/db/schema";
import { mindSummaryFor } from "@/lib/mind/data";
import { MIND_PATTERN_ID } from "@/lib/mind/rules";
import { radiationSummaryFor } from "@/lib/radiation/data";
import { evaluateHrvSleepDecline, HRV_SLEEP_DECLINE_ID, type HrvSleepDeclineResult } from "@/lib/rules/hrv-sleep-decline";
import { nightlyReadingsFor, sleepSummaryFor } from "@/lib/sleep/data";
import { vitalsSummaryFor } from "@/lib/vitals/data";

/**
 * Every active Watch / Escalate for one crew member, from the deterministic
 * rules engine. One place, shared by the co-pilot (get_active_alerts), the
 * notification bell and the Health Dashboard summary, so they never disagree.
 */

export interface ActiveAlert {
  ruleId: string;
  level: "watch" | "escalate";
  title: string;
  detail: string;
  /** Module page for this alert. */
  href: string;
  /** Stable per occurrence (a new reading or night gives a new key), for notification read state. */
  key: string;
}

export interface ActiveAlerts {
  alerts: ActiveAlert[];
  /** The hrv_sleep_decline evaluation (fired or not). */
  hrv: HrvSleepDeclineResult;
  hrvDismissedToday: boolean;
  /** The user's own escalation records from the last 7 days not yet reviewed (no evidence). */
  openEscalations: { id: number; ruleId: string; reason: string; createdAt: string }[];
}

export function activeAlertsFor(userId: number, today = utcToday()): ActiveAlerts {
  const alerts: ActiveAlert[] = [];

  const hrv = evaluateHrvSleepDecline(nightlyReadingsFor(userId), today);
  if (hrv.fired && hrv.baseline) {
    const avgPct = Math.round((hrv.flagged.reduce((a, f) => a + f.hrvPctVsBaseline, 0) / hrv.flagged.length) * 10) / 10;
    alerts.push({
      ruleId: HRV_SLEEP_DECLINE_ID,
      level: "watch",
      title: "HRV has dropped for three nights. Sleep is down.",
      detail: `HRV ${Math.abs(avgPct)}% below your own baseline on average over ${hrv.flagged.length} nights; sleep ${hrv.sleepAvg} h on average.`,
      href: "/dashboard/sleep-stress",
      key: `alert:${HRV_SLEEP_DECLINE_ID}:${hrv.flagged.at(-1)!.night}`,
    });
  }

  const vitals = vitalsSummaryFor(userId).latest;
  if (vitals && vitals.evaluation.status !== "normal")
    alerts.push({
      ruleId: "vitals",
      level: vitals.evaluation.status,
      title: `Latest vitals: ${vitals.evaluation.status === "escalate" ? "Escalate" : "Watch"}`,
      detail: vitals.evaluation.reasons.join(" "),
      href: "/dashboard/vitals",
      key: `alert:vitals:${vitals.id}`,
    });

  const sleep = sleepSummaryFor(userId).latest;
  if (sleep && sleep.evaluation.status !== "normal")
    alerts.push({
      ruleId: "sleep_night",
      level: "watch",
      title: `Night of ${sleep.night}: Watch`,
      detail: sleep.evaluation.reasons.join(" "),
      href: "/dashboard/sleep-stress",
      key: `alert:sleep_night:${sleep.id}`,
    });

  const rad = radiationSummaryFor(userId);
  if (rad.latest && rad.latest.evaluation.status !== "normal")
    alerts.push({
      ruleId: "radiation_daily",
      level: "watch",
      title: "Latest dose reading: Watch",
      detail: rad.latest.evaluation.reason ?? "",
      href: "/dashboard/radiation",
      key: `alert:radiation_daily:${rad.latest.id}`,
    });
  if (rad.career.status !== "normal")
    alerts.push({
      ruleId: "radiation_career",
      level: rad.career.status,
      title: `Career dose: ${rad.career.status === "escalate" ? "Escalate" : "Watch"}`,
      detail: rad.career.reason ?? "",
      href: "/dashboard/radiation",
      key: `alert:radiation_career:${rad.career.status}`,
    });

  const mind = mindSummaryFor(userId).pattern;
  if (mind.status === "watch")
    alerts.push({
      ruleId: MIND_PATTERN_ID,
      level: "watch",
      title: "Check-ins: a few hard days in a row",
      detail: mind.reason ?? "",
      href: "/dashboard/mind",
      key: `alert:${MIND_PATTERN_ID}:${mind.runDays.at(-1)}`,
    });

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const openEscalations = db
    .select({ id: escalation.id, ruleId: escalation.ruleId, reason: escalation.reason, createdAt: escalation.createdAt })
    .from(escalation)
    .where(and(eq(escalation.userId, userId), gte(escalation.createdAt, since), isNull(escalation.reviewedAt)))
    .orderBy(desc(escalation.createdAt))
    .all();

  alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === "escalate" ? -1 : 1));
  return { alerts, hrv, hrvDismissedToday: hrv.fired ? isAcknowledged(userId, HRV_SLEEP_DECLINE_ID, today) : false, openEscalations };
}
