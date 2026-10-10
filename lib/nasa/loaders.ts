import inspiration4 from "@/data/nasa/inspiration4-baselines.json";
import radlabSample from "@/data/nasa/radlab-sample.json";
import hrpRisks from "@/data/nasa/hrp-risks.json";
import thresholds from "@/data/rules/thresholds.json";

export function getMissionConfig() {
  return {
    missionDay: thresholds.missionDay,
    commsDelayMinutes: thresholds.commsDelayMinutes,
    thresholds: thresholds.vitals,
    trendRules: thresholds.trends,
    moduleRules: thresholds.modules,
  };
}

export function getInspiration4Baselines() {
  return inspiration4;
}

export function getRadlabSample() {
  return radlabSample;
}

export function getHrpRisks() {
  return hrpRisks;
}

export function getDefaultNasaSourceTags() {
  return [
    { module: "Vitals baselines", source: "OSDR / Inspiration4 clinical panels" },
    { module: "Radiation", source: "RadLab sample telemetry" },
    { module: "Risk framework", source: "NASA HRP human system risks" },
  ];
}
