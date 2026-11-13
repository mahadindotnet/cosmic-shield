import { Suspense } from "react";
import { AccountBar } from "@/components/auth/account-bar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { DashboardFrame } from "@/components/cosmic-shield/dashboard-frame";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <DashboardFrame
      notifications={
        <Suspense fallback={<div className="size-8 animate-pulse rounded-full bg-muted/40" aria-hidden="true" />}>
          <NotificationBell />
        </Suspense>
      }
      account={
        <Suspense fallback={<div className="h-8 w-40 animate-pulse rounded-lg bg-muted/40" aria-hidden="true" />}>
          <AccountBar />
        </Suspense>
      }
    >
      {children}
    </DashboardFrame>
  );
}
