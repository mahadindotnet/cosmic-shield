"use client";

import { useSyncExternalStore } from "react";
import { CalendarCheck, Dumbbell, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MILESTONES = [
  { days: 3, icon: "🔥" },
  { days: 7, icon: "🔥" },
  { days: 30, icon: "🔥" },
  { days: 100, icon: "💯" },
];

/** Sequential single-hue scale (primary), level 0 = no check-in. */
const LEVELS = ["border border-border/60 bg-muted/40", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"];

/** YYYY-MM-DD of a UTC-midnight date (calendar arithmetic is done in UTC). */
const toKey = (d: Date) => d.toISOString().slice(0, 10);

/** Station time: the UTC date as YYYY-MM-DD (the same day key as check-ins and the rules). */
const utcKey = (d: Date) => d.toISOString().slice(0, 10);

/** Today's UTC date on the client; null during server render. */
function useToday() {
  return useSyncExternalStore(
    () => () => {},
    () => utcKey(new Date()),
    () => null,
  );
}

export interface StreakPanelProps {
  /** Mind check-ins per UTC day, keyed YYYY-MM-DD. */
  checkins?: Record<string, number>;
  /** Not computed yet: null shows "—" rather than a made-up 0. */
  exerciseSessions?: number | null;
  points?: number | null;
}

/**
 * Gamified streak: a Snapchat-style flame counter with an hourglass warning
 * and milestones, next to a LeetCode-style calendar for the current month.
 */
export function StreakPanel({ checkins = {}, exerciseSessions = null, points = null }: StreakPanelProps) {
  const today = useToday();
  const m = buildMonth(today, checkins);
  const best = Math.max(m.streak, m.maxStreak);

  return (
    <Card id="overview-streak" data-testid="streak-panel" className="scroll-mt-20 gap-0 overflow-hidden p-0">
      <div className="grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        {/* Snapchat-style streak */}
        <div className="relative flex flex-col items-center gap-4 border-b border-border bg-[radial-gradient(80%_60%_at_50%_30%,oklch(0.55_0.18_330/18%),transparent)] p-6 text-center lg:border-r lg:border-b-0">
          <p className="console-label">Check-in streak</p>
          <div className="relative flex size-32 items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,var(--chart-3),var(--nebula),var(--chart-1),var(--chart-3))] opacity-70 blur-[1px] motion-safe:animate-[spin_12s_linear_infinite]"
            />
            <span className="absolute inset-[5px] rounded-full bg-background/95" />
            <span className="relative flex flex-col items-center">
              <span className="flex items-center gap-1 font-heading text-5xl font-semibold text-foreground tabular-nums">
                {m.streak}
                <span aria-hidden="true" className={cn("text-4xl", m.streak === 0 && "opacity-45")}>
                  🔥
                </span>
              </span>
              <span className="text-xs text-muted-foreground">day streak</span>
            </span>
          </div>

          <p className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-foreground/90">
            <span aria-hidden="true">{m.checkedToday ? "✅" : "⌛"}</span>
            {m.checkedToday
              ? "Checked in today. Streak safe."
              : m.streak > 0
                ? "Check in before midnight UTC to keep it."
                : "Check in today to start a streak."}
          </p>

          <ul className="flex gap-2" aria-label="Streak milestones">
            {MILESTONES.map((ms) => {
              const reached = best >= ms.days;
              return (
                <li
                  key={ms.days}
                  title={reached ? `${ms.days}-day streak reached` : `Reach a ${ms.days}-day streak`}
                  className={cn(
                    "flex h-12 w-12 flex-col items-center justify-center rounded-xl border text-[10px] font-medium",
                    reached ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-background/40 text-muted-foreground",
                  )}
                >
                  <span aria-hidden="true" className={cn("text-base leading-none", !reached && "opacity-35")}>
                    {ms.icon}
                  </span>
                  {ms.days}d
                </li>
              );
            })}
          </ul>
        </div>

        {/* LeetCode-style calendar, current month */}
        <div className="flex min-w-0 flex-col gap-5 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="text-sm text-foreground">
              <span className="font-mono text-lg font-medium tabular-nums">{m.total}</span>{" "}
              <span className="text-muted-foreground">check-ins in {m.title || "this month"}</span>
            </p>
            <p className="flex gap-4 text-xs text-muted-foreground">
              <span>
                Active days <span className="font-mono text-foreground">{m.activeDays}</span>
                <span className="text-muted-foreground">/{m.daysSoFar}</span>
              </span>
              <span>
                Best streak <span className="font-mono text-foreground">{m.maxStreak}</span>
              </span>
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-[460px] flex-col gap-3">
            <div
              role="img"
              aria-label={`Check-in calendar for ${m.title || "this month"}: ${m.total} check-ins on ${m.activeDays} days`}
              className="grid w-full grid-cols-7 gap-1.5"
            >
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="pb-1 text-center font-mono text-[10px] text-muted-foreground">
                  {d}
                </span>
              ))}
              {m.cells.map((c, i) =>
                c === null ? (
                  <span key={i} aria-hidden="true" />
                ) : (
                  <span
                    key={i}
                    data-today={c.isToday || undefined}
                    title={
                      c.future
                        ? `${c.date}: upcoming`
                        : `${c.date}: ${c.count ? `${c.count} check-in${c.count > 1 ? "s" : ""}` : "no check-in"}`
                    }
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md font-mono text-[10px] tabular-nums",
                      c.future
                        ? "border border-dashed border-border text-muted-foreground"
                        : cn(LEVELS[Math.min(c.count, 4)], c.count >= 3 ? "text-background" : "text-muted-foreground"),
                      c.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                    )}
                  >
                    {c.day}
                  </span>
                ),
              )}
            </div>

            <div className="flex items-center gap-1 self-end text-[10px] text-muted-foreground">
              Less
              {LEVELS.map((l, i) => (
                <span key={i} aria-hidden="true" className={cn("size-[11px] rounded-[3px]", l)} />
              ))}
              More
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: CalendarCheck, k: "Check-ins", v: m.total },
              { icon: Dumbbell, k: "Exercise", v: exerciseSessions },
              { icon: Trophy, k: "Points", v: points },
            ].map((x) => (
              <div key={x.k} className="rounded-lg border border-border bg-background/40 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <x.icon className="size-3.5 text-primary/80" aria-hidden="true" />
                  {x.k}
                </p>
                {x.v === null ? (
                  <p className="text-xs text-muted-foreground" title="Not counted yet">
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">Not counted yet</span>
                  </p>
                ) : (
                  <p className="font-mono text-xl text-foreground tabular-nums">{x.v}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface DayCell {
  date: string;
  day: number;
  count: number;
  future: boolean;
  isToday: boolean;
}

/** Current-month calendar (Sunday-first) plus streak stats. */
export function buildMonth(today: string | null, checkins: Record<string, number>) {
  if (!today) {
    // Server render: a neutral 5-week grid with no dates.
    return {
      title: "",
      cells: Array.from({ length: 35 }, () => null) as (DayCell | null)[],
      total: 0,
      activeDays: 0,
      daysSoFar: 0,
      streak: 0,
      maxStreak: 0,
      checkedToday: false,
    };
  }

  const now = new Date(`${today}T00:00:00Z`);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: (DayCell | null)[] = Array.from({ length: first.getUTCDay() }, () => null);
  let total = 0;
  let activeDays = 0;
  let run = 0;
  let maxStreak = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = toKey(new Date(Date.UTC(year, month, d)));
    const future = date > today;
    const count = future ? 0 : (checkins[date] ?? 0);
    if (!future) {
      total += count;
      if (count > 0) {
        activeDays++;
        run++;
        maxStreak = Math.max(maxStreak, run);
      } else if (date !== today) {
        run = 0;
      }
    }
    cells.push({ date, day: d, count, future, isToday: date === today });
  }

  // Current streak: consecutive days back from today (today may still be pending),
  // which can run into the previous month.
  let streak = 0;
  let cursor = new Date(now);
  if (!(checkins[today] > 0)) cursor = new Date(cursor.getTime() - DAY_MS);
  while ((checkins[toKey(cursor)] ?? 0) > 0) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return {
    title: `${MONTHS[month]} ${year}`,
    cells,
    total,
    activeDays,
    daysSoFar: now.getUTCDate(),
    streak,
    maxStreak,
    checkedToday: (checkins[today] ?? 0) > 0,
  };
}
