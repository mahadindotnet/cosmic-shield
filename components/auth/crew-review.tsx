import Link from "next/link";
import {
  Bone,
  Eye,
  HeartPulse,
  KeyRound,
  Moon,
  Radiation,
  ShieldAlert,
  Smile,
  UserRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/cosmic-shield/status";
import type { CrewSnapshot, ModuleReading } from "@/lib/crew/snapshot";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<ModuleReading["module"], LucideIcon> = {
  vitals: HeartPulse,
  "sleep-stress": Moon,
  radiation: Radiation,
  bone: Bone,
  gi: Utensils,
  eyes: Eye,
  mind: Smile,
};

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

/**
 * Review panel for the crew member chosen in the picker: account state, the
 * latest reading of every module and the active alerts, all from the module
 * tables (lib/crew/snapshot.ts, lib/alerts/active.ts). Nothing simulated.
 */
export function CrewReview({
  account,
  snapshot,
  activity,
}: {
  account: CrewAccountSummary;
  snapshot: CrewSnapshot;
  activity: CrewAuditRow[];
}) {
  const alerts = snapshot.alerts;
  const level = alerts.some((a) => a.level === "escalate") ? "escalate" : alerts.length ? "watch" : "normal";
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
            <p className="text-xs text-muted-foreground">
              {account.title} · {snapshot.environment ?? "No mission environment chosen"}
            </p>
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

      <div className="rounded-xl border border-border bg-background/40 p-4" data-testid="crew-review-alerts">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldAlert className="size-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Active alerts</p>
          <StatusBadge status={level} />
        </div>
        {alerts.length ? (
          <ul className="mt-2 flex flex-col gap-1.5 text-xs">
            {alerts.map((a) => (
              <li key={a.key} data-rule={a.ruleId} className="text-foreground/90">
                <span className="font-medium">{a.title}</span>
                {a.detail && <span className="text-muted-foreground"> {a.detail}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">All clear: no Watch or Escalate from the rules engine.</p>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="console-label">Latest readings</h3>
          <p className="text-[11px] text-muted-foreground">From the crew member&apos;s logged entries (demo seed rows are marked on each module page).</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="crew-review-readings">
          {snapshot.readings.map((r) => {
            const Icon = MODULE_ICONS[r.module];
            return (
              <div key={r.module} className="rounded-xl border border-border bg-background/40 px-3 py-2.5" data-module={r.module} data-status={r.status}>
                <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Icon className="size-3.5 text-primary/80" aria-hidden="true" />
                  {r.label}
                </dt>
                {r.value === null ? (
                  <dd className="mt-1 text-xs text-muted-foreground">No entries yet</dd>
                ) : (
                  <dd className="mt-0.5 flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-xl text-foreground tabular-nums">
                      {r.value}
                      <span className="ml-1 text-[11px] text-muted-foreground">{r.unit}</span>
                    </span>
                    {r.status !== "no-data" && <StatusBadge status={r.status} />}
                  </dd>
                )}
              </div>
            );
          })}
          <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5" data-module="career-dose">
            <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Radiation className="size-3.5 text-primary/80" aria-hidden="true" />
              Career dose
            </dt>
            {snapshot.careerDose ? (
              <dd className="mt-0.5 font-mono text-xl text-foreground tabular-nums">
                {snapshot.careerDose.totalMsv}
                <span className="ml-1 text-[11px] text-muted-foreground">of 600 mSv</span>
              </dd>
            ) : (
              <dd className="mt-1 text-xs text-muted-foreground">No entries yet</dd>
            )}
          </div>
        </dl>
      </div>

      <ActivityList rows={activity} />
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
