"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Camera, ExternalLink, Grid3x3, ScanEye } from "lucide-react";
import { Await } from "@/components/cosmic-shield/await";
import { AmslerMiniGrid, AmslerTest } from "@/components/cosmic-shield/amsler-test";
import { EntryField, EntryForm, SegmentedField } from "@/components/cosmic-shield/entry-form";
import { HistoryTable } from "@/components/cosmic-shield/history-table";
import { ModuleHero, ModulePage, PageSection } from "@/components/cosmic-shield/module-hero";
import { OrganImage, OrganStage, onImage } from "@/components/cosmic-shield/organ-stage";
import { StatusBadge } from "@/components/cosmic-shield/status";
import { StatusCard } from "@/components/cosmic-shield/status-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { saveFundusAction, type SaveFundusState } from "@/lib/eyes/actions";
import { PHOTO_NOT_ANALYSED_LABEL } from "@/lib/eyes/classifier";
import { describeAmsler, EYE_LIMITS, SANS_RISK } from "@/lib/eyes/rules";
import type { EyeSummary } from "@/lib/eyes/summary";
import { useMissionEnvironment } from "@/lib/store/mission-store";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const EYE_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

export interface EyesPageData {
  /** The signed-in crew member's screenings; null for a flight surgeon. */
  summary: EyeSummary | null;
  canEdit: boolean;
}

const utcDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
const utcTime = (iso: string) => `${utcDay(iso)} ${iso.slice(11, 16)}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const RULE_REF = "Watch: any marked square, or the centre dot not seen · app default";

/**
 * Eye screening: the Amsler grid (marked squares per eye, centre dot, note)
 * and a fundus photo (prototype: stored privately, never analysed; can be
 * flagged for ground review). Watch-only rules; never a diagnosis. Why eyes
 * are screened in flight: NASA HRP SANS risk.
 */
export function EyesView({ data }: { data: Promise<EyesPageData> }) {
  const env = useMissionEnvironment();
  return (
    <ModulePage slug="eyes">
      <ModuleHero
        slug="eyes"
        title={
          <>
            Vision &amp;
            <br />
            SANS screening
          </>
        }
        primaryAction={{ label: "Start a test", anchor: "eyes-log" }}
        stage={
          <Await promise={data}>
            {(d) => {
              const a = d?.summary?.amsler.latest;
              return (
                <OrganStage
                  visual={<OrganImage src="/organs/eye.webp" alt="Eye" />}
                  hotspots={[
                    { id: "amsler-l", ...onImage(0.2, 0.36, 1), side: "left", label: "Amsler · L", icon: Grid3x3, unit: "marked", value: a?.left ? a.left.marks.length : null, anchor: "eyes-amsler" },
                    { id: "amsler-r", ...onImage(0.2, 0.64, 1), side: "left", label: "Amsler · R", icon: Grid3x3, unit: "marked", value: a?.right ? a.right.marks.length : null, anchor: "eyes-amsler" },
                    { id: "sans", ...onImage(0.5, 0.5, 1), side: "right", label: "Fundus photo", icon: ScanEye, field: "photo" },
                    { id: "capture", ...onImage(0.74, 0.22, 1), side: "right", label: "History", icon: Camera, anchor: "eyes-history" },
                  ]}
                />
              );
            }}
          </Await>
        }
        aside={
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                Screening schedule
              </CardTitle>
              <CardDescription className="text-xs">App default for your environment.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Await promise={data}>
                {(d) =>
                  [
                    { k: "Fundus photo", v: env ? env.sansCadence : "Choose a mission" },
                    { k: "Amsler grid", v: EYE_LIMITS.amslerCadence },
                    { k: "Last screened", v: d?.summary ? (d.summary.lastScreeningAt ? utcDay(d.summary.lastScreeningAt) : "Never") : "—" },
                  ].map((r) => (
                    <div key={r.k} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                      <span className="text-xs text-muted-foreground">{r.k}</span>
                      <span className="font-mono text-xs text-foreground">{r.v}</span>
                    </div>
                  ))
                }
              </Await>
            </CardContent>
          </Card>
        }
      />

      <PageSection
        id="eyes-status"
        eyebrow="Now"
        title="Latest screening"
        description="The rules are app defaults: Watch only, never a diagnosis. Changes on 2 Amsler tests in a row of the same eye are also sent to the flight surgeon."
      >
        <Await promise={data}>
          {(d) => {
            const s = d?.summary;
            const empty = !d ? "Loading…" : d.canEdit ? "No screening logged yet" : "Flight surgeons review crew in Crew admin";
            const a = s?.amsler;
            const f = s?.lastFundus;
            return (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="eyes-status-cards">
                <StatusCard
                  title="Last Amsler test"
                  icon={Grid3x3}
                  value={a && a.status !== "no-data" ? (a.status === "watch" ? "Watch" : "Normal") : null}
                  status={a && a.status !== "no-data" ? a.status : undefined}
                  caption={
                    a && a.status !== "no-data"
                      ? (["left", "right"] as const).map((e) => `${cap(e)}: ${a.latest[e] ? describeAmsler(a.latest[e]) : "not tested"}`).join(" · ")
                      : empty
                  }
                  reference={RULE_REF}
                >
                  {a?.reason && (
                    <p className="text-xs text-foreground" data-testid="eyes-amsler-reason">
                      {a.reason}
                    </p>
                  )}
                </StatusCard>
                <StatusCard
                  title="Last fundus photo"
                  icon={ScanEye}
                  value={f ? utcDay(f.recordedAt) : null}
                  neutral
                  caption={f ? `${cap(f.eye)} eye · ${f.result}` : s ? "No fundus photo yet" : empty}
                  reference={`${PHOTO_NOT_ANALYSED_LABEL} · visible only to you and the flight surgeon`}
                />
                <StatusCard
                  title="Screening cadence"
                  icon={CalendarClock}
                  value={env ? env.sansCadence : null}
                  neutral
                  caption={env ? `Fundus photo on ${env.name} · Amsler ${EYE_LIMITS.amslerCadence.toLowerCase()}` : "Choose your mission environment in the top bar"}
                  reference="App default for the environment"
                />
              </div>
            );
          }}
        </Await>
      </PageSection>

      <PageSection id="eyes-log" eyebrow="Step 1" title="Run a screening" description="Take the Amsler test for each eye. Add a fundus photo when one is due: it is stored privately but not analysed (prototype).">
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div id="eyes-amsler" className="scroll-mt-24">
            <Await promise={data}>{(d) => <AmslerTest canSave={Boolean(d?.canEdit)} />}</Await>
          </div>
          <Await promise={data}>{(d) => <FundusForm data={d} />}</Await>
          <Card className="gap-3" data-testid="eyes-why">
            <CardHeader>
              <CardTitle className="text-sm">Why eyes are screened in flight</CardTitle>
              <CardDescription className="text-xs">NASA Human Research Program</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-xs text-foreground/90">
              <p>
                NASA tracks the <strong>{SANS_RISK.title}</strong>: “{SANS_RISK.quote}”.
              </p>
              <p className="text-muted-foreground">These self-checks help you notice a change early and tell your CMO. They do not detect or rule out SANS.</p>
              <a href={SANS_RISK.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                NASA Human Research Roadmap
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        </div>
      </PageSection>

      <PageSection id="eyes-history" eyebrow="Step 2" title="History" description="Every Amsler test and fundus photo, newest first. Photos open only for you and the flight surgeon.">
        <Await promise={data}>
          {(d) => (
            <HistoryTable
              testId="eyes-history"
              rows={d?.summary?.history ?? []}
              getRowId={(r) => String(r.id)}
              rowProps={(r) => ({ "data-testid": "eyes-history-row", "data-kind": r.kind }) as React.ComponentProps<"tr">}
              emptyMessage={!d ? "Loading…" : d.canEdit ? undefined : "Flight surgeons review crew in Crew admin."}
              columns={[
                { key: "at", header: "Time (UTC)", cell: (r) => utcTime(r.recordedAt) },
                { key: "test", header: "Test", cell: (r) => (r.kind === "amsler" ? "Amsler" : "Fundus photo") },
                { key: "eye", header: "Eye", cell: (r) => cap(r.eye) },
                {
                  key: "res",
                  header: "Result",
                  cell: (r) =>
                    r.kind === "amsler" ? (
                      <span className="inline-flex items-center gap-2">
                        <AmslerMiniGrid marks={r.marks} centreVisible={r.centreVisible ?? true} className="size-10" />
                        <span className="text-xs">{r.result}</span>
                      </span>
                    ) : (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {r.hasPhoto && (
                          <a href={`/api/photos/eye/${r.id}`} target="_blank" rel="noopener" className="text-xs text-primary underline-offset-2 hover:underline" data-testid="eyes-photo-link">
                            View photo
                          </a>
                        )}
                        <Badge variant="outline" className="text-[10px]" data-testid="eyes-photo-label">
                          {PHOTO_NOT_ANALYSED_LABEL}
                        </Badge>
                        {r.groundReview && (
                          <Badge variant="outline" className="text-[10px]" data-testid="eyes-flagged">
                            Flagged for ground review
                          </Badge>
                        )}
                      </span>
                    ),
                },
                { key: "status", header: "Status", cell: (r) => (r.status ? <StatusBadge status={r.status} /> : <span className="text-xs text-muted-foreground">—</span>) },
                { key: "note", header: "Note", cell: (r) => <span className="text-xs">{r.note ?? "—"}</span> },
              ]}
            />
          )}
        </Await>
      </PageSection>
    </ModulePage>
  );
}

function FundusForm({ data }: { data: EyesPageData | null }) {
  const [state, formAction, pending] = useActionState<SaveFundusState, FormData>(saveFundusAction, {});
  const [photoError, setPhotoError] = useState<string | null>(null);
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (state.savedAt) toast.success("Fundus photo saved", { description: state.flagged ? "Flagged for ground review: the flight surgeon has been told." : PHOTO_NOT_ANALYSED_LABEL });
  }, [state.savedAt, state.flagged]);

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
      title="Fundus photo"
      description="Retina / optic-nerve photo from the onboard fundoscope."
      submitLabel="Save photo"
      footnote="Prototype: the photo is not analysed. Not a diagnosis."
      action={formAction}
      pending={pending}
      testId="fundus-form"
      disabledNote={!data ? "Loading…" : data.canEdit ? undefined : "Flight surgeons are view-only. Crew members log their own screenings."}
      message={
        state.ok ? (
          <p className="text-xs text-foreground" data-testid="fundus-result" role="status">
            Saved {state.eye} eye photo · {state.photoLabel}.{state.flagged ? " Flagged for ground review: the flight surgeon has been told." : ""}
          </p>
        ) : state.error ? (
          <p className="text-xs text-escalate-foreground" role="alert" data-testid="fundus-error">
            {state.error}
          </p>
        ) : null
      }
    >
      <div key={state.savedAt ?? "draft"} className="flex flex-col gap-3">
        <SegmentedField label="Eye" name="eye" options={EYE_OPTIONS} defaultValue={v.eye} error={err.eye} />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="entry-photo" className="text-xs text-muted-foreground">
              Photo
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
            <p className="text-[11px] text-muted-foreground">JPEG, PNG or WebP, up to 5 MB. Location and camera data are removed. Visible only to you and the flight surgeon.</p>
          )}
        </div>
        <label className="flex items-start gap-2 text-xs text-foreground">
          <input type="checkbox" name="groundReview" defaultChecked={v.groundReview === "on"} className="mt-0.5 size-4 accent-primary" />
          <span>
            Flag for ground review
            <span className="block text-[11px] text-muted-foreground">Sends a Watch-level record to the flight surgeon so a person looks at this photo.</span>
          </span>
        </label>
        <EntryField label="Note (optional)" name="note" maxLength={200} placeholder="e.g. headache this morning" defaultValue={v.note} error={err.note} />
      </div>
    </EntryForm>
  );
}
