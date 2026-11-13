"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Popover } from "@base-ui/react/popover";
import { Bell, CheckCheck, CircleCheck, ClipboardCheck, HeartPulse, ShieldAlert, Sun, TriangleAlert, type LucideIcon } from "lucide-react";
import { markNotificationsReadAction } from "@/lib/notifications/actions";
import type { NotificationView } from "@/lib/notifications/data";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationView["kind"], LucideIcon> = {
  task: ClipboardCheck,
  alert: TriangleAlert,
  space_weather: Sun,
  escalation: ShieldAlert,
};

/** Bell with an unread badge and the notification panel (in-app only, no browser push). */
export function NotificationMenu({ items, unread }: { items: NotificationView[]; unread: number }) {
  const [pending, startTransition] = useTransition();
  const mark = (keys: string[] | "all") => startTransition(() => void markNotificationsReadAction(keys));

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        data-testid="notification-bell"
        className="relative flex size-8 items-center justify-center rounded-full border border-border bg-background/50 text-foreground/85 transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-popup-open:border-primary/50 data-popup-open:text-primary"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unread > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold text-primary-foreground tabular-nums"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Popover.Popup
            data-testid="notification-panel"
            className="glass-strong w-[min(92vw,380px)] rounded-2xl border border-(--glass-border) bg-popover p-0 text-popover-foreground shadow-lg outline-none backdrop-blur-(--glass-blur) data-ending-style:opacity-0 data-starting-style:opacity-0"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
              <Popover.Title className="font-heading text-sm font-medium">Notifications</Popover.Title>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => mark("all")}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
                  data-testid="notification-mark-all"
                >
                  <CheckCheck className="size-3.5" aria-hidden="true" />
                  Mark all as read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-6 text-sm text-foreground/90" data-testid="notification-empty">
                <CircleCheck className="size-4 text-primary" aria-hidden="true" />
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto" aria-label="Notifications">
                {items.map((n) => {
                  const Icon = n.kind === "alert" && n.level === "escalate" ? HeartPulse : ICONS[n.kind];
                  return (
                    <li
                      key={n.key}
                      data-testid="notification-item"
                      data-key={n.key}
                      data-read={n.read || undefined}
                      className={cn("flex gap-3 px-4 py-3", n.read && "opacity-60")}
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          n.level === "escalate" ? "text-escalate-foreground" : n.level === "watch" ? "text-watch-foreground" : "text-primary",
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={n.href}
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                          onClick={() => !n.read && mark([n.key])}
                        >
                          {n.title}
                        </Link>
                        {n.detail && <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>}
                        {n.read && <p className="sr-only">Read</p>}
                      </div>
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => mark([n.key])}
                          disabled={pending}
                          aria-label={`Mark "${n.title}" as read`}
                          className="h-fit shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                          data-testid="notification-mark-read"
                        >
                          Mark as read
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
