"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Activity, Droplets, Eye, Heart, Moon, Radiation, Wind } from "lucide-react";
import { AssistantPanel } from "@/components/cosmic-shield/assistant-panel";
import { Sparkline } from "@/components/cosmic-shield/sparkline";
import { TrendChart } from "@/components/cosmic-shield/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CREW_IDS } from "@/lib/demo/crew-profiles";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import type { EscalationLevel } from "@/lib/rules/types";

const CREW_LABELS: Record<string, string> = {
  reyes: "Reyes",
  okafor: "Okafor",
  lindqvist: "Lindqvist",
  tanaka: "Tanaka",
};

function levelVariant(level: EscalationLevel) {
  if (level === "escalate") return "escalate" as const;
  if (level === "watch") return "watch" as const;
  return "normal" as const;
}

export function DashboardShell() {
  const ladderRef = useRef<HTMLDivElement>(null);
  const { crewId, payload, moduleState, loading, setCrewId, loadCrew, patchModule } =
    useDashboardStore();

  useEffect(() => {
    void loadCrew(crewId);
  }, [crewId, loadCrew]);

  if (loading || !payload || !moduleState) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-zinc-400 font-mono text-sm">
        Initializing Cosmic Shield mission console…
      </div>
    );
  }

  const v = payload.vitals;
  const esc = payload.escalation;

  async function runSansScan() {
    const res = await fetch("/api/vision/sans", { method: "POST" });
    const data = (await res.json()) as {
      sansConfidence: number;
      status: "nominal" | "watch" | "escalate";
    };
    patchModule({ sansConfidence: data.sansConfidence, sansStatus: data.status });
    toast.message("SANS capture analyzed", {
      description: `Confidence ${(data.sansConfidence * 100).toFixed(0)}% · ${data.status}`,
    });
  }

  async function setBristol(type: number) {
    const res = await fetch("/api/vision/bristol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedType: type }),
    });
    const data = (await res.json()) as { bristolType: number; status: string };
    patchModule({
      bristolType: data.bristolType,
      giStatus: data.status === "watch" ? "logged" : "nominal",
    });
    toast.message(`Bristol type ${type} logged`);
  }

  async function logAffect(score: number) {
    await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crewId, affectScore: score, note: "Self-report via dashboard" }),
    });
    toast.success(`Affect ${score}/5 logged`);
  }

  function logHydration() {
    if (!moduleState) return;
    const next = Math.min(moduleState.hydrationLiters + 0.25, moduleState.hydrationTargetLiters);
    patchModule({ hydrationLiters: next });
    if (next >= moduleState.hydrationTargetLiters) toast.success("Hydration target met");
    else toast.message(`Hydration ${next.toFixed(2)} L`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border border-cyan-700/50 bg-gradient-to-br from-zinc-900 to-cyan-950 flex items-center justify-center">
            <Radiation className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Cosmic Shield</h1>
            <p className="text-xs font-mono text-zinc-500">
              MET day {payload.missionDay} · comms delay {payload.commsDelayMinutes} min
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CREW_IDS.map((id) => (
            <Button
              key={id}
              size="sm"
              variant={crewId === id ? "default" : "secondary"}
              data-testid={`crew-${id}`}
              onClick={() => setCrewId(id)}
            >
              {CREW_LABELS[id]}
            </Button>
          ))}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                Co-pilot
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="pt-10 pb-2 px-4 border-b border-zinc-800">
                <h2 className="font-mono text-sm text-cyan-300">Mission co-pilot</h2>
                <p className="text-xs text-zinc-500 mt-1">{payload.name}</p>
              </div>
              <AssistantPanel crewId={crewId} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div
        data-testid="escalation-banner"
        className={`rounded-lg border px-4 py-3 ${
          esc.level === "escalate"
            ? "border-red-900/60 bg-red-950/30"
            : esc.level === "watch"
              ? "border-amber-900/60 bg-amber-950/25"
              : "border-emerald-900/40 bg-emerald-950/20"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Badge variant={levelVariant(esc.level)} data-testid="escalation-level">
              {esc.level}
            </Badge>
            <p className="mt-2 text-sm text-zinc-200">{esc.headline}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => ladderRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            View evidence →
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Heart rate", value: `${v.heartRateBpm}`, unit: "bpm", icon: Heart, series: payload.hrTrend },
          { label: "SpO₂", value: `${v.spo2Pct}`, unit: "%", icon: Wind, series: payload.hrTrend },
          { label: "Blood pressure", value: `${v.systolicBp}/${v.diastolicBp}`, unit: "mmHg", icon: Activity, series: payload.hrvTrend },
          { label: "Sleep", value: v.sleepHours.toFixed(1), unit: "h", icon: Moon, series: payload.sleepTrend },
          { label: "Radiation", value: v.radiationDoseMsvDay.toFixed(2), unit: "mSv/d", icon: Radiation, series: payload.radiationTrend },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2 normal-case text-zinc-400">
                <tile.icon className="h-3.5 w-3.5" />
                {tile.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl text-cyan-100">
                {tile.value}
                <span className="ml-1 text-xs text-zinc-500">{tile.unit}</span>
              </div>
              <Sparkline data={tile.series} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>14-day HR / HRV trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart hr={payload.hrTrend} hrv={payload.hrvTrend} />
            <p className="mt-2 text-[11px] text-zinc-500">Baseline band: Inspiration4 reference (OSDR)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stress & countermeasures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Stress index</span>
                <span className="font-mono text-zinc-300">{v.stressIndex}</span>
              </div>
              <div className="h-2 rounded bg-zinc-800">
                <div
                  className="h-2 rounded bg-amber-500/80"
                  style={{ width: `${Math.min(v.stressIndex, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-zinc-300">
              Exercise compliance:{" "}
              <span className="font-mono text-cyan-200">{moduleState.exerciseCompliancePct}%</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={logHydration}
            >
              <Droplets className="h-4 w-4" /> Log hydration ({moduleState.hydrationLiters.toFixed(2)} /{" "}
              {moduleState.hydrationTargetLiters} L)
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>SANS ocular screening</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative h-32 rounded-md border border-zinc-700 bg-[radial-gradient(circle_at_30%_30%,#451a03,transparent_55%),radial-gradient(circle_at_70%_60%,#1c1917,#09090b)]">
              <div className="absolute inset-4 rounded-full border border-amber-900/40" />
              <Eye className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-amber-200/70" />
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              Confidence {(moduleState.sansConfidence * 100).toFixed(0)}% · {moduleState.sansStatus}
            </p>
            <Button size="sm" onClick={() => void runSansScan()}>
              Re-run capture
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GI — Bristol classification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={moduleState.bristolType === n ? "default" : "secondary"}
                  onClick={() => void setBristol(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">Reference: OSD-630 stool (Inspiration4)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Behavioral check-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-zinc-500">Structured screening — not diagnostic</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button key={n} size="sm" variant="outline" onClick={() => void logAffect(n)}>
                  {n}
                </Button>
              ))}
            </div>
            <div className="max-h-32 overflow-auto font-mono text-[11px] text-zinc-400 space-y-1">
              {payload.behavioralLog.map((e, i) => (
                <div key={i}>
                  [{e.at}] {e.affectScore}/5 — {e.note}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card ref={ladderRef} data-testid="escalation-ladder">
        <CardHeader>
          <CardTitle>Escalation ladder</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          {(["normal", "watch", "escalate"] as const).map((step) => (
            <div
              key={step}
              className={`rounded-md border p-3 ${
                esc.level === step ? "border-cyan-700/60 bg-cyan-950/20" : "border-zinc-800"
              }`}
            >
              <Badge variant={levelVariant(step)}>{step}</Badge>
              <ul className="mt-2 list-disc pl-4 text-zinc-400 space-y-1">
                {step === esc.level
                  ? esc.reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)
                  : step === "normal"
                    ? ["Continue monitoring", "Log countermeasures"]
                    : step === "watch"
                      ? ["Trend thresholds crossed", "Onboard guidance"]
                      : ["Flight surgeon contact", "Evidence packet attached"]}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <footer className="text-center text-[11px] text-zinc-600 pb-8">
        Prototype · simulated crew data · decision support not diagnosis ·{" "}
        {payload.nasaSources.map((s) => s.source).join(" · ")}
      </footer>
    </div>
  );
}
