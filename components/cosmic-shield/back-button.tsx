"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * In-app history for this tab: the pages visited with client-side navigation.
 * It resets on a full page load, so a page opened from a link or a fresh tab
 * has no in-app history and "Back" falls back to the Health Dashboard instead
 * of leaving the app.
 */
const visited: string[] = [];
let goingBack = false;

/** Mounted once in the dashboard frame: records every client-side page change. */
export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (goingBack) {
      goingBack = false;
      return;
    }
    if (visited.at(-1) !== pathname) visited.push(pathname);
  }, [pathname]);
  return null;
}

export const DASHBOARD_HOME = "/dashboard";

/** "← Back" at the top left of the content area (not on the Health Dashboard home). */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Go back"
      data-testid="back-button"
      onClick={() => {
        if (visited.length > 1) {
          visited.pop();
          goingBack = true;
          router.back();
        } else {
          visited.length = 0;
          router.push(DASHBOARD_HOME);
        }
      }}
      className={cn(
        "glass inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Back
    </button>
  );
}
