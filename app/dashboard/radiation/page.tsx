import type { Metadata } from "next";
import { RadiationView, type RadiationPageData } from "@/components/cosmic-shield/views/radiation";
import { activeCrew, getCurrentUser } from "@/lib/auth/dal";
import { radiationSummaryFor } from "@/lib/radiation/data";
import { loadSpaceWeather, type SpaceWeatherView } from "@/lib/radiation/space-weather";
import { utcToday } from "@/lib/vitals/data";

export const metadata: Metadata = { title: "Radiation" };

export default function Page() {
  // Two independent streams (not awaited): the crew member's doses, and DONKI,
  // which may wait on NASA's API without holding up the dose data.
  return <RadiationView data={loadRadiation()} spaceWeather={loadDonki()} />;
}

/** The signed-in crew member's own dose entries (rules run on read). Flight surgeons get none here. */
async function loadRadiation(): Promise<RadiationPageData> {
  const current = await getCurrentUser();
  const crew = current && !current.user.mustChangePin ? activeCrew(current) : null;
  return { summary: crew ? radiationSummaryFor(crew.id) : null, canEdit: crew !== null, today: utcToday() };
}

/** DONKI for signed-in users only (live with NASA_API_KEY, otherwise the cached file). */
async function loadDonki(): Promise<SpaceWeatherView> {
  const current = await getCurrentUser(); // also marks this render as per-request
  if (!current) return { origin: "fixture", fetchedAt: null, startDate: null, endDate: null, feeds: [], events: [] };
  return loadSpaceWeather();
}
