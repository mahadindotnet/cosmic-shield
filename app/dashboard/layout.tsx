import { Suspense } from "react";
import { AccountBar } from "@/components/auth/account-bar";
import { DashboardFrame } from "@/components/cosmic-shield/dashboard-frame";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <DashboardFrame
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
