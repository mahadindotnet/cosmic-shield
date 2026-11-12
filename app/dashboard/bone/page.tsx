import type { Metadata } from "next";
import { BoneView } from "@/components/cosmic-shield/views/bone";

export const metadata: Metadata = { title: "Bone Protection" };

export default function Page() {
  return <BoneView />;
}
