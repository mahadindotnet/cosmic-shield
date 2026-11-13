import { NextResponse } from "next/server";
import { withApiUser } from "@/lib/auth/api";
import { classifyBristolPhoto } from "@/lib/gi/classifier";

/**
 * Bristol photo classifier: prototype stub. It never analyses an image and
 * never suggests a type or a status; the crew member confirms the type.
 */
export async function POST() {
  return withApiUser(() => NextResponse.json(classifyBristolPhoto()));
}
