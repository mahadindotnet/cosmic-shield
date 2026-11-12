/**
 * Shared NASA source definitions for scripts/fetch-nasa.ts and
 * scripts/build-baselines.ts, so the URLs we download from and the URLs we
 * cite in derived files can't drift apart.
 */

export const NASA_DIR = "data/nasa";

/* ----------------------------------------------------------------- OSDR */

export const OSDR = {
  study: "OSD-575",
  filesApi: "https://osdr.nasa.gov/osdr/data/osd/files/575",
  /** remote_url values in the files API are relative to this host. */
  host: "https://osdr.nasa.gov",
  /** Matches the CMP TRANSFORMED CSV and nothing else (never the ISA zips). */
  match: (name: string) =>
    /comprehensive_metabolic_panel/i.test(name) && /transformed/i.test(name) && /\.csv$/i.test(name),
  out: `${NASA_DIR}/osdr/osd-575-cmp.csv`,
};

/* ---------------------------------------------------------------- DONKI */

export const DONKI = {
  types: ["FLR", "SEP", "CME", "GST"] as const,
  days: 60,
  /** api.nasa.gov gateway (needs NASA_API_KEY). */
  gateway: "https://api.nasa.gov/DONKI",
  /** CCMC origin, used as a fallback when the gateway fails (no key needed). */
  origin: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get",
  outDir: `${NASA_DIR}/donki`,
};

/* --------------------------------------------------------------- RadLab */

export const RADLAB_API = "https://visualization.osdr.nasa.gov/radlab/api/";
export const RADLAB_DOCS = "https://visualization.osdr.nasa.gov/radlab/gui/data-api/";
export const RADLAB_MAX_BYTES = 1_000_000;

export interface RadlabSource {
  id: string;
  /** Human label for the radiation environment the instrument measures. */
  environment: string;
  /** Closest Cosmic Shield mission environment, and how it differs. */
  relatedAppEnvironment: "iss" | "lunar" | "mars-transit";
  relationNote: string;
  spacecraft: string;
  instrument: string;
  /** 7-day window chosen where the instrument has continuous data (UTC). */
  start: string;
  end: string;
  out: string;
}

/*
 * One shared window (1–8 Apr 2022) for all three instruments so they sample
 * the same solar conditions. Instrument names come from the RadLab API
 * (spacecraft=LRO → CRaTER, spacecraft=Curiosity → MSL-RAD); the RadLab GUI's
 * BLEO page was returning HTTP 500 when this was written. RadLab has no
 * MSL-RAD cruise data, so the Mars entry is the Gale crater surface.
 */
const WINDOW = { start: "2022-04-01T00:00", end: "2022-04-08T00:00" };

export const RADLAB_SOURCES: RadlabSource[] = [
  {
    id: "iss-dostel",
    environment: "ISS (low Earth orbit)",
    relatedAppEnvironment: "iss",
    relationNote: "Same environment. Mean of the DosTel1 and DosTel2 detectors.",
    spacecraft: "ISS",
    instrument: "DosTel",
    ...WINDOW,
    out: `${NASA_DIR}/radlab/iss-dostel.csv`,
  },
  {
    id: "lro-crater",
    environment: "Lunar orbit (LRO)",
    relatedAppEnvironment: "lunar",
    relationNote:
      "Lunar orbit, not the lunar surface. The surface sees roughly half the orbital GCR flux because the Moon blocks half the sky.",
    spacecraft: "LRO",
    instrument: "CRaTER",
    ...WINDOW,
    out: `${NASA_DIR}/radlab/lro-crater.csv`,
  },
  {
    id: "msl-rad",
    environment: "Mars surface (Gale crater)",
    relatedAppEnvironment: "mars-transit",
    relationNote:
      "Mars surface, not transit. The atmosphere and planet shield the surface, so cruise doses are higher; RadLab has no MSL-RAD cruise data.",
    spacecraft: "Curiosity",
    instrument: "MSL-RAD",
    ...WINDOW,
    out: `${NASA_DIR}/radlab/msl-rad.csv`,
  },
];

/** RadLab query URL. `<`, `>` and `:` are URL-encoded as the API docs ask. */
export function radlabUrl(s: RadlabSource) {
  const enc = (v: string) => encodeURIComponent(v);
  return (
    `${RADLAB_API}?spacecraft=${enc(s.spacecraft)}&instrument=${enc(s.instrument)}` +
    `&timestamp%3E=${enc(s.start)}&timestamp%3C${enc(s.end)}` +
    `&absorbed_dose_rate&dose_equivalent_rate&format=csv`
  );
}

/* -------------------------------------------------------------- derived */

export const DERIVED = {
  radiation: `${NASA_DIR}/derived/radiation-environments.json`,
};

export const MANIFEST = `${NASA_DIR}/manifest.json`;
