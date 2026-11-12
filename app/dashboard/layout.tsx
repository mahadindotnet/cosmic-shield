import { DashboardFrame } from "@/components/cosmic-shield/dashboard-frame";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <DashboardFrame>{children}</DashboardFrame>;
}
