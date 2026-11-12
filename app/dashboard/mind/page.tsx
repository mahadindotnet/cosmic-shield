import type { Metadata } from "next";
import { MindView } from "@/components/cosmic-shield/views/mind";

export const metadata: Metadata = { title: "Mind" };

export default function Page() {
  return <MindView />;
}
