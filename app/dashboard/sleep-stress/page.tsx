import type { Metadata } from "next";
import { SleepStressView } from "@/components/cosmic-shield/views/sleep-stress";

export const metadata: Metadata = { title: "Sleep & Stress" };

export default function Page() {
  return <SleepStressView />;
}
