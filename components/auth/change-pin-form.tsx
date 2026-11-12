"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changePinAction, type ChangePinState } from "@/lib/auth/actions";
import { PIN_LENGTH, PinDots, PinKeypad } from "./pin-entry";

type Field = "currentPin" | "newPin" | "confirmPin";

/**
 * Change PIN. `forced` after a flight-surgeon reset (no current PIN needed);
 * otherwise the current PIN is required. One keypad types into whichever
 * field is active.
 */
export function ChangePinForm({ forced }: { forced: boolean }) {
  const [state, formAction, pending] = useActionState<ChangePinState, FormData>(changePinAction, {});
  const fields: Field[] = forced ? ["newPin", "confirmPin"] : ["currentPin", "newPin", "confirmPin"];
  const [values, setValues] = useState<Record<Field, string>>({ currentPin: "", newPin: "", confirmPin: "" });
  const [active, setActive] = useState<Field>(fields[0]);
  const refs = {
    currentPin: useRef<HTMLInputElement>(null),
    newPin: useRef<HTMLInputElement>(null),
    confirmPin: useRef<HTMLInputElement>(null),
  };

  const labels: Record<Field, string> = {
    currentPin: "Current PIN",
    newPin: forced ? "Choose a new PIN" : "New PIN",
    confirmPin: "Confirm new PIN",
  };

  const set = (f: Field, v: string) => setValues((s) => ({ ...s, [f]: v }));

  function type(d: string) {
    const v = values[active];
    if (v.length >= PIN_LENGTH) return;
    const nextValue = v + d;
    set(active, nextValue);
    // Move on to the next field when this one is full.
    const i = fields.indexOf(active);
    if (nextValue.length === PIN_LENGTH && i < fields.length - 1) {
      setActive(fields[i + 1]);
      refs[fields[i + 1]].current?.focus();
    } else {
      refs[active].current?.focus();
    }
  }

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" data-testid="change-pin-done">
        <CheckCircle2 className="size-10 text-normal-foreground" aria-hidden="true" />
        <p className="text-sm text-foreground">Your PIN has been changed.</p>
        <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        setValues({ currentPin: "", newPin: "", confirmPin: "" });
        setActive(fields[0]);
        formAction(fd);
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      {fields.map((f) => (
        <PinDots
          key={f}
          name={f}
          label={labels[f]}
          value={values[f]}
          onChange={(v) => set(f, v)}
          onFocus={() => setActive(f)}
          inputRef={refs[f]}
          error={state.fieldErrors?.[f]}
          autoFocus={f === fields[0]}
          testId={`change-${f}`}
        />
      ))}

      <PinKeypad
        disabled={pending}
        onDigit={type}
        onBackspace={() => set(active, values[active].slice(0, -1))}
        onClear={() => set(active, "")}
      />

      <p className="text-[11px] text-muted-foreground">
        Avoid repeated digits (111111) and runs (123456, 654321).
      </p>

      <div className="flex gap-3">
        {!forced && (
          <Button variant="outline" size="lg" className="flex-1" render={<Link href="/dashboard" />}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={pending || fields.some((f) => values[f].length !== PIN_LENGTH)}
          data-testid="change-pin-submit"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save new PIN
        </Button>
      </div>
    </form>
  );
}
