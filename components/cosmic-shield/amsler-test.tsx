"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eye, Maximize2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveAmslerAction, type SaveAmslerState } from "@/lib/eyes/actions";
import { EYE_LIMITS, VISION_CHANGE_MESSAGE, type Cell, type EyeSide } from "@/lib/eyes/rules";
import { cn } from "@/lib/utils";

const N = EYE_LIMITS.gridSize;
const CELL = 10;
const SIZE = N * CELL;
const key = (r: number, c: number) => `${r}-${c}`;

/** 20 × 20 Amsler grid with a centre fixation dot (static). */
function AmslerGrid({ className, label }: { className?: string; label: string }) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={cn("aspect-square bg-white", className)} role="img" aria-label={label}>
      <GridLines />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={2.4} fill="#111" />
    </svg>
  );
}

function GridLines({ stroke = "#111", width = 0.6 }: { stroke?: string; width?: number }) {
  return (
    <>
      {Array.from({ length: N + 1 }, (_, i) => (
        <g key={i} stroke={stroke} strokeWidth={width}>
          <line x1={i * CELL} y1={0} x2={i * CELL} y2={SIZE} />
          <line x1={0} y1={i * CELL} x2={SIZE} y2={i * CELL} />
        </g>
      ))}
    </>
  );
}

/** Small preview of a saved test: the marked cells filled; a ring when the centre dot was not seen. */
export function AmslerMiniGrid({ marks, centreVisible, className }: { marks: readonly Cell[]; centreVisible: boolean; className?: string }) {
  const label = `${marks.length} ${marks.length === 1 ? "cell" : "cells"} marked${centreVisible ? "" : ", centre dot not seen"}`;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={cn("size-12 rounded-sm bg-white", className)} role="img" aria-label={label} data-testid="amsler-mini" data-marked={marks.length}>
      {marks.map(([r, c]) => (
        <rect key={key(r, c)} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill="#e11d48" />
      ))}
      <GridLines stroke="#9ca3af" width={0.8} />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={4} fill={centreVisible ? "#111" : "none"} stroke={centreVisible ? "none" : "#e11d48"} strokeWidth={2} />
    </svg>
  );
}

type PerEye<T> = Record<EyeSide, T>;

/**
 * Amsler grid card. "Start full-screen test" opens the grid full screen on a
 * plain white field. The crew member marks any square that looks wavy,
 * blurred or missing (click, or arrow keys + Space), says whether the centre
 * dot was visible, and saves one result per eye. Esc or "Done" closes it.
 * Uses the Fullscreen API where available, with a fixed overlay as fallback.
 * `canSave` is false for the flight surgeon (view-only): the test still opens.
 */
