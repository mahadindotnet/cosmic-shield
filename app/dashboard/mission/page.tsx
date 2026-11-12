import type { Metadata } from "next";
import { MissionView } from "@/components/cosmic-shield/views/mission";

export const metadata: Metadata = { title: "Mission" };

export default function Page() {
  return <MissionView />;
}
