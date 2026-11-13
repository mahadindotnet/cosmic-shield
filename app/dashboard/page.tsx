import type { Metadata } from "next";
import { Suspense } from "react";
import { EarlyWarningSlot } from "@/components/alerts/early-warning-slot";
import { OverviewView } from "@/components/cosmic-shield/views/overview";

export const metadata: Metadata = { title: "Health Dashboard" };

export default function DashboardPage() {
  return (
    <OverviewView
      earlyWarning={
        <Suspense fallback={null}>
          <EarlyWarningSlot />
        </Suspense>
      }
    />
  );
}
