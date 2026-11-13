"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Droplets, ListOrdered, ScanSearch } from "lucide-react";
import { Await } from "@/components/cosmic-shield/await";
import { BristolPictogram } from "@/components/cosmic-shield/bristol-pictogram";
import { EntryField, EntryFieldGrid, EntryForm } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, NextStepCard, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganImage, OrganStage, onImage } from "@/components/cosmic-shield/organ-stage";
import { RingGauge } from "@/components/cosmic-shield/ring-gauge";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { TrendChart, type TrendPoint } from "@/components/cosmic-shield/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { logGiAction, type LogGiState } from "@/lib/gi/actions";
import { PHOTO_NOT_ANALYSED_LABEL } from "@/lib/gi/classifier";
import { BRISTOL_TYPES, GI_LIMITS } from "@/lib/gi/rules";
import type { GiSummary } from "@/lib/gi/summary";
import type { DailyPoint } from "@/lib/vitals/summary";
import { cn } from "@/lib/utils";

/** public/organs/gi.webp is 416 × 398. */
const GI_ASPECT = 416 / 398;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export interface GiPageData {
  /** The signed-in crew member's entries; null for a flight surgeon. */
  summary: GiSummary | null;
  canEdit: boolean;
  /** YYYY-MM-DD (UTC). */
  today: string;
}

const toTrend = (p: DailyPoint[] | undefined): TrendPoint[] => (p ?? []).map((x) => ({ label: x.label, value: x.value }));
const shortDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
const BRISTOL_REF = "Bristol Stool Form Scale (Lewis & Heaton 1997)";
const RULE_REF = `Watch: types 1–2 or 6–7 on ${GI_LIMITS.minDays} of the last ${GI_LIMITS.windowDays} days · app default`;

/**
 * GI: Bristol type (1–7) with the standard description of each type, fluid
 * intake and a note; an optional photo is stored as a labelled prototype
 * ("Not analysed: prototype"): the type the crew member chooses is what gets
 * logged. Watch-only pattern rules; never a diagnosis.
 */
