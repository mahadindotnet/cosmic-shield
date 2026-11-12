"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, ShieldCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { CosmicShieldLogo, CosmicShieldMark } from "@/components/cosmic-shield/logo";
import { SECTIONS, type SectionDef } from "@/components/cosmic-shield/sections";
import { useMissionEnvironment } from "@/lib/store/mission-store";

const GROUPS: { id: SectionDef["group"]; label: string }[] = [
  { id: "console", label: "Console" },
  { id: "health", label: "Health modules" },
  { id: "mission", label: "Mission" },
];

const NAV_BUTTON =
  "text-sidebar-foreground/75 data-active:bg-primary/10 data-active:text-primary data-active:shadow-[inset_2px_0_0_var(--primary)] [&_svg]:text-current";

export function AppSidebar() {
  const pathname = usePathname();
  const mission = useMissionEnvironment();
  const { state, isMobile, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" className="backdrop-blur-xl">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3 group-data-[collapsible=icon]:px-2">
        <Link href="/dashboard" aria-label="Cosmic Shield home" className="flex items-center">
          <CosmicShieldLogo showTagline className="group-data-[collapsible=icon]:hidden" />
          <CosmicShieldMark className="hidden size-7 group-data-[collapsible=icon]:block" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.map((g) => (
          <SidebarGroup key={g.id}>
            <SidebarGroupLabel className="console-label !text-[10px]">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {SECTIONS.filter((s) => s.group === g.id).map((s) => {
                  const active = pathname === s.href;
                  return (
                    <SidebarMenuItem key={s.slug}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={s.title}
                        render={<Link href={s.href} aria-current={active ? "page" : undefined} />}
                        data-testid={`nav-${s.slug}`}
                        className={NAV_BUTTON}
                      >
                        <s.icon aria-hidden="true" />
                        <span>{s.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <Link
          href="/dashboard/mission"
          className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 transition-colors hover:border-primary/40 group-data-[collapsible=icon]:hidden"
        >
          <span className="relative size-9 shrink-0 overflow-hidden rounded-md ring-1 ring-white/15">
            {mission ? (
              <Image src={mission.backdrop.src} alt="" fill sizes="36px" className="object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center bg-muted text-[10px] text-muted-foreground">—</span>
            )}
          </span>
          <span className="min-w-0">
            <span className="console-label block !text-[9px]">Environment</span>
            <span className="block truncate text-sm font-medium text-foreground">
              {mission ? mission.name : "Not selected"}
            </span>
            <span className="block truncate font-mono text-[10px] text-muted-foreground">
              {mission ? `Ground ${mission.commsDelayLabel}` : "Choose in Mission"}
            </span>
          </span>
        </Link>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              data-testid="sidebar-collapse"
              className="text-muted-foreground"
            >
              {collapsed ? <ChevronsRight aria-hidden="true" /> : <ChevronsLeft aria-hidden="true" />}
              <span>Collapse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <p className="flex items-center gap-1.5 px-1 text-[10px] leading-tight text-muted-foreground group-data-[collapsible=icon]:hidden">
          <ShieldCheck className="size-3 shrink-0" aria-hidden="true" />
          Decision support, not diagnosis.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
