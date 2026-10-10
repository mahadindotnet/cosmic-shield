import { NextResponse } from "next/server";
import { runMissionCopilot } from "@/lib/ai/mission-copilot";

export async function POST(req: Request) {
  const body = (await req.json()) as { crewId?: string; message?: string };
  const crewId = body.crewId ?? "reyes";
  const message = body.message?.trim() ?? "";

  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const result = await runMissionCopilot({ crewId, message });
  return NextResponse.json(result);
}
