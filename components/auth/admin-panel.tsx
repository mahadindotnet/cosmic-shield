"use client";

import { useActionState, useState } from "react";
import { KeyRound, LockOpen, PenLine, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  changeCrewIdAction,
  resetPinAction,
  unlockAction,
  type AdminActionState,
} from "@/lib/auth/admin-actions";
import { cn } from "@/lib/utils";

/** What the admin page may show about an account (never the PIN hash). */
export interface AdminUserView {
  id: number;
  crewId: string;
  displayName: string;
  title: string;
  role: "crew" | "flight_surgeon";
  failedAttempts: number;
  lockedUntil: number | null;
  mustChangePin: boolean;
}

export interface AuditView {
  id: number;
  crewId: string;
  timestamp: number;
  success: boolean;
  reason: string;
}

const utc = (ms: number) => `${new Date(ms).toISOString().slice(0, 19).replace("T", " ")} UTC`;

export function AdminPanel({ users, audit, now }: { users: AdminUserView[]; audit: AuditView[]; now: number }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="crew-heading" className="glass-panel rounded-2xl p-5">
        <h2 id="crew-heading" className="mb-4 font-heading text-lg font-medium text-foreground">
          Crew accounts
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm" data-testid="admin-users">
            <thead>
              <tr className="border-b border-border text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="py-2 pr-3 font-medium">Crew ID</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} user={u} now={now} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="audit-heading" className="glass-panel rounded-2xl p-5">
        <h2 id="audit-heading" className="mb-1 font-heading text-lg font-medium text-foreground">
          Login audit
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">Latest {audit.length} events, newest first. PINs are never recorded.</p>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[560px] text-xs" data-testid="admin-audit">
            <thead className="sticky top-0 bg-popover">
              <tr className="border-b border-border text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="py-2 pr-3 font-medium">Time</th>
                <th className="py-2 pr-3 font-medium">Crew ID</th>
                <th className="py-2 pr-3 font-medium">Result</th>
                <th className="py-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 font-mono whitespace-nowrap text-muted-foreground">{utc(a.timestamp)}</td>
                  <td className="py-1.5 pr-3 font-mono text-foreground">{a.crewId}</td>
                  <td className="py-1.5 pr-3">
                    <span className={a.success ? "text-normal-foreground" : "text-escalate-foreground"}>
                      {a.success ? "✓ success" : "✗ failed"}
                    </span>
                  </td>
                  <td className="py-1.5 font-mono text-muted-foreground">{a.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function UserRow({ user, now }: { user: AdminUserView; now: number }) {
  const [reset, resetAction, resetting] = useActionState<AdminActionState, FormData>(resetPinAction, {});
  const [unlock, unlockFormAction, unlocking] = useActionState<AdminActionState, FormData>(unlockAction, {});
  const [rename, renameAction, renaming] = useActionState<AdminActionState, FormData>(changeCrewIdAction, {});
  const [editing, setEditing] = useState(false);

  const locked = user.lockedUntil !== null && user.lockedUntil > now;
  const message = reset.error ?? unlock.error ?? rename.error ?? rename.message ?? unlock.message;

  return (
    <tr className="border-b border-border/60 align-top" data-testid={`admin-row-${user.crewId}`}>
      <td className="py-3 pr-3 font-mono text-foreground">{user.crewId}</td>
      <td className="py-3 pr-3">
        <p className="text-foreground">{user.displayName}</p>
        <p className="text-xs text-muted-foreground">{user.title}</p>
      </td>
      <td className="py-3 pr-3 text-xs">
        <div className="flex flex-col gap-1">
          {locked ? (
            <span className="inline-flex items-center gap-1 text-escalate-foreground" data-testid="status-locked">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              Locked until {utc(user.lockedUntil!).slice(11)}
            </span>
          ) : (
            <span className="text-muted-foreground">Active</span>
          )}
          {user.failedAttempts > 0 && <span className="text-muted-foreground">{user.failedAttempts} failed attempt(s)</span>}
          {user.mustChangePin && <span className="text-watch-foreground">Must change PIN</span>}
        </div>
      </td>
      <td className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <form action={resetAction}>
            <input type="hidden" name="userId" value={user.id} />
            <Button type="submit" size="sm" variant="outline" disabled={resetting} data-testid={`reset-${user.crewId}`}>
              <KeyRound aria-hidden="true" />
              Reset PIN
            </Button>
          </form>
          <form action={unlockFormAction}>
            <input type="hidden" name="userId" value={user.id} />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={unlocking || (!locked && user.failedAttempts === 0)}
              data-testid={`unlock-${user.crewId}`}
            >
              <LockOpen aria-hidden="true" />
              Unlock
            </Button>
          </form>
          {editing ? (
            <form action={renameAction} className="flex items-center gap-1.5">
              <input type="hidden" name="userId" value={user.id} />
              <label className="sr-only" htmlFor={`new-id-${user.id}`}>
                New crew ID for {user.displayName}
              </label>
              <input
                id={`new-id-${user.id}`}
                name="newCrewId"
                defaultValue={user.crewId}
                className="h-8 w-24 rounded-lg border border-border bg-background/50 px-2 font-mono text-xs uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="sm" disabled={renaming}>
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <PenLine aria-hidden="true" />
              Change ID
            </Button>
          )}
        </div>

        {reset.tempPin && (
          <p
            className="mt-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-foreground"
            data-testid={`temp-pin-${user.crewId}`}
          >
            Temporary PIN for {reset.crewId}:{" "}
            <span className="font-mono text-sm tracking-[0.3em] text-primary">{reset.tempPin}</span>
            <span className="block text-muted-foreground">Shown once. Pass it on securely; they must choose a new PIN at sign-in.</span>
          </p>
        )}
        {message && (
          <p className={cn("mt-2 text-xs", reset.error || unlock.error || rename.error ? "text-destructive" : "text-muted-foreground")}>
            {message}
          </p>
        )}
      </td>
    </tr>
  );
}
