import { NextResponse } from "next/server";

export async function POST() {
  const confidence = Math.round((0.55 + Math.random() * 0.35) * 100) / 100;
  const status =
    confidence >= 0.88 ? "escalate" : confidence >= 0.72 ? "watch" : "nominal";

  return NextResponse.json({
    model: "sans-fundus-stub-v0",
    sansConfidence: confidence,
    status,
    finding: status === "nominal" ? "No SANS pattern above watch threshold" : "Repeat capture recommended",
    note: "Prototype SANS ocular screening — not iris biometrics. HRP SANS risk reference.",
  });
}
