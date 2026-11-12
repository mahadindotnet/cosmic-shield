/**
 * Radiation reference values for the mission environments, read from the
 * committed fixture (data/nasa/fixtures/radiation-environments.json, written
 * by `npm run data:build`). Safe to import in client components: no fs and no
 * network. Server code that wants the freshest build should use
 * lib/nasa/loaders.ts instead.
 */
import radiation from "@/data/nasa/fixtures/radiation-environments.json";

export type RadiationEnvironmentId = "iss" | "lunar_orbit" | "lunar_surface" | "mars_transit" | "mars_surface";

export interface RadiationReference {
  id: RadiationEnvironmentId;
  environment: string;
  /** Dose equivalent, mSv/day (measured by RadLab or copied from a paper). */
  mSvPerDay: number;
  basis: "measured" | "published";
  /** Short human-readable source, e.g. "Zhang et al., Science Advances 2020". */
  sourceLabel: string;
  sourceUrl: string;
  /** Typical (median) absorbed dose from RadLab, mGy/day, if measured. */
  typicalMGyPerDay: number | null;
}

type Entry = (typeof radiation.environments)[number];

function toReference(e: Entry): RadiationReference | null {
  const de = e.dose_equivalent;
  if (e.mSv_per_day === null || !de) return null;
  if (de.basis === "measured" && de.api_url && de.date_range && de.instrument) {
    return {
      id: e.id as RadiationEnvironmentId,
      environment: e.environment,
      mSvPerDay: e.mSv_per_day,
      basis: "measured",
      sourceLabel: `${de.instrument} via NASA OSDR RadLab (${de.date_range.start.slice(0, 4)})`,
      sourceUrl: de.api_url,
      typicalMGyPerDay: e.typical_mGy_per_day,
    };
  }
  if (de.basis === "published" && de.citation) {
    const c = de.citation;
    return {
      id: e.id as RadiationEnvironmentId,
      environment: e.environment,
      mSvPerDay: e.mSv_per_day,
      basis: "published",
      sourceLabel: `${c.authors.split(",")[0]} et al., ${c.journal} ${c.year}`,
      sourceUrl: c.url,
      typicalMGyPerDay: e.typical_mGy_per_day,
    };
  }
  return null;
}

/** The dose-equivalent reference for an environment; throws if the fixture has none. */
export function radiationReference(id: RadiationEnvironmentId): RadiationReference {
  const entry = radiation.environments.find((e) => e.id === id);
  const ref = entry && toReference(entry);
  if (!ref) throw new Error(`No mSv/day reference for "${id}" in radiation-environments.json`);
  return ref;
}
