import { describe, expect, it } from "vitest";
import { buildNotifications, withReadState, type CrewNotificationInput } from "./build";

const NOW = Date.parse("2026-11-13T12:00:00Z");
const crew = (over: Partial<CrewNotificationInput> = {}): CrewNotificationInput => ({
  role: "crew",
  today: "2026-11-13",
  checkedInToday: false,
  vitalsToday: false,
  alerts: [],
  spaceWeather: [],
  now: NOW,
  ...over,
});

describe("buildNotifications (crew)", () => {
  it("due tasks show until done, then disappear", () => {
    const keys = (i: CrewNotificationInput) => buildNotifications(i).map((n) => n.key);
    expect(keys(crew())).toEqual(["checkin-due:2026-11-13", "vitals-due:2026-11-13"]);
    expect(buildNotifications(crew())[0]).toMatchObject({
      title: "Daily check-in due",
      detail: "Log in and check in every day to keep your streak.",
      href: "/dashboard/mind#mind-log",
    });
    expect(keys(crew({ checkedInToday: true }))).toEqual(["vitals-due:2026-11-13"]);
    expect(keys(crew({ checkedInToday: true, vitalsToday: true }))).toEqual([]);
  });

  it("every active alert links to its module, alerts first", () => {
    const items = buildNotifications(
      crew({
        alerts: [{ key: "alert:vitals:7", ruleId: "vitals", level: "escalate", title: "Latest vitals: Escalate", detail: "SpO₂ 88 %…", href: "/dashboard/vitals" }],
      }),
    );
    expect(items[0]).toMatchObject({ key: "alert:vitals:7", kind: "alert", level: "escalate", href: "/dashboard/vitals" });
  });

  it("space weather: only events that started in the last 24 h; none offline or with old cached data", () => {
    const ev = (id: string, startUtc: string) => ({ id, type: "CME", startUtc, detail: null });
    const items = buildNotifications(
      crew({
        checkedInToday: true,
        vitalsToday: true,
        spaceWeather: [ev("a", "2026-11-13T01:53Z"), ev("b", "2026-11-12T11:00Z"), ev("c", "2026-11-14T00:00Z"), ev("d", "not a date")],
      }),
    );
    expect(items.map((i) => i.key)).toEqual(["donki:a"]);
    expect(items[0]).toMatchObject({ title: "New space weather event", href: "/dashboard/radiation#radiation-solar" });
    expect(buildNotifications(crew({ checkedInToday: true, vitalsToday: true, spaceWeather: [ev("old", "2026-09-01T00:00Z")] }))).toEqual([]);
  });
});

describe("buildNotifications (flight surgeon)", () => {
  it("sees new escalations for crew, linking to Crew admin, with no excerpts", () => {
    const items = buildNotifications({
      role: "flight_surgeon",
      escalations: [{ id: 3, crewId: "CS-002", ruleId: "mind_safety", createdAt: "2026-11-13T09:30:00.000Z" }],
    });
    expect(items).toEqual([
      {
        key: "escalation:3",
        kind: "escalation",
        title: "New escalation: CS-002",
        detail: "Safety check (Mind) · 2026-11-13 09:30 UTC",
        href: "/dashboard/admin?crew=CS-002",
        level: "escalate",
      },
    ]);
  });
});

describe("withReadState", () => {
  it("counts unread, keeps read items (greyed) after the unread ones", () => {
    const items = buildNotifications(crew());
    const r = withReadState(items, new Set(["checkin-due:2026-11-13"]));
    expect(r.unread).toBe(1);
    expect(r.items.map((i) => [i.key, i.read])).toEqual([
      ["vitals-due:2026-11-13", false],
      ["checkin-due:2026-11-13", true],
    ]);
  });
});
