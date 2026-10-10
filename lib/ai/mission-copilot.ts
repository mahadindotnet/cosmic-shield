import { getCrewVitals, getEscalation, getRadiationSummary } from "@/lib/ai/tools";

export async function runMissionCopilot(input: {
  crewId: string;
  message: string;
}): Promise<{ reply: string; toolsUsed: string[] }> {
  const msg = input.message.toLowerCase();
  const toolsUsed: string[] = [];

  if (msg.includes("radiation") || msg.includes("dose")) {
    toolsUsed.push("getRadiationSummary");
    const rad = getRadiationSummary();
    return {
      toolsUsed,
      reply: `Radiation summary (${rad.source}): cumulative sample exposure ${rad.cumulativeMsv} mSv across the reference window. Today's onboard reading should be compared to mission cumulative limits and any SPE events in the log. This is decision support — confirm with flight surgeon protocols before changing operations.`,
    };
  }

  if (msg.includes("escalat") || msg.includes("watch") || msg.includes("status")) {
    toolsUsed.push("getEscalation");
    const esc = await getEscalation(input.crewId);
    if (!esc) {
      return { toolsUsed, reply: "Crew member not found in mission roster." };
    }
    return {
      toolsUsed,
      reply: `Current escalation: ${esc.level.toUpperCase()} — ${esc.headline}\n\nReasons:\n- ${esc.reasons.join("\n- ")}\n\nRecommended actions:\n- ${esc.recommendedActions.join("\n- ")}\n\nDisclaimer: decision support only, not a diagnosis.`,
    };
  }

  toolsUsed.push("getCrewVitals");
  const vitals = await getCrewVitals(input.crewId);
  if (!vitals) {
    return { toolsUsed, reply: "Crew member not found. Select a crew profile on the dashboard." };
  }

  const v = vitals.vitals;
  return {
    toolsUsed,
    reply: `Co-pilot readout for ${vitals.crew} (escalation: ${vitals.escalation}):\n- HR ${v.heartRateBpm} bpm, HRV ${v.hrvMs} ms\n- SpO₂ ${v.spo2Pct}%, BP ${v.systolicBp}/${v.diastolicBp}\n- Sleep ${v.sleepHours.toFixed(1)} h, stress index ${v.stressIndex}\n- Radiation ${v.radiationDoseMsvDay} mSv today (${v.radiationCumulativeMsv} mSv cumulative)\n\nAsk about "escalation status" or "radiation" for deeper context. All guidance is onboard decision support, not medical diagnosis.`,
  };
}
