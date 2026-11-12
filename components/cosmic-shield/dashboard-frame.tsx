"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SatelliteDish } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/cosmic-shield/app-sidebar";
import { InstructionsButton } from "@/components/cosmic-shield/instructions-dialog";
import { SECTIONS } from "@/components/cosmic-shield/sections";
import { SpaceBackdrop } from "@/components/cosmic-shield/space-backdrop";
import { ESCALATION_TIERS, STATUS_META, StatusBadge } from "@/components/cosmic-shield/status";
import { useMissionEnvironment, useMissionStore } from "@/lib/store/mission-store";

export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = SECTIONS.find((s) => s.href === pathname) ?? SECTIONS[0];
  const mission = useMissionEnvironment();

  // Restore the saved mission environment after the first client render.
  useEffect(() => {
    void useMissionStore.persist.rehydrate();
  }, []);

  return (
    <TooltipProvider>
      <SpaceBackdrop />
      <SidebarProvider className="relative z-[1]">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/45 px-4 backdrop-blur-xl">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <section.icon className="size-4 text-primary" aria-hidden="true" />
            <span className="truncate font-heading text-sm font-medium">{section.title}</span>

            <div className="ml-auto flex items-center gap-3">
              <InstructionsButton />
              <div className="hidden items-center gap-1.5 lg:flex" aria-label="Status legend">
                {ESCALATION_TIERS.map((t) => (
                  <span key={t} title={STATUS_META[t].description}>
                    <StatusBadge status={t} />
                  </span>
                ))}
              </div>
              <span
                data-testid="header-mission"
                className="hidden h-7 items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 font-mono text-[11px] text-muted-foreground sm:flex"
              >
                <SatelliteDish className="size-3.5 text-primary" aria-hidden="true" />
                {mission ? `${mission.name} · ${mission.commsDelayLabel}` : "No mission set"}
              </span>
            </div>
          </header>
          <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
