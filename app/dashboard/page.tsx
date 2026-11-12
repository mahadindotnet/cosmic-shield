import type { Metadata } from "next";
import { OverviewView } from "@/components/cosmic-shield/views/overview";

export const metadata: Metadata = { title: "Health Dashboard" };

export default function DashboardPage() {
  return <OverviewView />;
}
