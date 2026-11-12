/**
 * Shared NASA source definitions for scripts/fetch-nasa.ts and
 * scripts/build-baselines.ts (npm run data:build), so the URLs we download from and the URLs we
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

/** Environment keys used in data/nasa/derived/radiation-environments.json. */
export type RadiationEnvironmentId = "iss" | "lunar_orbit" | "lunar_surface" | "mars_transit" | "mars_surface";

export interface RadlabSource {
  id: string;
  /** Environment this instrument's data belongs to. */
  environmentId: RadiationEnvironmentId;
  /**
   * What the file is used for: the environment's absorbed dose (mGy/day), or
   * its measured dose equivalent (mSv/day) from dose_equivalent_rate.
   */
  role: "absorbed" | "dose_equivalent";
  spacecraft: string;
  instrument: string;
  /** 7-day window with continuous data (UTC). */
  start: string;
  end: string;
  out: string;
  note: string;
}

/*
 * Absorbed dose: one shared window (1-8 Apr 2022) for DosTel, CRaTER and
 * MSL-RAD so they sample the same solar conditions.
 *
 * Instrument names were found by querying the RadLab API (the GUI and docs
 * returned HTTP 500). Checked and not available in RadLab:
 * - MSL-RAD cruise data (Dec 2011 - Aug 2012): no Curiosity rows before landing.
 * - IV-TEPC (2014-09 to 2018-02) and TEPC (2014-09 to 2020-01): rows exist but
 *   dose_equivalent_rate is empty in every row.
 * ALTEA-Survey (Sep 2010 - Jun 2012) is the only ISS instrument in RadLab with
 * measured dose_equivalent_rate, so it supplies the ISS mSv/day.
 */
const WINDOW = { start: "2022-04-01T00:00", end: "2022-04-08T00:00" };

