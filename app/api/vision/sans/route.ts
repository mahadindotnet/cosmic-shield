import { NextResponse } from "next/server";
import { withApiUser } from "@/lib/auth/api";

/**
 * Fundus (SANS) screening: prototype placeholder. No model is connected, so
 * it never returns a health status or confidence; it says so plainly.
 */
export async function POST() {
  return withApiUser(async () =>
    NextResponse.json({
      model: "sans-fundus-prototype",
      status: "not_analysed",
      sansConfidence: null,
      finding: "Not analysed: prototype",
      note: "No screening model is connected yet. The image was not analysed and no health status was produced. HRP SANS risk reference.",
    }),
  );
}
