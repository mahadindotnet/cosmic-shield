import { NextResponse } from "next/server";
import { withApiUser } from "@/lib/auth/api";
import { evaluateEscalation } from "@/lib/rules/engine";
import type {
  CrewVitalsSnapshot,
  ModuleState,
  VitalPoint,
} from "@/lib/rules/types";

export async function POST(req: Request) {
  return withApiUser(async () => {
    const body = (await req.json()) as {
      vitals: CrewVitalsSnapshot;
      hrTrend: VitalPoint[];
      moduleState: ModuleState;
    };

    const escalation = evaluateEscalation({
      vitals: body.vitals,
      hrTrend: body.hrTrend,
      moduleState: body.moduleState,
    });

    return NextResponse.json({ escalation });
  });
}
