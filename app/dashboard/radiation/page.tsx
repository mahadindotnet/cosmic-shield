import type { Metadata } from "next";
import { RadiationView } from "@/components/cosmic-shield/views/radiation";

export const metadata: Metadata = { title: "Radiation" };

export default function Page() {
  return <RadiationView />;
}
