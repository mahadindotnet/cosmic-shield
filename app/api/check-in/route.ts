import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkIn } from "@/lib/db/schema";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    crewId?: string;
    affectScore?: number;
    note?: string;
  };

  const crewId = body.crewId ?? "reyes";
  const affectScore = body.affectScore ?? 3;
  const note = body.note?.trim() || "Structured behavioral check-in logged.";
  const recordedAt = `MET ${String(41).padStart(3, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;

  try {
    await db.insert(checkIn).values({ crewId, affectScore, note, recordedAt });
  } catch {
    // DB may be uninitialized in demo-only mode
  }

  return NextResponse.json({ ok: true, entry: { at: recordedAt, affectScore, note } });
}
