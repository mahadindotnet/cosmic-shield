import { describe, expect, it } from "vitest";
import type { ActiveAlert } from "./active";
import { dashboardAlertSummary } from "./summary";

const alert = (ruleId: string, level: "watch" | "escalate", href: string): ActiveAlert => ({
  ruleId,
  level,
  title: `${ruleId} ${level}`,
  detail: "…",
  href,
  key: `alert:${ruleId}`,
});

describe("dashboardAlertSummary", () => {
  it("All clear when nothing is active", () => {
    expect(dashboardAlertSummary({ alerts: [], openEscalations: [] })).toEqual({ items: [], allClear: true });
  });

  it("lists every active alert with its module link, Escalate first", () => {
    const s = dashboardAlertSummary({
      alerts: [
        alert("hrv_sleep_decline", "watch", "/dashboard/sleep-stress"),
        alert("vitals", "escalate", "/dashboard/vitals"),
        alert("mind_pattern", "watch", "/dashboard/mind"),
        alert("radiation_daily", "watch", "/dashboard/radiation"),
      ],
      openEscalations: [],
    });
    expect(s.allClear).toBe(false);
    expect(s.items.map((i) => [i.ruleId, i.level, i.href])).toEqual([
      ["vitals", "escalate", "/dashboard/vitals"],
      ["hrv_sleep_decline", "watch", "/dashboard/sleep-stress"],
      ["mind_pattern", "watch", "/dashboard/mind"],
      ["radiation_daily", "watch", "/dashboard/radiation"],
    ]);
  });

  it("an open safety escalation shows only as 'Support follow-up open', with no reason or excerpt", () => {
    const s = dashboardAlertSummary({
      alerts: [],
      openEscalations: [
        { id: 4, ruleId: "mind_safety", reason: "Safety check: …", createdAt: "2026-11-13T09:00:00Z" },
        { id: 5, ruleId: "mind_safety", reason: "Safety check: …", createdAt: "2026-11-13T10:00:00Z" },
        { id: 6, ruleId: "vitals", reason: "SpO₂ 88 %…", createdAt: "2026-11-13T11:00:00Z" },
      ],
    });
    expect(s.items).toEqual([
      { key: "support-follow-up", ruleId: "mind_safety", level: "follow-up", title: "Support follow-up open", href: "/dashboard/mind#mind-talk" },
    ]);
    expect(JSON.stringify(s)).not.toContain("Safety check");
  });
});
