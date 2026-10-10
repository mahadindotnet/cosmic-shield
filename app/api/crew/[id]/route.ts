import { NextResponse } from "next/server";
import { getCrewDashboardWithLogs } from "@/lib/services/crew-service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const payload = await getCrewDashboardWithLogs(id);
  if (!payload) {
    return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}
