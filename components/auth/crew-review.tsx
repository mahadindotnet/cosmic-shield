import Link from "next/link";
import {
  Activity,
  Droplets,
  HeartPulse,
  KeyRound,
  Moon,
  Radiation,
  ShieldAlert,
  Smile,
  UserRound,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/cosmic-shield/status";
import type { CrewDashboardPayload } from "@/lib/rules/types";
import { cn } from "@/lib/utils";

export interface CrewPickerItem {
  crewId: string;
  displayName: string;
  title: string;
  locked: boolean;
}

/**
 * Crew picker for the flight surgeon (Crew admin page). Each card is a link
 * to ?crew=<id>, so the selection is in the URL and survives a reload.
 */
export function CrewPicker({ crew, selected }: { crew: CrewPickerItem[]; selected: string | null }) {
  return (
    <nav aria-label="Choose a crew member to review" data-testid="crew-picker">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {crew.map((c) => {
          const active = c.crewId === selected;
          return (
            <li key={c.crewId}>
              <Link
                href={`/dashboard/admin?crew=${c.crewId}`}
                scroll={false}
                aria-current={active ? "true" : undefined}
                data-testid={`pick-${c.crewId}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active
                    ? "border-primary/60 bg-primary/15 shadow-[0_0_24px_-10px_oklch(0.82_0.12_210/70%)]"
                    : "border-border bg-background/40 hover:border-primary/35 hover:bg-background/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border font-heading text-sm font-semibold",
                    active ? "border-primary/60 bg-primary/20 text-primary" : "border-border bg-background/60 text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {initials(c.displayName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-xs text-muted-foreground">{c.crewId}</span>
                  <span className="block truncate text-sm font-medium text-foreground">{c.displayName}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{c.title}</span>
                </span>
                {c.locked && (
                  <span className="shrink-0 rounded-full border border-escalate/40 bg-escalate/10 px-2 py-0.5 text-[10px] text-escalate-foreground">
                    Locked
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export interface CrewAccountSummary {
  crewId: string;
  displayName: string;
  title: string;
  locked: boolean;
  failedAttempts: number;
  mustChangePin: boolean;
}

export interface CrewAuditRow {
  id: number;
  timestamp: number;
  success: boolean;
  reason: string;
}

const utc = (ms: number) => `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;

/** Review panel for the crew member chosen in the picker. */
export function CrewReview({
  account,
  data,
  activity,
}: {
  account: CrewAccountSummary;
  data: CrewDashboardPayload | null;
  activity: CrewAuditRow[];
}) {
  const v = data?.vitals;
  const tiles: { icon: LucideIcon; label: string; value: string; unit: string }[] = v
    ? [
        { icon: HeartPulse, label: "Heart rate", value: String(v.heartRateBpm), unit: "bpm" },
        { icon: Activity, label: "HRV", value: String(v.hrvMs), unit: "ms" },
        { icon: Wind, label: "SpO₂", value: String(v.spo2Pct), unit: "%" },
        { icon: HeartPulse, label: "Blood pressure", value: `${v.systolicBp}/${v.diastolicBp}`, unit: "mmHg" },
        { icon: Moon, label: "Sleep", value: v.sleepHours.toFixed(1), unit: "h" },
        { icon: Smile, label: "Stress index", value: String(v.stressIndex), unit: "/100" },
        { icon: Radiation, label: "Dose today", value: v.radiationDoseMsvDay.toFixed(2), unit: "mSv" },
        { icon: Droplets, label: "Hydration", value: data!.moduleState.hydrationLiters.toFixed(1), unit: `of ${data!.moduleState.hydrationTargetLiters} L` },
      ]
    : [];

  return (
    <section
      aria-labelledby="review-heading"
      className="glass-panel flex flex-col gap-6 rounded-2xl p-5"
      data-testid="crew-review"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full border border-primary/40 bg-primary/15">
            <UserRound className="size-6 text-primary" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-xs text-muted-foreground">{account.crewId}</p>
            <h2 id="review-heading" className="font-heading text-xl font-medium text-foreground">
              {account.displayName}
            </h2>
            <p className="text-xs text-muted-foreground">{account.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {account.locked ? (
            <span className="rounded-full border border-escalate/40 bg-escalate/10 px-2.5 py-1 text-escalate-foreground">Account locked</span>
          ) : (
            <span className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-muted-foreground">Account active</span>
          )}
          {account.failedAttempts > 0 && (
            <span className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-muted-foreground">
              {account.failedAttempts} failed sign-in{account.failedAttempts > 1 ? "s" : ""}
            </span>
          )}
          {account.mustChangePin && (
            <span className="rounded-full border border-watch/40 bg-watch/10 px-2.5 py-1 text-watch-foreground">
              <KeyRound className="mr-1 inline size-3" aria-hidden="true" />
              PIN change pending
            </span>
          )}
        </div>
      </div>

      {data ? (
        <>
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldAlert className="size-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Escalation</p>
              <StatusBadge status={data.escalation.level} />
              <span className="text-[11px] text-muted-foreground">Mission day {data.missionDay}</span>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{data.escalation.headline}</p>
            {data.escalation.reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                {data.escalation.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="console-label">Latest readings</h3>
              <p className="text-[11px] text-muted-foreground">Simulated demo crew data, not NASA measurements.</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <t.icon className="size-3.5 text-primary/80" aria-hidden="true" />
                    {t.label}
                  </dt>
                  <dd className="mt-0.5 font-mono text-xl text-foreground tabular-nums">
                    {t.value}
                    <span className="ml-1 text-[11px] text-muted-foreground">{t.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="console-label mb-2">Recent check-ins</h3>
              {data.behavioralLog.length ? (
                <ul className="flex flex-col gap-2">
                  {data.behavioralLog.slice(0, 4).map((l, i) => (
                    <li key={i} className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
                      <span className="font-mono text-muted-foreground">{l.at}</span>
                      <span className="ml-2 text-muted-foreground">mood {l.affectScore}/5</span>
                      <p className="mt-0.5 text-foreground/90">{l.note}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No check-ins yet.</p>
              )}
            </div>
            <ActivityList rows={activity} />
          </div>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No health data is linked to this account yet.
          </p>
          <ActivityList rows={activity} />
        </div>
      )}
    </section>
  );
}

function ActivityList({ rows }: { rows: CrewAuditRow[] }) {
  return (
    <div>
      <h3 className="console-label mb-2">Sign-in activity</h3>
      {rows.length ? (
        <ul className="flex flex-col gap-1 text-xs" data-testid="crew-activity">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-1 odd:bg-background/30">
              <span className="font-mono whitespace-nowrap text-muted-foreground">{utc(a.timestamp)}</span>
              <span className={a.success ? "text-normal-foreground" : "text-escalate-foreground"}>{a.success ? "✓" : "✗"}</span>
              <span className="truncate font-mono text-muted-foreground">{a.reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No sign-in activity yet.</p>
      )}
    </div>
  );
}

function initials(name: string) {
  const parts = name.replace(/^(Cmdr|Dr|Lt|Spec)\.\s+/, "").split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "");
}
