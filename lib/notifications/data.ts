import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { activeAlertsFor } from "@/lib/alerts/active";
import { utcToday } from "@/lib/alerts/data";
import type { UserRow } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { escalation, notificationRead } from "@/lib/db/schema";
import { gamificationFor } from "@/lib/gamification/data";
import { spaceWeatherNow } from "@/lib/radiation/space-weather";
import { vitalsSummaryFor } from "@/lib/vitals/data";
import { buildNotifications, withReadState, type NotificationItem } from "./build";

export type NotificationView = NotificationItem & { read: boolean };

/** Keys this user has marked read (only among `keys`). */
export function readKeysFor(userId: number, keys: string[]): Set<string> {
  if (!keys.length) return new Set();
  return new Set(
    db
      .select({ key: notificationRead.key })
      .from(notificationRead)
      .where(and(eq(notificationRead.userId, userId), inArray(notificationRead.key, keys)))
      .all()
      .map((r) => r.key),
  );
}

/** Space weather for the bell. Never waits on NASA and never throws: offline or failing feeds give no item. */
function recentSpaceWeather() {
  try {
    const sw = spaceWeatherNow(30);
    return sw.events.map((e) => ({ id: e.id, type: e.type, startUtc: e.start_time, detail: e.class_or_intensity }));
  } catch {
    return [];
  }
}

/** The signed-in user's current notifications with read state. */
export async function notificationsFor(user: UserRow): Promise<{ items: NotificationView[]; unread: number }> {
  let items: NotificationItem[];
  if (user.role === "flight_surgeon") {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const escalations = db
      .select({ id: escalation.id, crewId: escalation.crewId, ruleId: escalation.ruleId, createdAt: escalation.createdAt })
      .from(escalation)
      .where(gte(escalation.createdAt, since))
      .orderBy(desc(escalation.createdAt))
      .limit(50)
      .all();
    items = buildNotifications({ role: "flight_surgeon", escalations });
  } else {
    const today = utcToday();
    const latestVitals = vitalsSummaryFor(user.id, 1).latest;
    const game = gamificationFor(user.id, today);
    items = buildNotifications({
      role: "crew",
      today,
      checkedInToday: game.checkedInToday,
      streak: game.streak,
      vitalsToday: Boolean(latestVitals && latestVitals.recordedAt.slice(0, 10) === today),
      alerts: activeAlertsFor(user.id, today).alerts,
      spaceWeather: recentSpaceWeather(),
      now: Date.now(),
    });
  }
  return withReadState(items, readKeysFor(user.id, items.map((i) => i.key)));
}

/** Marks keys read for this user (idempotent). */
export function markRead(userId: number, keys: string[]) {
  const now = Date.now();
  for (const key of new Set(keys))
    db.insert(notificationRead).values({ userId, key, readAt: now }).onConflictDoNothing().run();
}

/* ------------------------------------------- environment dialog ("Choose later") */

const envLaterKey = (sessionIssuedAt: number) => `env-prompt-later:${sessionIssuedAt}`;

/** Did this user choose "Choose later" in this login session? */
export function envPromptDismissed(userId: number, sessionIssuedAt: number) {
  return readKeysFor(userId, [envLaterKey(sessionIssuedAt)]).size > 0;
}

export function dismissEnvPrompt(userId: number, sessionIssuedAt: number) {
  markRead(userId, [envLaterKey(sessionIssuedAt)]);
}
