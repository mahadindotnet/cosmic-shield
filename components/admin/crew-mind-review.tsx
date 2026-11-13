import { MessageCircleHeart, ShieldAlert } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { StatusBadge } from "@/components/cosmic-shield/status";
import { MIND_SAFETY_ID } from "@/lib/ai/safety";
import type { ReviewEscalation, SafetyEvidence } from "@/lib/mind/safety-escalation";
import type { MindSummary } from "@/lib/mind/summary";

const utc = (iso: string) => `${iso.slice(0, 16).replace("T", " ")} UTC`;

const RULE_LABELS: Record<string, string> = {
  mind_safety: "Safety check (Mind)",
  vitals: "Vitals",
  radiation_career: "Career dose",
};

/**
 * Flight-surgeon view of a crew member's Mind data: check-in scores (never the
 * private notes) and every escalation record. A mind_safety record includes
 * the message excerpt that triggered it; nothing else from the chat is stored.
 * Server component; the caller has already required the flight surgeon role.
 */
export function CrewMindReview({ crewId, mind, escalations }: { crewId: string; mind: MindSummary; escalations: ReviewEscalation[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="flex flex-col gap-2" data-testid="admin-checkins">
        <HistoryTable
          title={`Check-ins · ${crewId}`}
          description={`Scores only; notes are private to the crew member. 3-day pattern now: ${mind.pattern.status === "watch" ? `Watch. ${mind.pattern.reason}` : "Normal."}`}
          rows={mind.history.slice(0, 14)}
          getRowId={(r) => String(r.id)}
          emptyMessage="No check-ins yet."
          columns={[
            { key: "at", header: "Time (UTC)", cell: (r) => utc(r.recordedAt) },
            { key: "mood", header: "Mood", align: "right", cell: (r) => `${r.mood}/5` },
            { key: "stress", header: "Stress", align: "right", cell: (r) => (r.stress !== null ? `${r.stress}/5` : "—") },
            { key: "sleep", header: "Sleep q.", align: "right", cell: (r) => (r.sleepQuality !== null ? `${r.sleepQuality}/5` : "—") },
            { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <MessageCircleHeart className="size-3.5 text-primary" aria-hidden="true" />
          {mind.daysThisMonth} check-in days this month{mind.checkedInToday ? ", including today" : ""}.
        </p>
      </div>

      <Card className="gap-3" data-testid="admin-escalations">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="size-4 text-primary" aria-hidden="true" />
            Escalation records · {crewId}
          </CardTitle>
          <CardDescription className="text-xs">
            Newest first. Safety-check records include the crew member&apos;s message excerpt; other chat text is never stored.
          </CardDescription>
        </CardHeader>
        {escalations.length === 0 ? (
          <p className="px-4 pb-4 text-xs text-muted-foreground">No escalation records.</p>
        ) : (
          <ol className="flex flex-col gap-3 px-4 pb-4">
            {escalations.map((e) => {
              const safety = e.ruleId === MIND_SAFETY_ID ? (e.evidence as SafetyEvidence) : null;
              return (
                <li key={e.id} className="rounded-xl border border-border/70 bg-background/40 p-3 text-xs" data-testid="admin-escalation" data-rule={e.ruleId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{RULE_LABELS[e.ruleId] ?? e.ruleId}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{utc(e.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-foreground/90">{e.reason}</p>
                  {safety && (
                    <div className="mt-2 border-t border-border/60 pt-2">
                      <p className="text-[11px] text-muted-foreground">
                        From the {safety.source === "checkin_note" ? "check-in note" : safety.source === "support_chat" ? "Mind support chat" : "co-pilot chat"} · categories: {safety.categories.join(", ")}
                      </p>
                      <ul className="mt-1 flex flex-col gap-1" data-testid="admin-escalation-excerpt">
                        {safety.messages.map((m, i) => (
                          <li key={i} className="rounded-lg bg-muted/40 px-2 py-1 text-foreground">
                            “{m.text}”
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
