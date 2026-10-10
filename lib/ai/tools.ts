import { getCrewDashboardWithLogs } from "@/lib/services/crew-service";
import { getRadlabSample } from "@/lib/nasa/loaders";

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

export function getRadiationSummary() {
  const sample = getRadlabSample();
  const cumulative = sample.dailyDoseMsv.reduce((a, b) => a + b, 0);
  return {
    source: sample.source,
    cumulativeMsv: Math.round(cumulative * 1000) / 1000,
    dailyDoseMsv: sample.dailyDoseMsv,
    events: sample.events,
  };
}
