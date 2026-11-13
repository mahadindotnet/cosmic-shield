"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMissionStore } from "@/lib/store/mission-store";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/cosmic-shield/app-sidebar";
import { CopilotButton } from "@/components/cosmic-shield/copilot-button";
import { InstructionsButton } from "@/components/cosmic-shield/instructions-dialog";
import { MissionPicker } from "@/components/cosmic-shield/mission-picker";
import { SECTIONS } from "@/components/cosmic-shield/sections";
import { SpaceBackdrop } from "@/components/cosmic-shield/space-backdrop";
import { ShieldPlus } from "lucide-react";

const ADMIN_SECTION = { title: "Crew admin", icon: ShieldPlus };

export function DashboardFrame({ children, account }: { children: React.ReactNode; account?: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/dashboard/admin");
  const section = isAdmin ? ADMIN_SECTION : (SECTIONS.find((s) => s.href === pathname) ?? SECTIONS[0]);

  // Fast first paint from the local copy; the account value (EnvironmentHydrator) then wins.
  useEffect(() => {
    void useMissionStore.persist.rehydrate();
  }, []);

  return (
    <TooltipProvider>
      <SpaceBackdrop />
      <SidebarProvider className="relative z-[1]">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-(--glass-border) bg-(--glass) px-4 backdrop-blur-(--glass-blur)">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <section.icon className="size-4 text-primary" aria-hidden="true" />
            <span className="truncate font-heading text-sm font-medium">{section.title}</span>

            <div className="ml-auto flex items-center gap-2 md:gap-3">
              <MissionPicker variant="bar" />
              {!isAdmin && <InstructionsButton />}
              {account}
            </div>
          </header>
          <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-28 md:px-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
      <CopilotButton />
    </TooltipProvider>
  );
}
