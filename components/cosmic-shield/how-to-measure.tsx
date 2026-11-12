import { Clock, Info, ListChecks, SatelliteDish, TriangleAlert, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MeasureStep {
  title: string;
  detail?: string;
}

export interface HowToMeasureProps {
  title?: string;
  description?: string;
  steps: MeasureStep[];
  equipment?: string[];
  duration?: string;
  tip?: string;
  caution?: string;
  /** Hide the "built for comms delay" footer. */
  hideAutonomyNote?: boolean;
  /** Render only the content, without the Card frame (used in the Instructions dialog). */
  bare?: boolean;
  className?: string;
}

/**
 * Step-by-step onboard guidance. On a Mars transit the ground may be up to
 * ~22 min away each way, so every measurement explains itself in-app.
 */
export function HowToMeasure({
  title = "How to measure",
  description,
  steps,
  equipment,
  duration,
  tip,
  caution,
  hideAutonomyNote,
  bare,
  className,
}: HowToMeasureProps) {
  if (bare) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <Body steps={steps} equipment={equipment} duration={duration} tip={tip} caution={caution} hideAutonomyNote={hideAutonomyNote} />
      </div>
    );
  }
  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ListChecks className="size-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Body steps={steps} equipment={equipment} duration={duration} tip={tip} caution={caution} hideAutonomyNote={hideAutonomyNote} />
      </CardContent>
    </Card>
  );
}

function Body({
  steps,
  equipment,
  duration,
  tip,
  caution,
  hideAutonomyNote,
}: Pick<HowToMeasureProps, "steps" | "equipment" | "duration" | "tip" | "caution" | "hideAutonomyNote">) {
  return (
    <>
        {(equipment?.length || duration) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {equipment?.length ? (
              <span className="flex items-center gap-1.5">
                <Wrench className="size-3.5" aria-hidden="true" />
                {equipment.join(" · ")}
              </span>
            ) : null}
            {duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden="true" />
                {duration}
              </span>
            )}
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-[11px] text-primary">
                {i + 1}
              </span>
              <div className="pt-0.5">
                <p className="text-[13px] font-medium text-foreground">{s.title}</p>
                {s.detail && <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>}
              </div>
            </li>
          ))}
        </ol>

        {tip && (
          <p className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-foreground/90">
            <Info className="mt-px size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {tip}
          </p>
        )}
        {caution && (
          <p className="flex gap-2 rounded-lg border border-watch/30 bg-watch/8 p-2.5 text-xs text-watch-foreground">
            <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {caution}
          </p>
        )}
        {!hideAutonomyNote && (
          <p className="flex items-center gap-2 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
            <SatelliteDish className="size-3.5 shrink-0" aria-hidden="true" />
            Built for autonomy: guidance works without waiting on ground support.
          </p>
        )}
    </>
  );
}
