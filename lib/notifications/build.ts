/**
 * In-app notifications, computed on each request (pure; tested in
 * build.test.ts). Tasks disappear by themselves once done; alerts stay while
 * the rules engine reports them. Only read state is stored.
 */

export type NotificationKind = "task" | "alert" | "space_weather" | "escalation";

export interface NotificationItem {
  /** Stable key: the same occurrence keeps its key (read state is stored by key). */
  key: string;
  kind: NotificationKind;
  title: string;
  detail?: string;
  href: string;
  level?: "watch" | "escalate";
}

export interface CrewNotificationInput {
  role: "crew";
  /** YYYY-MM-DD (UTC). */
  today: string;
  checkedInToday: boolean;
  vitalsToday: boolean;
  alerts: { key: string; ruleId: string; level: "watch" | "escalate"; title: string; detail: string; href: string }[];
  /** DONKI events (any window). Only those that started in the 24 h before `now` count. */
  spaceWeather: { id: string; type: string; startUtc: string; detail: string | null }[];
  /** Epoch ms. */
  now: number;
}

export interface SurgeonNotificationInput {
  role: "flight_surgeon";
  /** Escalation records from the last 7 days, any crew member. No evidence. */
  escalations: { id: number; crewId: string; ruleId: string; createdAt: string }[];
}

const DAY_MS = 86_400_000;

const RULE_LABELS: Record<string, string> = {
  mind_safety: "Safety check (Mind)",
  vitals: "Vitals",
  radiation_career: "Career dose",
};

const DONKI_LABELS: Record<string, string> = {
  FLR: "Solar flare",
  SEP: "Solar energetic particle event",
  CME: "Coronal mass ejection",
  GST: "Geomagnetic storm",
};

/** DONKI times look like "2026-11-12T01:53Z"; null when unparseable. */
function donkiTime(s: string) {
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export function buildNotifications(input: CrewNotificationInput | SurgeonNotificationInput): NotificationItem[] {
  if (input.role === "flight_surgeon") {
    return input.escalations.map((e) => ({
      key: `escalation:${e.id}`,
      kind: "escalation",
      title: `New escalation: ${e.crewId}`,
      detail: `${RULE_LABELS[e.ruleId] ?? e.ruleId} · ${e.createdAt.slice(0, 16).replace("T", " ")} UTC`,
      href: `/dashboard/admin?crew=${encodeURIComponent(e.crewId)}`,
      level: "escalate",
    }));
  }

  const items: NotificationItem[] = [];
  for (const a of input.alerts)
    items.push({ key: a.key, kind: "alert", title: a.title, detail: a.detail, href: a.href, level: a.level });
  if (!input.checkedInToday)
    items.push({
      key: `checkin-due:${input.today}`,
      kind: "task",
      title: "Daily check-in due",
      detail: "Log in and check in every day to keep your streak.",
      href: "/dashboard/mind#mind-log",
    });
  if (!input.vitalsToday)
    items.push({ key: `vitals-due:${input.today}`, kind: "task", title: "Morning vitals not logged yet today", href: "/dashboard/vitals#vitals-log" });

  const recent = input.spaceWeather.filter((e) => {
    const t = donkiTime(e.startUtc);
    return t !== null && t <= input.now && input.now - t <= DAY_MS;
  });
  for (const e of recent)
    items.push({
      key: `donki:${e.id}`,
      kind: "space_weather",
      title: "New space weather event",
      detail: `${DONKI_LABELS[e.type] ?? e.type} at ${e.startUtc.replace("T", " ").replace("Z", " UTC")}${e.detail ? ` (${e.detail})` : ""}`,
      href: "/dashboard/radiation#radiation-solar",
    });
  return items;
}

/** Items with their read flag, unread first (order otherwise kept), and the unread count. */
export function withReadState(items: NotificationItem[], readKeys: ReadonlySet<string>) {
  const marked = items.map((i) => ({ ...i, read: readKeys.has(i.key) }));
  marked.sort((a, b) => Number(a.read) - Number(b.read));
  return { items: marked, unread: marked.filter((i) => !i.read).length };
}
