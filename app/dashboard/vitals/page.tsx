import type { Metadata } from "next";
import { VitalsView } from "@/components/cosmic-shield/views/vitals";

export const metadata: Metadata = { title: "Vitals" };

export default function Page() {
  return <VitalsView />;
}
