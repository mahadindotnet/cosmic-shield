"use client";

import { Bell, CalendarCheck, Dumbbell, Flame, ScanLine, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BodyMap } from "@/components/cosmic-shield/body-map";
import { MissionContext } from "@/components/cosmic-shield/mission-context";
import { getSection, type SectionSlug } from "@/components/cosmic-shield/sections";
import { StatusCard } from "@/components/cosmic-shield/status-card";

const HEATMAP_WEEKS = 12;
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Modules flanking the body map, top-to-bottom roughly following the body. */
const LEFT: SectionSlug[] = ["vitals", "sleep-stress", "radiation", "bone"];
const RIGHT: SectionSlug[] = ["eyes", "gi", "mind"];

function ModuleCard({ slug }: { slug: SectionSlug }) {
  const s = getSection(slug)!;
  return <StatusCard title={s.title} icon={s.icon} href={s.href} reference="Open module" />;
}

export function OverviewView() {
  return (
    <>
      {/* Title and description live in the top bar and the Instructions popup. */}
      <h1 className="sr-only">{getSection("overview")!.title}</h1>
      <div id="overview-mission" className="scroll-mt-20">
        <MissionContext showPicker={false} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)_minmax(0,1fr)]">
        {/* Body map: first on small screens, centre column on large */}
        <Card id="overview-body" className="order-first scroll-mt-20 gap-2 overflow-visible lg:order-none lg:col-start-2 lg:row-start-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScanLine className="size-4 text-primary" aria-hidden="true" />
              Body map
            </CardTitle>
            <CardDescription className="text-xs">Tap a highlighted area to open its module.</CardDescription>
          </CardHeader>
          <CardContent className="relative flex flex-1 items-center justify-center overflow-visible py-2">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 top-1/4 bottom-1/4 rounded-full bg-primary/10 blur-3xl"
            />
            <BodyMap className="max-w-[250px] xl:max-w-[270px]" />
          </CardContent>
        </Card>

        <div id="overview-modules" className="grid scroll-mt-20 content-start gap-4 sm:grid-cols-2 lg:col-start-1 lg:row-start-1 lg:grid-cols-1">
          {LEFT.map((slug) => (
            <ModuleCard key={slug} slug={slug} />
          ))}
        </div>

        <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-start-3 lg:row-start-1 lg:grid-cols-1">
          {RIGHT.map((slug) => (
            <ModuleCard key={slug} slug={slug} />
          ))}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[13px]">
                <Bell className="size-4 text-primary/80" aria-hidden="true" />
                Active alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                No alerts. Watch and Escalate events will appear here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gamification: check-in streak */}
      <Card id="overview-streak" className="mt-4 scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarCheck className="size-4 text-primary" aria-hidden="true" />
            Check-in streak
          </CardTitle>
          <CardDescription className="text-xs">
            Daily check-ins and exercise earn points. Last {HEATMAP_WEEKS} weeks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1" role="img" aria-label="Check-in calendar, no check-ins yet">
            <div className="grid grid-rows-7 gap-1 pr-1">
              {DAYS.map((d, i) => (
                <span key={i} className="flex h-3.5 items-center font-mono text-[9px] text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-1">
              {Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => (
                <span key={i} className="size-3.5 rounded-[3px] border border-border/60 bg-muted/40" />
              ))}
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Flame, k: "Streak", v: "0", s: "days" },
              { icon: CalendarCheck, k: "Check-ins", v: "0", s: "total" },
              { icon: Dumbbell, k: "Exercise", v: "0", s: "sessions" },
              { icon: Trophy, k: "Points", v: "0", s: "pts" },
            ].map((x) => (
              <div key={x.k} className="rounded-lg border border-border bg-background/40 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <x.icon className="size-3.5 text-primary/80" aria-hidden="true" />
                  {x.k}
                </p>
                <p className="mt-1 font-mono text-2xl text-foreground tabular-nums">
                  {x.v}
                  <span className="ml-1 text-[11px] text-muted-foreground">{x.s}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
