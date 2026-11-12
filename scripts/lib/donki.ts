/**
 * Turns raw DONKI events into one small shape for space-weather.json.
 * Pure functions, tested in scripts/lib/baseline-math.test.ts.
 */

export type DonkiType = "FLR" | "SEP" | "CME" | "GST";

export interface SpaceWeatherEvent {
  type: DonkiType;
  id: string;
  /** DONKI UTC time, e.g. "2026-09-13T01:24Z". */
  start_time: string;
  /** Flare class (FLR), CME speed type and speed (CME), max Kp (GST); null for SEP. */
  class_or_intensity: string | null;
  link: string | null;
}

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);

interface CmeAnalysis {
  isMostAccurate?: boolean;
  speed?: number | null;
  type?: string | null;
}

function cmeIntensity(raw: Raw) {
  const analyses = (Array.isArray(raw.cmeAnalyses) ? raw.cmeAnalyses : []) as CmeAnalysis[];
  const a = analyses.find((x) => x.isMostAccurate) ?? analyses[0];
  if (!a) return null;
  const parts = [a.type ? `${a.type}-type` : null, typeof a.speed === "number" ? `${a.speed} km/s` : null];
  return parts.filter(Boolean).join(", ") || null;
}

function maxKp(raw: Raw) {
  const kps = (Array.isArray(raw.allKpIndex) ? raw.allKpIndex : [])
    .map((k: { kpIndex?: unknown }) => k.kpIndex)
    .filter((k): k is number => typeof k === "number");
  return kps.length ? `Kp ${Math.max(...kps)}` : null;
}

export function simplifyDonkiEvent(type: DonkiType, raw: Raw): SpaceWeatherEvent {
  const fields = {
    FLR: { id: raw.flrID, start: raw.beginTime, intensity: str(raw.classType) },
    SEP: { id: raw.sepID, start: raw.eventTime, intensity: null },
    CME: { id: raw.activityID, start: raw.startTime, intensity: cmeIntensity(raw) },
    GST: { id: raw.gstID, start: raw.startTime, intensity: maxKp(raw) },
  }[type];
  const id = str(fields.id);
  const start = str(fields.start);
  if (!id || !start) throw new Error(`${type} event without an id or start time`);
  return { type, id, start_time: start, class_or_intensity: fields.intensity, link: str(raw.link) };
}

/** Newest first (ties broken by id for a stable order), capped at `limit`. */
export function latestEvents(events: readonly SpaceWeatherEvent[], limit: number) {
  return [...events]
    .sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** Which DONKI server a cached feed came from. */
export function donkiHost(url: string): "api.nasa.gov" | "kauai.ccmc.gsfc.nasa.gov" | "unknown" {
  try {
    const host = new URL(url).hostname;
    return host === "api.nasa.gov" || host === "kauai.ccmc.gsfc.nasa.gov" ? host : "unknown";
  } catch {
    return "unknown";
  }
}
