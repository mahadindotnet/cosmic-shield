import {
  Bone,
  Brain,
  Droplets,
  Eye,
  Gauge,
  HeartPulse,
  Moon,
  Radiation,
  Rocket,
  type LucideIcon,
} from "lucide-react";

export type SectionSlug =
  | "overview"
  | "vitals"
  | "sleep-stress"
  | "radiation"
  | "bone"
  | "eyes"
  | "gi"
  | "mind"
  | "mission";

export interface SectionDef {
  slug: SectionSlug;
  title: string;
  /** One-line purpose, shown under the page title. */
  description: string;
  icon: LucideIcon;
  href: string;
  group: "console" | "health" | "mission";
}

/** The 9 dashboard tabs, in sidebar order. */
export const SECTIONS: SectionDef[] = [
  { slug: "overview", title: "Health Dashboard", description: "Crew health at a glance across every module.", icon: Gauge, href: "/dashboard", group: "console" },
  { slug: "vitals", title: "Vitals", description: "Heart rate, blood pressure, oxygen saturation and glucose.", icon: HeartPulse, href: "/dashboard/vitals", group: "health" },
  { slug: "sleep-stress", title: "Sleep & Stress", description: "Sleep duration and quality, heart-rate variability and stress load.", icon: Moon, href: "/dashboard/sleep-stress", group: "health" },
  { slug: "radiation", title: "Radiation", description: "Dosimeter readings against the career limit, plus solar storm alerts.", icon: Radiation, href: "/dashboard/radiation", group: "health" },
  { slug: "bone", title: "Bone Protection", description: "Exercise minutes, resistance load, calcium and vitamin D.", icon: Bone, href: "/dashboard/bone", group: "health" },
  { slug: "eyes", title: "Eyes", description: "Fundoscope SANS screening and the Amsler grid self-test.", icon: Eye, href: "/dashboard/eyes", group: "health" },
  { slug: "gi", title: "GI", description: "Bristol stool classification, hydration and nutrition.", icon: Droplets, href: "/dashboard/gi", group: "health" },
  { slug: "mind", title: "Mind", description: "Mood check-ins and a supportive AI conversation.", icon: Brain, href: "/dashboard/mind", group: "health" },
  { slug: "mission", title: "Mission", description: "Mission environment: radiation, gravity and ground-comms delay.", icon: Rocket, href: "/dashboard/mission", group: "mission" },
];

export function getSection(slug: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}
