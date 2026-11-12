/**
 * Server-side loaders for NASA reference data.
 *
 * Order of preference for each derived file:
 *   1. data/nasa/derived/<file>   (fresh output of `npm run data:build`)
 *   2. data/nasa/fixtures/<file>  (committed offline backup, always bundled)
 * Space weather can also be fetched live from DONKI (getLiveSpaceWeather),
 * falling back to the cached file when there is no key or the API fails.
 *
 * Uses node:fs, so import it from server code only. Client components should
 * use lib/nasa/radiation.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import baselinesFixture from "@/data/nasa/fixtures/baselines.json";
import radiationFixture from "@/data/nasa/fixtures/radiation-environments.json";
import spaceWeatherFixture from "@/data/nasa/fixtures/space-weather.json";
import hrpRisks from "@/data/nasa/hrp-risks.json";
import thresholds from "@/data/rules/thresholds.json";
import { latestEvents, simplifyDonkiEvent, type DonkiType, type SpaceWeatherEvent } from "@/lib/nasa/donki";

export type Baselines = typeof baselinesFixture;
export type RadiationEnvironments = typeof radiationFixture;
export type SpaceWeather = typeof spaceWeatherFixture;

export interface Loaded<T> {
  data: T;
  /** Where the data came from, so the UI can label it. */
  origin: "derived" | "fixture" | "live";
}

function loadDerived<T>(file: string, fixture: T): Loaded<T> {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "nasa", "derived", file), "utf8");
    return { data: JSON.parse(raw) as T, origin: "derived" };
  } catch {
    return { data: fixture, origin: "fixture" };
  }
}

/** Inspiration4 metabolic panel baselines (NASA OSDR OSD-575). */
export const getBaselines = () => loadDerived<Baselines>("baselines.json", baselinesFixture);

/** Daily dose per environment (NASA OSDR RadLab + published values). */
export const getRadiationEnvironments = () =>
  loadDerived<RadiationEnvironments>("radiation-environments.json", radiationFixture);

/** Latest DONKI events as cached by data:fetch / data:build. */
export const getCachedSpaceWeather = () => loadDerived<SpaceWeather>("space-weather.json", spaceWeatherFixture);

/* ------------------------------------------------------- live DONKI */

const DONKI_TYPES: DonkiType[] = ["FLR", "SEP", "CME", "GST"];
const DONKI_GATEWAY = "https://api.nasa.gov/DONKI";
const DONKI_ORIGIN = "https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get";

export interface LiveSpaceWeather {
  fetched_at: string;
  start_date: string;
  end_date: string;
  feeds: { type: DonkiType; status: "ok" | "unavailable"; source_url?: string }[];
  events: SpaceWeatherEvent[];
}

async function fetchDonkiFeed(type: DonkiType, range: string, apiKey: string) {
  const candidates = [
    { url: `${DONKI_GATEWAY}/${type}?${range}&api_key=${encodeURIComponent(apiKey)}`, shown: `${DONKI_GATEWAY}/${type}?${range}&api_key=***` },
    { url: `${DONKI_ORIGIN}/${type}?${range}`, shown: `${DONKI_ORIGIN}/${type}?${range}` },
  ];
  for (const c of candidates) {
    try {
      const res = await fetch(c.url, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const body = (await res.text()).trim();
      const raw = body ? (JSON.parse(body) as Record<string, unknown>[]) : [];
      if (!Array.isArray(raw)) continue;
      const events = raw.flatMap((r) => {
        try {
          return [simplifyDonkiEvent(type, r)];
        } catch {
          return [];
        }
      });
      return { source_url: c.shown, events };
    } catch {
      /* try the next server */
    }
  }
  return null;
}

/**
 * Live DONKI events for the last `days` days (newest first, at most `limit`).
 * Falls back to the cached file when NASA_API_KEY is missing or every feed
 * fails. The API key is never returned.
 */
export async function getLiveSpaceWeather({ days = 30, limit = 30 } = {}): Promise<
  Loaded<LiveSpaceWeather> | Loaded<SpaceWeather>
> {
  const apiKey = process.env.NASA_API_KEY?.trim();
  if (!apiKey) return getCachedSpaceWeather();

  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const [startDate, endDate] = [start, end].map((d) => d.toISOString().slice(0, 10));
  const range = `startDate=${startDate}&endDate=${endDate}`;

  const results = await Promise.all(DONKI_TYPES.map((t) => fetchDonkiFeed(t, range, apiKey)));
  if (results.every((r) => r === null)) return getCachedSpaceWeather();

  const live: LiveSpaceWeather = {
    fetched_at: end.toISOString(),
    start_date: startDate,
    end_date: endDate,
    feeds: DONKI_TYPES.map((type, i) => {
      const r = results[i];
      return r ? { type, status: "ok" as const, source_url: r.source_url } : { type, status: "unavailable" as const };
    }),
    events: latestEvents(
      results.flatMap((r) => r?.events ?? []),
      limit,
    ),
  };
  return { origin: "live", data: live };
}

/* ------------------------------------------------ rules and references */

export function getMissionConfig() {
  return {
    missionDay: thresholds.missionDay,
    commsDelayMinutes: thresholds.commsDelayMinutes,
    thresholds: thresholds.vitals,
    trendRules: thresholds.trends,
    moduleRules: thresholds.modules,
  };
}

export function getHrpRisks() {
  return hrpRisks;
}

export function getDefaultNasaSourceTags() {
  return [
    { module: "Metabolic baselines", source: "NASA OSDR OSD-575 (Inspiration4 metabolic panel)" },
    { module: "Radiation", source: "NASA OSDR RadLab, MSL-RAD and Chang'E-4 LND publications" },
    { module: "Space weather", source: "NASA DONKI" },
    { module: "Risk framework", source: "NASA HRP human system risks" },
  ];
}
