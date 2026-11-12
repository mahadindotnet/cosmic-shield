import type { Metadata } from "next";
import { GiView } from "@/components/cosmic-shield/views/gi";

export const metadata: Metadata = { title: "GI" };

export default function Page() {
  return <GiView />;
}
