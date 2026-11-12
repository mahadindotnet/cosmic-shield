"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Lock, LockKeyhole, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { PIN_LENGTH, PinDots, PinKeypad } from "./pin-entry";

export interface DemoAccountView {
  crewId: string;
  displayName: string;
  title: string;
  pin: string;
}

/**
 * Crew ID + 6-digit PIN sign-in. In "locked" mode (after Lock or the idle
 * timeout) the crew ID is pre-filled and only the PIN is asked for.
 */
export function LoginForm({
  prefillCrewId,
  locked,
  next,
  demoAccounts,
}: {
  prefillCrewId: string | null;
  locked: boolean;
  next: string | null;
  demoAccounts: DemoAccountView[] | null;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [crewId, setCrewId] = useState(prefillCrewId ?? "");
  const [pin, setPin] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);
  const pinOnly = locked && Boolean(prefillCrewId);

  const remaining = useCountdown(state.lockedUntil);
  const isLocked = remaining > 0;
  const error = isLocked ? null : state.error;

  function submit(formData: FormData) {
    setPin("");
    formAction(formData);
  }

  function fill(account: DemoAccountView) {
    setCrewId(account.crewId);
    setPin(account.pin);
    pinRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={submit} className="flex flex-col gap-5" noValidate>
        {next && <input type="hidden" name="next" value={next} />}

        {pinOnly ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
            <input type="hidden" name="crewId" value={crewId} />
            <div className="flex items-center gap-3">
              <LockKeyhole className="size-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-muted-foreground">Session locked</p>
                <p className="font-mono text-base font-medium text-foreground" data-testid="locked-crew-id">
                  {crewId}
                </p>
              </div>
            </div>
            <Link href="/login?switch=1" className="text-xs text-primary hover:underline">
              Not you?
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="crewId" className="text-xs font-medium text-muted-foreground">
              Crew ID
            </label>
            <input
              id="crewId"
              name="crewId"
              value={crewId}
              onChange={(e) => setCrewId(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="CS-001"
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus={!prefillCrewId}
              aria-invalid={state.fieldErrors?.crewId ? true : undefined}
              data-testid="login-crew-id"
              className={cn(
                "h-12 rounded-xl border bg-background/50 px-4 font-mono text-lg tracking-[0.2em] text-foreground uppercase outline-none placeholder:tracking-[0.2em] placeholder:text-muted-foreground/40 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40",
                state.fieldErrors?.crewId ? "border-destructive/70" : "border-border",
              )}
            />
            {state.fieldErrors?.crewId && (
              <p className="text-xs text-destructive" role="alert">
                {state.fieldErrors.crewId}
              </p>
            )}
          </div>
        )}

        <PinDots
          name="pin"
          label="6-digit PIN"
          value={pin}
          onChange={setPin}
          error={state.fieldErrors?.pin}
          autoFocus={Boolean(prefillCrewId)}
          disabled={isLocked}
          inputRef={pinRef}
          testId="login-pin"
        />

        <PinKeypad
          disabled={isLocked || pending}
          onDigit={(d) => {
            setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
            pinRef.current?.focus();
          }}
          onBackspace={() => setPin((p) => p.slice(0, -1))}
          onClear={() => setPin("")}
        />

        <div aria-live="polite" className="min-h-5">
          {isLocked ? (
            <p
              className="flex items-center gap-2 rounded-lg border border-escalate/40 bg-escalate/10 px-3 py-2 text-sm text-escalate-foreground"
              data-testid="login-locked"
            >
              <TimerReset className="size-4 shrink-0" aria-hidden="true" />
              Too many attempts. Try again in{" "}
              <span className="font-mono tabular-nums">{formatMs(remaining)}</span>
            </p>
          ) : error ? (
            <p
              className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
              data-testid="login-error"
            >
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending || isLocked || pin.length !== PIN_LENGTH || (!pinOnly && !crewId)}
          className="h-13 text-base shadow-[0_0_28px_-8px_oklch(0.82_0.12_210/80%)]"
          data-testid="login-submit"
        >
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Signing in…" : pinOnly ? "Unlock" : "Sign in"}
        </Button>
      </form>

      {demoAccounts && !pinOnly && (
        <section aria-labelledby="demo-heading" className="rounded-xl border border-dashed border-primary/30 bg-background/40 p-4" data-testid="demo-accounts">
          <h2 id="demo-heading" className="console-label mb-2">
            Demo accounts
          </h2>
          <p className="mb-3 text-[11px] text-muted-foreground">For judges. Tap a row to fill it in.</p>
          <ul className="flex flex-col gap-1">
            {demoAccounts.map((a) => (
              <li key={a.crewId}>
                <button
                  type="button"
                  onClick={() => fill(a)}
                  className="grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="font-mono text-foreground">{a.crewId}</span>
                  <span className="truncate text-muted-foreground">
                    {a.displayName} · {a.title}
                  </span>
                  <span className="font-mono tracking-widest text-primary">{a.pin}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function useCountdown(until: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0); // sync immediately when a new lock arrives
    const t = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [until]);
  return until ? Math.max(0, until - now) : 0;
}

function formatMs(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
