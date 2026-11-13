import "server-only";
import type { DonkiType, SpaceWeatherEvent } from "@/lib/nasa/donki";
import { getCachedSpaceWeather, getLiveSpaceWeather, type Loaded, type SpaceWeather } from "@/lib/nasa/loaders";

/** Solar activity for the Radiation page, with where it came from. */
export interface SpaceWeatherView {
  /** live: fetched from NASA DONKI just now; derived/fixture: the cached file from `npm run data:fetch`. */
  origin: "live" | "derived" | "fixture";
  /** When the data was fetched (ISO). */
  fetchedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  feeds: { type: DonkiType; ok: boolean; count: number | null }[];
  /** Newest first. */
  events: SpaceWeatherEvent[];
}

/** Live results are reused for this long across requests (one DONKI round trip, not one per page). */
const LIVE_TTL_MS = 15 * 60_000;
let memo: { at: number; loaded: Awaited<ReturnType<typeof getLiveSpaceWeather>> } | null = null;
let refreshing: Promise<unknown> | null = null;

/** Fetches DONKI (live when NASA_API_KEY is set, else the cached file) and remembers the result. */
async function fetchAndRemember() {
  const loaded = await getLiveSpaceWeather({ days: 30, limit: 30 });
  memo = { at: Date.now(), loaded };
  return loaded;
}

/** DONKI events (live when NASA_API_KEY is set and the API answers, otherwise cached). The key is never returned. */
export async function loadSpaceWeather(limit = 8): Promise<SpaceWeatherView> {
  const loaded = memo && Date.now() - memo.at < LIVE_TTL_MS ? memo.loaded : await fetchAndRemember();
  return toView(loaded, limit);
}

/**
 * For the notification bell, which renders on every page: never waits on
 * NASA. Uses the last live result while fresh; otherwise answers from the
 * cached file at once and refreshes the live data in the background.
 */
export function spaceWeatherNow(limit = 30): SpaceWeatherView {
  if (memo && Date.now() - memo.at < LIVE_TTL_MS) return toView(memo.loaded, limit);
  refreshing ??= fetchAndRemember()
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return toView(memo?.loaded ?? (getCachedSpaceWeather() as Loaded<SpaceWeather>), limit);
}

function toView(loaded: Awaited<ReturnType<typeof getLiveSpaceWeather>>, limit: number): SpaceWeatherView {
  const d = loaded.data;
  const events = d.events.slice(0, limit) as SpaceWeatherEvent[];
  if (loaded.origin === "live" && "start_date" in d) {
    return {
      origin: "live",
      fetchedAt: d.fetched_at,
      startDate: d.start_date,
      endDate: d.end_date,
      feeds: d.feeds.map((f) => ({
        type: f.type,
        ok: f.status === "ok",
        count: f.status === "ok" ? d.events.filter((e) => e.type === f.type).length : null,
      })),
      events,
    };
  }
  const feeds = (d.feeds as { type: DonkiType; status: string; event_count?: number; start_date?: string; end_date?: string }[]) ?? [];
  const ok = feeds.filter((f) => f.status === "ok");
  return {
    origin: loaded.origin === "live" ? "fixture" : loaded.origin,
    fetchedAt: d.fetched_at ?? null,
    startDate: ok[0]?.start_date ?? null,
    endDate: ok[0]?.end_date ?? null,
    feeds: feeds.map((f) => ({ type: f.type, ok: f.status === "ok", count: f.status === "ok" ? (f.event_count ?? null) : null })),
    events,
  };
}