export function GiView({ data }: { data: Promise<GiPageData> }) {
  return (
    <ModulePage slug="gi">
      <ModuleHero
        slug="gi"
        title={
          <>
            Gut &amp;
            <br />
            hydration
          </>
        }
        stage={
          <Await promise={data}>
            {(d) => {
              const s = d?.summary;
              return (
                <OrganStage
                  visual={<OrganImage src="/organs/gi.webp" alt="Intestines" />}
                  hotspots={[
                    { id: "bristol", ...onImage(0.52, 0.86, GI_ASPECT), side: "right", label: "Bristol type", icon: ListOrdered, unit: "/7", field: "bristolType", value: s?.latest?.bristolType ?? null },
                    { id: "fluids", ...onImage(0.74, 0.42, GI_ASPECT), side: "right", label: "Fluids today", icon: Droplets, unit: "L", field: "hydrationLiters", value: s?.fluidTodayL ?? null },
                    { id: "photo", ...onImage(0.3, 0.66, GI_ASPECT), side: "left", label: "Photo (prototype)", icon: Camera, field: "photo", value: null },
                  ]}
                />
              );
            }}
          </Await>
        }
        aside={
          <Await promise={data}>
            {(d) => (
              <>
                <RingGauge
                  title="Fluids today"
                  icon={Droplets}
                  value={d?.summary?.fluidTodayL ?? null}
                  max={GI_LIMITS.fluidMinL}
                  unit="L"
                  caption={`Daily band ${GI_LIMITS.fluidMinL}–${GI_LIMITS.fluidMaxL} L (app default).`}
                />
                <NextStepCard title="Log each entry" body="Pick the type that matches best; a photo is optional and is not analysed." />
              </>
            )}
          </Await>
        }
      />

      <PageSection id="gi-status" eyebrow="Now" title="Latest entry and the last 3 days" description={`Types follow the ${BRISTOL_REF}. The pattern rules and the fluid band are app defaults: Watch only, never a diagnosis.`}>
        <Await promise={data}>
          {(d) => {
            const s = d?.summary;
            const empty = !d ? "Loading…" : d.canEdit ? "No entries yet: log your first entry" : "Flight surgeons review crew in Crew admin";
            const ev = s?.evaluation;
            const photos14 = s ? s.history.filter((r) => r.hasPhoto && r.day >= (s.trends.bristol[0]?.day ?? r.day)).length : null;
            return (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="gi-status-cards">
                <StatusCard
                  title="Latest type"
                  icon={ListOrdered}
                  value={s?.latest?.bristolType ?? null}
                  unit="/7"
                  neutral
                  caption={s?.latest ? `${shortDay(s.latest.day)} · ${s.latest.description}` : empty}
                  reference={BRISTOL_REF}
                />
                <StatusCard
                  title="Last 3 days"
                  icon={ScanSearch}
                  value={ev && ev.status !== "no-data" ? ev.daysLogged : null}
                  unit={ev?.daysLogged === 1 ? "day logged" : "days logged"}
                  status={ev && ev.status !== "no-data" ? ev.status : undefined}
                  caption={ev ? (ev.status === "watch" ? "Pattern found: see below" : ev.status === "normal" ? "No pattern in the last 3 days" : "Nothing logged in the last 3 days") : empty}
                  reference={RULE_REF}
                >
                  {ev?.hard.reason && <p className="text-xs text-foreground" data-testid="gi-reason-hard">{ev.hard.reason}</p>}
                  {ev?.loose.reason && <p className="text-xs text-foreground" data-testid="gi-reason-loose">{ev.loose.reason}</p>}
                </StatusCard>
                <StatusCard
                  title="Fluids today"
                  icon={Droplets}
                  value={s?.fluidTodayL ?? null}
                  unit="L"
                  neutral
                  caption={
                    s?.fluidBand
                      ? s.fluidBand === "within"
                        ? "Within the daily band"
                        : s.fluidBand === "below"
                          ? "Below the daily band so far"
                          : "Above the daily band"
                      : s
                        ? "No fluid logged today"
                        : empty
                  }
                  reference={`Band ${GI_LIMITS.fluidMinL}–${GI_LIMITS.fluidMaxL} L/day · app default`}
                />
                <StatusCard
                  title="Photos, 14 days"
                  icon={Camera}
                  value={photos14}
                  neutral
                  caption={s ? PHOTO_NOT_ANALYSED_LABEL : empty}
                  reference="Visible only to you and the flight surgeon"
                />
              </div>
            );
          }}
        </Await>
      </PageSection>

      <PageSection id="gi-log" eyebrow="Step 1" title="Log an entry" description="Choose the Bristol type, add fluid intake and a note if you like. A photo is optional: it is stored privately but not analysed (prototype).">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Await promise={data}>{(d) => <GiForm data={d} />}</Await>
          <Await promise={data}>
            {(d) => (
              <div className="flex flex-col gap-4">
                <TrendChart
                  title="Bristol type"
                  description="The day's latest type, last 14 days."
                  data={toTrend(d?.summary?.trends.bristol)}
                  unit="/7"
                  seriesLabel="Bristol type"
                  yDomain={[1, 7]}
                  colorSlot={2}
                  height={200}
                  testId="trend-bristol"
                />
                <TrendChart
                  title="Fluid intake"
                  description="Total per day, last 14 days."
                  data={toTrend(d?.summary?.trends.fluid)}
                  unit="L"
                  baseline={{ min: GI_LIMITS.fluidMinL, max: GI_LIMITS.fluidMaxL, label: "Band (app default)" }}
                  yDomain={[0, 4]}
                  colorSlot={4}
                  height={180}
                  testId="trend-fluid"
                />
              </div>
            )}
          </Await>
        </div>
      </PageSection>

      <PageSection id="gi-scale" eyebrow="Reference" title="Bristol stool scale" description={`The seven types and their standard descriptions, from the ${BRISTOL_REF}.`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {BRISTOL_TYPES.map((b) => (
            <Card key={b.type} size="sm" className="gap-1">
              <CardContent className="flex flex-col gap-1.5">
                <span className="font-mono text-3xl font-light text-primary">{b.type}</span>
                <BristolPictogram type={b.type} />
                <span className="text-xs leading-snug text-foreground/90">{b.description}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageSection>

      <PageSection id="gi-history" eyebrow="Step 2" title="History" description="Every entry, newest first. Photos open only for you and the flight surgeon.">
        <Await promise={data}>
          {(d) => (
            <HistoryTable
              testId="gi-history"
              rows={d?.summary?.history ?? []}
              getRowId={(r) => String(r.id)}
              rowProps={() => ({ "data-testid": "gi-history-row" }) as React.ComponentProps<"tr">}
              emptyMessage={!d ? "Loading…" : d.canEdit ? undefined : "Flight surgeons review crew in Crew admin."}
              columns={[
                { key: "day", header: "Day", cell: (r) => shortDay(r.day) },
                {
                  key: "type",
                  header: "Type",
                  cell: (r) =>
                    r.bristolType === null ? (
                      "—"
                    ) : (
                      <span className="inline-flex items-center gap-2" title={r.description}>
                        <span className="font-mono">{r.bristolType}</span>
                        <BristolPictogram type={r.bristolType} className="h-4 w-10" />
                      </span>
                    ),
                },
                { key: "desc", header: "Description", cell: (r) => <span className="text-xs text-muted-foreground">{r.description || "—"}</span> },
                { key: "fluid", header: "Fluids", align: "right", cell: (r) => (r.hydrationLiters === null ? "—" : `${r.hydrationLiters} L`) },
                { key: "note", header: "Note", cell: (r) => <span className="text-xs">{r.note ?? "—"}</span> },
                {
                  key: "photo",
                  header: "Photo",
                  cell: (r) =>
                    r.photoLabel ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <a href={`/api/photos/gi/${r.id}`} target="_blank" rel="noopener" className="text-xs text-primary underline-offset-2 hover:underline" data-testid="gi-photo-link">
                          View photo
                        </a>
                        <Badge variant="outline" className="text-[10px]" data-testid="gi-photo-label">
                          {r.photoLabel}
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    ),
                },
                { key: "src", header: "Source", cell: (r) => <span className="text-xs text-muted-foreground">{r.source === "seed" ? "Demo seed" : "Logged"}</span> },
              ]}
            />
          )}
        </Await>
      </PageSection>
    </ModulePage>
  );
}

function GiForm({ data }: { data: GiPageData | null }) {
  const [state, formAction, pending] = useActionState<LogGiState, FormData>(logGiAction, {});
  const [photoError, setPhotoError] = useState<string | null>(null);
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (state.savedAt) toast.success("GI entry saved", { description: state.photoLabel ? `Photo stored · ${state.photoLabel}` : undefined });
  }, [state.savedAt, state.photoLabel]);

  /** Checked again on the server; here only so a too-large file isn't sent at all. */
  function checkPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    if (!f) return setPhotoError(null);
    if (!PHOTO_ACCEPT.split(",").includes(f.type)) {
      e.currentTarget.value = "";
      return setPhotoError("Only JPEG, PNG or WebP images can be uploaded.");
    }
    if (f.size > MAX_PHOTO_BYTES) {
      e.currentTarget.value = "";
      return setPhotoError("The photo must be 5 MB or smaller.");
    }
    setPhotoError(null);
  }

  return (
    <EntryForm
      title="Log GI entry"
      description="Pick the type that matches best. Fluids, note and photo are optional."
      footnote="Not a diagnosis. Each day with a GI entry earns streak points."
      action={formAction}
      pending={pending}
      testId="gi-form"
      disabledNote={!data ? "Loading…" : data.canEdit ? undefined : "Flight surgeons are view-only. Crew members log their own entries."}
      message={
        state.ok ? (
          <p className="text-xs text-foreground" data-testid="gi-result" role="status">
            Saved: Bristol type {state.bristolType}.{state.photoLabel ? ` Photo stored · ${state.photoLabel}.` : ""}
          </p>
        ) : state.error ? (
          <p className="text-xs text-escalate-foreground" role="alert" data-testid="gi-error">
            {state.error}
          </p>
        ) : null
      }
    >
      <div key={state.savedAt ?? "draft"} className="flex flex-col gap-3">
        <BristolPicker defaultValue={v.bristolType} error={err.bristolType} />
        <EntryFieldGrid>
          <EntryField label="Day" name="day" type="date" required max={data?.today} defaultValue={v.day ?? data?.today} error={err.day} />
          <EntryField label="Fluids" name="hydrationLiters" unit="L" type="number" inputMode="decimal" step="0.1" min={0} max={10} hint="Fluid intake since your last entry" defaultValue={v.hydrationLiters} error={err.hydrationLiters} />
        </EntryFieldGrid>
        <EntryField label="Note (optional)" name="note" maxLength={200} placeholder="e.g. after a long EVA day" defaultValue={v.note} error={err.note} />
        <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="entry-photo" className="text-xs text-muted-foreground">
              Photo (optional)
            </Label>
            <Badge variant="outline" className="text-[10px]">
              Prototype
            </Badge>
          </div>
          <input
            id="entry-photo"
            name="photo"
            type="file"
            accept={PHOTO_ACCEPT}
            onChange={checkPhoto}
            aria-invalid={err.photo || photoError ? true : undefined}
            className="text-xs file:mr-3 file:rounded-md file:border file:border-input file:bg-input/30 file:px-2.5 file:py-1 file:text-xs file:text-foreground"
          />
          {err.photo || photoError ? (
            <p className="text-[11px] text-escalate-foreground" data-testid="entry-photo-error">
              {photoError ?? err.photo}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              JPEG, PNG or WebP, up to 5 MB. Location and camera data are removed. {PHOTO_NOT_ANALYSED_LABEL}: the type you choose is what gets logged. Visible only to you and the flight surgeon.
            </p>
          )}
        </div>
      </div>
    </EntryForm>
  );
}

/** The seven Bristol types as radio cards, each with its pictogram and standard description. */
function BristolPicker({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={error ? "entry-bristolType-error" : undefined}>
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Bristol type</legend>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {BRISTOL_TYPES.map((b) => (
          <label key={b.type} className="cursor-pointer">
            <input
              type="radio"
              name="bristolType"
              value={b.type}
              defaultChecked={String(b.type) === defaultValue}
              aria-label={`Bristol type: ${b.type}`}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex items-center gap-2.5 rounded-lg border border-input bg-input/30 px-2.5 py-1.5 text-muted-foreground transition-colors",
                "peer-checked:border-primary/60 peer-checked:bg-primary/15 peer-checked:text-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:text-foreground",
              )}
            >
              <span className="w-4 font-mono text-sm text-primary">{b.type}</span>
              <BristolPictogram type={b.type} className="h-5 w-12 shrink-0" />
              <span className="text-[11px] leading-snug">{b.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id="entry-bristolType-error" className="text-[11px] text-escalate-foreground" data-testid="entry-bristolType-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
