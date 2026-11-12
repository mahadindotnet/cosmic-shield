import { BedDouble } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STAGES = ["Awake", "REM", "Core", "Deep"];

/**
 * Sleep-stage timeline (hypnogram) frame. Empty for now: shows the lanes and
 * time axis so the astronaut knows what will appear once a wearable syncs.
 */
export function SleepStages() {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BedDouble className="size-4 text-primary" aria-hidden="true" />
          Sleep stages
        </CardTitle>
        <CardDescription className="text-xs">Last night, from your wearable.</CardDescription>
      </CardHeader>
      <div className="relative px-4 pb-4" role="img" aria-label="Sleep stages chart, no data yet">
        <div className="grid grid-cols-[52px_1fr] gap-y-0">
          {STAGES.map((s) => (
            <div key={s} className="contents">
              <span className="flex h-12 items-center text-[11px] text-muted-foreground">
                {s}
                <span className="sr-only">: —</span>
              </span>
              <span className="h-12 border-t border-dashed border-border" />
            </div>
          ))}
        </div>
        <div className="ml-[52px] flex justify-between border-t border-border pt-1.5 font-mono text-[10px] text-muted-foreground">
          <span>22:00</span>
          <span>02:00</span>
          <span>06:00</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            No sleep stages recorded yet
          </span>
        </div>
      </div>
    </Card>
  );
}
