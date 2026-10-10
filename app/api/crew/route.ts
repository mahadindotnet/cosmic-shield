import { NextResponse } from "next/server";
import { getCrewList } from "@/lib/services/crew-service";

export async function GET() {
  return NextResponse.json({ crew: getCrewList() });
}
