"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  ChevronDown,
  KeyRound,
  Lock,
  LogOut,
  ShieldPlus,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { lockAction, logoutAction } from "@/lib/auth/actions";
import { IDLE_TIMEOUT_MS } from "@/lib/auth/config";

export interface AccountView {
  crewId: string;
  displayName: string;
  title: string;
  role: "crew" | "flight_surgeon";
}

/**
 * Top-bar account controls: who is signed in, a menu (Change PIN, and Crew
 * admin for the flight surgeon) and Lock / Log out buttons. Also runs the
 * 15-minute idle lock.
 */
export function AccountMenu({ account }: { account: AccountView }) {
  const surgeon = account.role === "flight_surgeon";
  const iconButton =
    "flex size-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

  return (
    <div className="flex shrink-0 items-center gap-2" data-testid="account-bar">
      <IdleLock />

      <Menu.Root>
        <Menu.Trigger
          data-testid="account-menu"
          className="flex h-8 items-center gap-2 rounded-lg border border-border bg-background/50 px-2 text-left transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-5 items-center justify-center rounded-md bg-primary/15">
            {surgeon ? (
              <Stethoscope
                className="size-3.5 text-primary"
                aria-hidden="true"
              />
            ) : (
              <UserRound className="size-3.5 text-primary" aria-hidden="true" />
            )}
          </span>
          <span
            className="font-mono text-xs whitespace-nowrap text-foreground"
            data-testid="account-crew-id"
          >
            {account.crewId}
          </span>
          <span className="hidden max-w-36 truncate text-xs text-muted-foreground 2xl:inline">
            {account.displayName}
          </span>
          <ChevronDown
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end" className="z-50">
            <Menu.Popup className="min-w-56 rounded-xl border border-border bg-popover p-1 text-sm shadow-xl outline-none">
              <div className="px-3 py-2">
                <p className="font-medium text-foreground">
                  {account.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.crewId} · {account.title}
                </p>
              </div>
              <Menu.Separator className="my-1 h-px bg-border" />
              <MenuLink href="/change-pin" icon={KeyRound}>
                Change PIN
              </MenuLink>
              {surgeon && (
                <MenuLink
                  href="/dashboard/admin"
                  icon={ShieldPlus}
                  testId="menu-admin"
                >
                  Crew admin
                </MenuLink>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <form action={lockAction}>
        <button
          type="submit"
          className={iconButton}
          title="Lock (keeps your crew ID)"
          aria-label="Lock"
          data-testid="lock-button"
        >
          <Lock className="size-4" aria-hidden="true" />
        </button>
      </form>
      <form action={logoutAction}>
        <button
          type="submit"
          className={iconButton}
          title="Log out"
          aria-label="Log out"
          data-testid="logout-button"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  testId,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <Menu.Item
      render={<Link href={href} data-testid={testId} />}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-foreground outline-none data-highlighted:bg-primary/10 data-highlighted:text-primary"
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </Menu.Item>
  );
}

/**
 * Locks the session after 15 minutes without input, and sends an activity
 * heartbeat (at most once a minute) so the server-side idle timer matches.
 */
function IdleLock() {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    let lastPing = Date.now();
    let locking = false;

    const onActivity = () => {
      last = Date.now();
      if (last - lastPing > 60_000) {
        lastPing = last;
        void fetch("/api/session/ping", { method: "POST" }).then((r) => {
          if (r.status === 401) router.replace("/login?locked=1");
        });
      }
    };
    const events = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
      "mousemove",
    ] as const;
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );

    const timer = window.setInterval(() => {
      if (!locking && Date.now() - last >= IDLE_TIMEOUT_MS) {
        locking = true;
        void lockAction("idle");
      }
    }, 15_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(timer);
    };
  }, [router]);
  return null;
}
