import type { Metadata } from "next";
import { EyesView } from "@/components/cosmic-shield/views/eyes";

export const metadata: Metadata = { title: "Eyes" };

export default function Page() {
  return <EyesView />;
}