export function AmslerTest({ canSave = false }: { canSave?: boolean }) {
  const [open, setOpen] = useState(false);
  const [eye, setEye] = useState<EyeSide>("left");
  const [marks, setMarks] = useState<PerEye<Set<string>>>({ left: new Set(), right: new Set() });
  const [centreHidden, setCentreHidden] = useState<PerEye<boolean>>({ left: false, right: false });
  const [saved, setSaved] = useState<PerEye<SaveAmslerState | null>>({ left: null, right: null });
  const [cursor, setCursor] = useState<[number, number]>([N / 2, N / 2]);
  const [state, formAction, pending] = useActionState<SaveAmslerState, FormData>(saveAmslerAction, {});
  const overlayRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = overlayRef.current;
    el?.requestFullscreen?.().catch(() => {
      /* Fullscreen refused (e.g. iframe); the fixed overlay still covers the screen. */
    });
    el?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onFsChange = () => !document.fullscreenElement && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFsChange);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  // A saved result: remember it for that eye, clear its marks, move on to the other eye.
  useEffect(() => {
    if (!state.ok || !state.eye || !state.savedAt) return;
    const done = state.eye;
    const other: EyeSide = done === "left" ? "right" : "left";
    /* eslint-disable react-hooks/set-state-in-effect -- one update per completed save */
    setSaved((s) => ({ ...s, [done]: state }));
    setMarks((m) => ({ ...m, [done]: new Set() }));
    setCentreHidden((c) => ({ ...c, [done]: false }));
    setEye((cur) => (cur === done ? other : cur));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state]);

  const toggle = (r: number, c: number) =>
    setMarks((m) => {
      const next = new Set(m[eye]);
      const k = key(r, c);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return { ...m, [eye]: next };
    });

  function onGridKey(e: React.KeyboardEvent) {
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      setCursor(([r, c]) => [Math.min(N - 1, Math.max(0, r + dr)), Math.min(N - 1, Math.max(0, c + dc))]);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle(cursor[0], cursor[1]);
    }
  }

  const current = marks[eye];
  const cells = [...current].map((k) => k.split("-").map(Number) as [number, number]);
  const coveredEye = eye === "left" ? "right" : "left";
  const lastSaved = saved[eye];

  return (
    <Card data-testid="amsler-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="size-4 text-primary" aria-hidden="true" />
          Amsler grid
        </CardTitle>
        <CardDescription className="text-xs">
          {canSave ? "Take the test full screen, one eye at a time, and mark any square that looks wrong." : "Click the grid to take the test full screen."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <button
          type="button"
          data-testid="amsler-open"
          onClick={() => setOpen(true)}
          className="group relative w-full max-w-64 overflow-hidden rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label="Open the Amsler grid full screen"
        >
          <AmslerGrid className="w-full" label="Amsler grid preview" />
          <span className="absolute inset-0 flex items-center justify-center bg-background/0 transition-colors group-hover:bg-background/45">
            <span className="flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Maximize2 className="size-3.5" aria-hidden="true" />
              Full screen
            </span>
          </span>
        </button>
        <Button onClick={() => setOpen(true)} className="w-full max-w-64" data-testid="amsler-start">
          <Maximize2 aria-hidden="true" />
          Start full-screen test
        </Button>
      </CardContent>

      {open &&
        createPortal(
          <div
            ref={overlayRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Amsler grid test"
            data-testid="amsler-fullscreen"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 overflow-y-auto bg-white p-4 text-neutral-900 outline-none"
          >
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="font-medium">Testing:</span>
              {(["left", "right"] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEye(e)}
                  aria-pressed={eye === e}
                  data-testid={`amsler-eye-${e}`}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-3 py-1 capitalize",
                    eye === e ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600",
                  )}
                >
                  {saved[e] && <Check className="size-3.5" aria-label="saved" />}
                  {e} eye
                </button>
              ))}
            </div>
            <p className="max-w-xl text-center text-sm text-neutral-600">
              Hold the screen ~35 cm away and cover your <strong>{coveredEye}</strong> eye. Look only at the centre dot.
              {canSave ? " Tap any square where lines look wavy, broken, blurred or missing." : " Are any lines wavy, broken, blurred or missing?"}
            </p>

            {canSave ? (
              <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="h-[min(58svh,88vw)] w-auto cursor-crosshair border border-neutral-900 bg-white outline-none focus-visible:ring-4 focus-visible:ring-sky-400"
                role="application"
                tabIndex={0}
                aria-label={`Amsler grid, ${eye} eye. Arrow keys move, Space marks or unmarks a square. ${current.size} marked.`}
                data-testid="amsler-grid"
                onKeyDown={onGridKey}
              >
                {Array.from({ length: N * N }, (_, i) => {
                  const r = Math.floor(i / N);
                  const c = i % N;
                  const marked = current.has(key(r, c));
                  return (
                    <rect
                      key={i}
                      x={c * CELL}
                      y={r * CELL}
                      width={CELL}
                      height={CELL}
                      fill={marked ? "#e11d48" : "transparent"}
                      fillOpacity={marked ? 0.55 : 0}
                      data-testid="amsler-cell"
                      data-cell={key(r, c)}
                      data-marked={marked || undefined}
                      onClick={() => {
                        setCursor([r, c]);
                        toggle(r, c);
                      }}
                    />
                  );
                })}
                <g pointerEvents="none">
                  <GridLines />
                  <circle cx={SIZE / 2} cy={SIZE / 2} r={2.4} fill="#111" />
                  <rect x={cursor[1] * CELL} y={cursor[0] * CELL} width={CELL} height={CELL} fill="none" stroke="#0284c7" strokeWidth={1.2} className="hidden [svg:focus-visible_&]:block" />
                </g>
              </svg>
            ) : (
              <AmslerGrid className="h-[min(78svh,90vw)] w-auto border border-neutral-900" label={`Amsler grid, ${eye} eye test`} />
            )}

            {canSave && (
              <form action={formAction} className="flex w-full max-w-xl flex-col gap-2 text-sm" data-testid="amsler-form">
                <input type="hidden" name="eye" value={eye} />
                <input type="hidden" name="marks" value={JSON.stringify(cells)} />
                <input type="hidden" name="centreVisible" value={centreHidden[eye] ? "no" : "yes"} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-neutral-700" aria-live="polite" data-testid="amsler-count">
                    {current.size} {current.size === 1 ? "square" : "squares"} marked
                  </span>
                  <label className="flex items-center gap-2 text-neutral-800">
                    <input
                      type="checkbox"
                      checked={centreHidden[eye]}
                      onChange={(e) => setCentreHidden((c) => ({ ...c, [eye]: e.target.checked }))}
                      className="size-4 accent-neutral-900"
                    />
                    I couldn&apos;t see the centre dot
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs text-neutral-600">
                  Note (optional)
                  <input
                    key={`${eye}-${saved[eye]?.savedAt ?? "draft"}`}
                    name="note"
                    maxLength={200}
                    placeholder="e.g. lines bent just above the dot"
                    className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMarks((m) => ({ ...m, [eye]: new Set() }))}
                    className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-100"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Clear marks
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    data-testid="amsler-save"
                    className="flex-1 rounded-full bg-neutral-900 px-4 py-1.5 font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
                  >
                    {pending ? "Saving…" : `Save ${eye} eye result`}
                  </button>
                </div>
                {state.error && (
                  <p role="alert" className="text-xs text-rose-700" data-testid="amsler-error">
                    {state.error}
                  </p>
                )}
                {(state.ok ? state : lastSaved) && <SavedLine s={(state.ok ? state : lastSaved)!} />}
              </form>
            )}

            <button
              type="button"
              onClick={close}
              className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              <X className="size-4" aria-hidden="true" />
              Done
            </button>
            <p className="text-xs text-neutral-500">Press Esc to exit.{canSave ? " Not a diagnosis." : " Crew members save their own results."}</p>
          </div>,
          document.body,
        )}
    </Card>
  );
}

function SavedLine({ s }: { s: SaveAmslerState }) {
  return (
    <p role="status" className="text-xs text-neutral-800" data-testid="amsler-result" data-changed={s.changed ? "true" : "false"}>
      Saved {s.eye} eye: {s.changed ? `${VISION_CHANGE_MESSAGE}` : "no change noticed."}
      {s.surgeonTold ? " Changes on 2 tests in a row: the flight surgeon has been told." : ""}
    </p>
  );
}
