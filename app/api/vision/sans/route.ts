import { NextResponse } from "next/server";
import { withApiUser } from "@/lib/auth/api";
import { classifyFundusPhoto } from "@/lib/eyes/classifier";

/**
 * Fundus (SANS) screening: prototype stub. No model is connected, so it never
 * returns a finding, a confidence or a health status; it says so plainly.
 */
export async function POST() {
  return withApiUser(() => NextResponse.json(classifyFundusPhoto()));
}
