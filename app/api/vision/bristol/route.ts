import { NextResponse } from "next/server";
import { withApiUser } from "@/lib/auth/api";

export async function POST(req: Request) {
  return withApiUser(async () => {
    const body = (await req.json()) as { selectedType?: number };
    const selectedType = body.selectedType ?? 4;
    const escalateTypes = [6, 7];
    const status = escalateTypes.includes(selectedType) ? "watch" : "nominal";

    return NextResponse.json({
      model: "bristol-stool-stub-v0",
      bristolType: selectedType,
      status,
      confidence: 0.78,
      note: "Prototype classifier — replace with ONNX pipeline. OSD-630 stool reference for validity narrative.",
    });
  });
}
