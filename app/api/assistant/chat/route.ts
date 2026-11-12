import { NextResponse } from "next/server";
import { activeProfileId, withApiUser } from "@/lib/auth/api";
import { runMissionCopilot } from "@/lib/ai/mission-copilot";

export async function POST(req: Request) {
  return withApiUser(async (current) => {
    const body = (await req.json()) as { message?: string };
    const message = body.message?.trim() ?? "";
    if (!message)
      return NextResponse.json({ error: "Message required" }, { status: 400 });

    // The crew member comes from the session, never from the request.
    const crewId = activeProfileId(current);
    if (!crewId)
      return NextResponse.json(
        { error: "Select a crew member first" },
        { status: 400 },
      );
    return NextResponse.json(await runMissionCopilot({ crewId, message }));
  });
}
