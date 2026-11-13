"use client";

import Image from "next/image";
import { ArrowDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstructionsButton } from "@/components/cosmic-shield/instructions-dialog";
import { MissionPicker } from "@/components/cosmic-shield/mission-picker";
import { getSection, type SectionSlug } from "@/components/cosmic-shield/sections";
import type { ModuleSlug } from "@/lib/mission/environments";
import { useMissionEnvironment } from "@/lib/store/mission-store";
import { cn } from "@/lib/utils";

/**
 * Wrapper for every module page. Marks the page root so callouts and
 * "Show me" links only target this page (hidden routes stay mounted).
 */
export function ModulePage({ slug, children }: { slug: SectionSlug; children: React.ReactNode }) {
  return (
    <div data-module-page={slug} className="pb-16">
      {children}
    </div>
  );
}

/**
 * Page hero modelled on the reference shots: big light title and actions on
 * the left, a floating hologram in the centre, supporting cards on the right,
 * all inside one large frosted panel with plenty of space.
 */
export function ModuleHero({
  slug,
  title,
  stage,
  aside,
  primaryAction,
}: {
  slug: SectionSlug;
  title: React.ReactNode;
  stage: React.ReactNode;
  aside: React.ReactNode;
  primaryAction?: { label: string; anchor: string };
}) {
  const section = getSection(slug)!;
  const action = primaryAction ?? { label: "Log a reading", anchor: `${slug}-log` };

  return (
    <section
      id={`${slug}-hero`}
      data-testid="module-hero"
      className="glass-panel relative grid scroll-mt-20 items-center gap-10 overflow-visible rounded-[2rem] p-6 md:p-10 lg:grid-cols-[minmax(230px,0.85fr)_minmax(360px,1.6fr)_minmax(220px,0.8fr)] lg:gap-6 xl:gap-10"
    >
      <div className="flex flex-col gap-7">
        <div className="text-halo">
          <p data-testid="module-eyebrow" className="console-label flex items-center gap-2">
            <section.icon className="size-3.5 text-primary" aria-hidden="true" />
            Module · {section.title}
          </p>
          <h1 className="mt-4 font-heading text-4xl leading-[1.05] font-light tracking-tight text-foreground xl:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{section.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InstructionsButton slug={slug} variant="hero" />
          <Button
            variant="outline"
            size="lg"
            className="px-4"
            onClick={(e) => {
              const root = (e.currentTarget as HTMLElement).closest("[data-module-page]") ?? document;
              root.querySelector(`[id="${action.anchor}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {action.label}
            <ArrowDown aria-hidden="true" />
          </Button>
        </div>
        {slug !== "mission" && slug !== "overview" && <EnvNote slug={slug} />}
      </div>

      <div className="order-first lg:order-none">{stage}</div>

      <div className="flex flex-col gap-4">{aside}</div>
    </section>
  );
}

function EnvNote({ slug }: { slug: ModuleSlug }) {
  const env = useMissionEnvironment();
  if (!env) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/30 bg-background/40 p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          Tailor this module
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Choose where the crew is to get matching targets and guidance.</p>
        <MissionPicker className="mt-3" />
      </div>
    );
  }
  return (
    <div data-testid="mission-context" className="flex gap-3 rounded-2xl border border-border bg-background/45 p-3">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15">
        <Image src={env.backdrop.src} alt="" fill sizes="48px" className="object-cover" />
      </span>
      <div className="min-w-0">
        <p className="console-label !text-[10px]">On {env.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-foreground/85">{env.notes[slug]}</p>
      </div>
    </div>
  );
}

/** Spacious titled section below the hero. */
export function PageSection({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("mt-16 scroll-mt-20 md:mt-20", className)}>
      {/* Own glass backing: the header sits directly on the environment image. */}
      <div className="glass mb-6 w-fit max-w-full rounded-2xl px-5 py-4">
        <p className="console-label">{eyebrow}</p>
        <h2 className="mt-2 font-heading text-2xl font-light tracking-tight text-foreground md:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Small "what to do next" card for the hero aside. */
export function NextStepCard({
  title,
  body,
  className,
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-(--glass-border) bg-(--glass) p-4 backdrop-blur-(--glass-blur)", className)}>
      <p className="console-label !text-[10px]">Next step</p>
      <p className="mt-1.5 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