export const RADLAB_SOURCES: RadlabSource[] = [
  {
    id: "iss-dostel",
    environmentId: "iss",
    role: "absorbed",
    spacecraft: "ISS",
    instrument: "DosTel",
    ...WINDOW,
    out: `${NASA_DIR}/radlab/iss-dostel.csv`,
    note: "DOSIS 3D DosTel1 and DosTel2 detectors, averaged.",
  },
  {
    id: "iss-altea",
    environmentId: "iss",
    role: "dose_equivalent",
    spacecraft: "ISS",
    instrument: "ALTEA-Survey",
    start: "2011-06-01T00:00",
    end: "2011-06-08T00:00",
    out: `${NASA_DIR}/radlab/iss-altea.csv`,
    note: "ALTEA in survey mode (US Lab). A different instrument, location and year (2011) from the DosTel absorbed dose.",
  },
  {
    id: "lro-crater",
    environmentId: "lunar_orbit",
    role: "absorbed",
    spacecraft: "LRO",
    instrument: "CRaTER",
    ...WINDOW,
    out: `${NASA_DIR}/radlab/lro-crater.csv`,
    note: "Lunar orbit, not the lunar surface.",
  },
  {
    id: "msl-rad",
    environmentId: "mars_surface",
    role: "absorbed",
    spacecraft: "Curiosity",
    instrument: "MSL-RAD",
    ...WINDOW,
    out: `${NASA_DIR}/radlab/msl-rad.csv`,
    note: "Gale crater surface. RadLab has no MSL-RAD cruise data.",
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

/* --------------------------------------------- radiation environments */

export interface RadiationEnvironmentDef {
  id: RadiationEnvironmentId;
  /** Display label. */
  environment: string;
  location: string;
}

/** Order of entries in radiation-environments.json. */
export const RADIATION_ENVIRONMENTS: RadiationEnvironmentDef[] = [
  { id: "iss", environment: "ISS", location: "Low Earth orbit, ~400 km" },
  { id: "lunar_orbit", environment: "Lunar orbit (LRO CRaTER)", location: "Lunar orbit" },
  { id: "lunar_surface", environment: "Lunar surface", location: "Von Kármán crater, far side (Chang'E-4)" },
  { id: "mars_transit", environment: "Mars transit", location: "Inside the MSL spacecraft during cruise" },
  { id: "mars_surface", environment: "Mars surface", location: "Gale crater (Curiosity)" },
];

export interface PublishedDoseEquivalent {
  environmentId: RadiationEnvironmentId;
  mSv_per_day: number;
  /** ± as stated in the paper; null when the paper gives none for this value. */
  uncertainty_mSv_per_day: number | null;
  /** What the value covers, in the paper's terms. */
  scope: string;
  citation: {
    authors: string;
    year: number;
    title: string;
    journal: string;
    volume: string;
    issue: string;
    pages: string;
    doi: string;
    pmid: string;
    url: string;
  };
  /** Exact wording that states the value, and where it was read. */
  quote: string;
  verified_in: string;
}

/*
 * Values copied from the papers, never computed here (no quality factor is
 * applied by Cosmic Shield). None of the three values appears in its paper's
 * abstract; each was checked against the full text, as recorded in
 * `verified_in`.
 */
export const PUBLISHED_DOSE_EQUIVALENT: PublishedDoseEquivalent[] = [
  {
    environmentId: "mars_transit",
    mSv_per_day: 1.84,
    uncertainty_mSv_per_day: 0.3,
    scope: "GCR dose-equivalent rate inside the MSL spacecraft during the 2011-2012 cruise to Mars",
    citation: {
      authors: "Zeitlin C, Hassler DM, Cucinotta FA, Ehresmann B, Wimmer-Schweingruber RF, Brinza DE, et al.",
      year: 2013,
      title: "Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory",
      journal: "Science",
      volume: "340",
      issue: "6136",
      pages: "1080-1084",
      doi: "10.1126/science.1235989",
      pmid: "23723233",
      url: "https://doi.org/10.1126/science.1235989",
    },
    quote: 'Table 2, "MSL cruise (22)": GCR dose-equivalent rate 1.84 ± 0.30 mSv/day',
    verified_in:
      "Zeitlin 2013 is paywalled and its abstract gives only the round-trip total (0.66 ± 0.12 Sv). The daily value was read in Hassler et al., Science 2014, Table 2, which cites Zeitlin 2013 as reference 22 (open-access manuscript, https://dspace.library.uu.nl/handle/1874/309142).",
  },
  {
    environmentId: "mars_surface",
    mSv_per_day: 0.64,
    uncertainty_mSv_per_day: 0.12,
    scope: "GCR dose-equivalent rate at Gale crater, first ~300 sols (2012-2013, solar maximum)",
    citation: {
      authors: "Hassler DM, Zeitlin C, Wimmer-Schweingruber RF, Ehresmann B, Rafkin S, Eigenbrode JL, et al.",
      year: 2014,
      title: "Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover",
      journal: "Science",
      volume: "343",
      issue: "6169",
      pages: "1244797",
      doi: "10.1126/science.1244797",
      pmid: "24324275",
      url: "https://doi.org/10.1126/science.1244797",
    },
    quote:
      "Combining the tissue dose rate measurement with <Q> yields an average GCR dose-equivalent rate on the Mars surface of 0.64 ± 0.12 millisieverts (mSv)/day",
    verified_in:
      "Main text and Table 2 of the open-access manuscript (https://dspace.library.uu.nl/handle/1874/309142). The abstract gives no numbers.",
  },
  {
    environmentId: "lunar_surface",
    mSv_per_day: 1.369,
    uncertainty_mSv_per_day: null,
    scope: "Average dose equivalent on the lunar far side measured by Chang'E-4 LND (2019)",
    citation: {
      authors: "Zhang S, Wimmer-Schweingruber RF, Yu J, Wang C, Fu Q, Zou Y, et al.",
      year: 2020,
      title: "First measurements of the radiation dose on the lunar surface",
      journal: "Science Advances",
      volume: "6",
      issue: "39",
      pages: "eaaz1334",
      doi: "10.1126/sciadv.aaz1334",
      pmid: "32978156",
      url: "https://doi.org/10.1126/sciadv.aaz1334",
    },
    quote: "LND measured an average dose equivalent of 1369 μSv/day on the surface of the Moon.",
    verified_in:
      "Discussion section of the open-access full text (PMC7518862). The abstract gives absorbed dose rates only (13.2 ± 1 μGy/hour in silicon; neutral particles 3.1 ± 0.5 μGy/hour).",
  },
];

/* -------------------------------------------------------------- derived */

export const DERIVED_DIR = `${NASA_DIR}/derived`;
/** Committed offline copies of the derived files (data:build refreshes them). */
export const FIXTURES_DIR = `${NASA_DIR}/fixtures`;

export const DERIVED = {
  baselines: `${DERIVED_DIR}/baselines.json`,
  radiation: `${DERIVED_DIR}/radiation-environments.json`,
  spaceWeather: `${DERIVED_DIR}/space-weather.json`,
};

export const MANIFEST = `${NASA_DIR}/manifest.json`;
