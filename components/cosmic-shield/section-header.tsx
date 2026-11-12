import type { SectionDef } from "@/components/cosmic-shield/sections";

export function SectionHeader({
  section,
  actions,
}: {
  section: SectionDef;
  actions?: React.ReactNode;
}) {
  const Icon = section.icon;
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-[0_0_24px_-6px_oklch(0.82_0.12_210/50%)]">
          <Icon className="size-6 text-primary" aria-hidden="true" />
        </div>
        <div className="[text-shadow:0_1px_14px_oklch(0.12_0.03_262/95%),0_0_2px_oklch(0.12_0.03_262/80%)]">
          <p className="console-label">Module · {section.title}</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground md:text-3xl">{section.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{section.description}</p>
        </div>
      </div>
      {actions}
    </div>
  );
}
