import { getCrewDashboardWithLogs } from "@/lib/services/crew-service";
import { getRadiationEnvironments } from "@/lib/nasa/loaders";

export async function getCrewVitals(crewId: string) {
  const dash = await getCrewDashboardWithLogs(crewId);
  if (!dash) return null;
  return {
    crew: dash.name,
    vitals: dash.vitals,
    escalation: dash.escalation.level,
  };
}

export async function getEscalation(crewId: string) {
  const dash = await getCrewDashboardWithLogs(crewId);
  if (!dash) return null;
  return dash.escalation;
}

/** Reference daily doses per environment from data/nasa (RadLab + published values). */
export function getRadiationSummary() {
  const { data } = getRadiationEnvironments();
  return {
    source: data.source,
    environments: data.environments.map((e) => ({
      environment: e.environment,
      mSvPerDay: e.mSv_per_day,
      basis: e.mSv_basis,
      typicalMGyPerDay: e.typical_mGy_per_day,
    })),
  };
}
