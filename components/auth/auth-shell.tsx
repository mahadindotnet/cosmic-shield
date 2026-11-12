import { ShieldCheck } from "lucide-react";
import { CosmicShieldLogo } from "@/components/cosmic-shield/logo";

/** Centered, brand-styled frame for /login and /change-pin. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_75%_10%,oklch(0.3_0.08_250/70%),transparent_65%),radial-gradient(60%_50%_at_10%_95%,oklch(0.28_0.09_295/55%),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,oklch(1_0_0/35%)_0.5px,transparent_1.5px),radial-gradient(circle_at_70%_60%,oklch(1_0_0/25%)_0.5px,transparent_1.5px)] bg-[length:140px_140px,90px_90px] opacity-40"
      />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <CosmicShieldLogo />
        </div>
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <h1 className="font-heading text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Decision support, not diagnosis. Sessions lock after 15 minutes idle.
        </p>
      </div>
    </main>
  );
}
