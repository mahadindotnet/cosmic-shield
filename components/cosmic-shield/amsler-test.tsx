"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** 20 × 20 Amsler grid with a centre fixation dot. */
function AmslerGrid({ className, label }: { className?: string; label: string }) {
  const n = 20;
  const cell = 10;
  const size = n * cell;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={cn("aspect-square bg-white", className)} role="img" aria-label={label}>
      {Array.from({ length: n + 1 }, (_, i) => (
        <g key={i} stroke="#111" strokeWidth={0.6}>
          <line x1={i * cell} y1={0} x2={i * cell} y2={size} />
          <line x1={0} y1={i * cell} x2={size} y2={i * cell} />
        </g>
      ))}
      <circle cx={size / 2} cy={size / 2} r={2.4} fill="#111" />
    </svg>
  );
}

/**
 * Amsler grid card. Clicking the grid (or "Start test") opens it full screen on
 * a plain white field, the way the test is meant to be taken; Esc or "Done"
 * closes it. Uses the Fullscreen API where available, with a fixed overlay as
 * the fallback.
 */
export function AmslerTest() {
  const [open, setOpen] = useState(false);
  const [eye, setEye] = useState<"left" | "right">("left");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="size-4 text-primary" aria-hidden="true" />
          Amsler grid
        </CardTitle>
        <CardDescription className="text-xs">Click the grid to take the test full screen.</CardDescription>
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
        <Button onClick={() => setOpen(true)} className="w-full max-w-64">
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
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-white p-4 text-neutral-900 outline-none"
          >
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="font-medium">Testing:</span>
              {(["left", "right"] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEye(e)}
                  aria-pressed={eye === e}
                  className={cn(
                    "rounded-full border px-3 py-1 capitalize",
                    eye === e ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600",
                  )}
                >
                  {e} eye
                </button>
              ))}
            </div>
            <p className="max-w-xl text-center text-sm text-neutral-600">
              Hold the screen ~35 cm away and cover your <strong>{eye === "left" ? "right" : "left"}</strong> eye. Look only
              at the centre dot. Are any lines wavy, broken, blurred or missing?
            </p>
            <AmslerGrid
              className="h-[min(78svh,90vw)] w-auto border border-neutral-900"
              label={`Amsler grid, ${eye} eye test`}
            />
            <button
              type="button"
              onClick={close}
              className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              <X className="size-4" aria-hidden="true" />
              Done
            </button>
            <p className="text-xs text-neutral-500">Press Esc to exit, then record your result.</p>
          </div>,
          document.body,
        )}
    </Card>
  );
}
