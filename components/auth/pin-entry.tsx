"use client";

import { useId, useRef } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

export const PIN_LENGTH = 6;

/**
 * Six masked PIN dots over a real (visually hidden) numeric input, so typing,
 * pasting, password managers and screen readers all work. The on-screen
 * keypad (<PinKeypad>) writes into the same value.
 */
export function PinDots({
  name,
  label,
  value,
  onChange,
  error,
  autoFocus,
  disabled,
  inputRef,
  onFocus,
  testId,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onFocus?: () => void;
  testId?: string;
}) {
  const id = useId();
  const local = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? local;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="group relative">
        <input
          ref={ref}
          id={id}
          name={name}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{6}"
          maxLength={PIN_LENGTH}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          onFocus={onFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          data-testid={testId}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
          className="peer absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div
          aria-hidden="true"
          className={cn(
            "flex justify-between gap-2 rounded-xl border bg-background/50 px-4 py-3.5 transition-colors peer-focus-visible:border-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40",
            error ? "border-destructive/70" : "border-border",
          )}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => {
            const filled = i < value.length;
            const current = i === value.length;
            return (
              <span key={i} className="flex size-6 items-center justify-center">
                <span
                  className={cn(
                    "rounded-full transition-all duration-150",
                    filled
                      ? "size-3.5 bg-primary shadow-[0_0_10px_oklch(0.82_0.12_210/70%)]"
                      : "size-3 border border-muted-foreground/50",
                    current && !disabled && "border-primary/80",
                  )}
                />
              </span>
            );
          })}
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** 3×4 on-screen numeric keypad: digits, clear and backspace. */
export function PinKeypad({
  onDigit,
  onBackspace,
  onClear,
  disabled,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const key =
    "flex h-12 items-center justify-center rounded-xl border border-border bg-background/40 font-mono text-lg text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 active:scale-[0.97] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="PIN keypad">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button key={d} type="button" className={key} disabled={disabled} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button type="button" className={cn(key, "text-xs font-sans text-muted-foreground")} disabled={disabled} onClick={onClear}>
        Clear
      </button>
      <button type="button" className={key} disabled={disabled} onClick={() => onDigit("0")}>
        0
      </button>
      <button type="button" className={key} disabled={disabled} onClick={onBackspace} aria-label="Delete last digit">
        <Delete className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
