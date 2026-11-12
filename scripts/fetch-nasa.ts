/**
 * Downloads and caches NASA reference data into data/nasa/.
 *
 *   npm run data:fetch                 # everything
 *   npm run data:fetch -- --only=donki # one source (osdr | donki | radlab)
 *
 * - OSDR OSD-575: only the Comprehensive Metabolic Panel TRANSFORMED CSV
 *   (looked up via the files API; the large ISA zips are never downloaded).
 * - DONKI: FLR, SEP, CME and GST for the last 60 days (needs NASA_API_KEY in
 *   .env; falls back to the CCMC origin if the api.nasa.gov gateway fails).
 * - RadLab: ~7 days each of ISS DosTel, LRO CRaTER and MSL-RAD, compacted to
 *   stay under 1 MB per file.
 *
 * Files are written atomically and only after a successful download, so a
 * failed run keeps the previously cached copy. Every file is recorded in
 * data/nasa/manifest.json with its source URL (API key redacted).
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  DONKI,
  MANIFEST,
  OSDR,
  RADLAB_MAX_BYTES,
  RADLAB_SOURCES,
  radlabUrl,
  type RadlabSource,
} from "./nasa-sources";

/* ------------------------------------------------------------- helpers */

try {
  process.loadEnvFile?.(".env");
} catch {
  /* no .env file: rely on the real environment */
}
const API_KEY = process.env.NASA_API_KEY?.trim() || "";

const redact = (url: string) => (API_KEY ? url.split(API_KEY).join("***") : url);

async function fetchWithRetry(url: string, { timeoutMs = 120_000, retries = 2 } = {}): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
      // Retry only server errors and rate limits; 4xx is a definitive answer.
      if (res.status >= 500 || res.status === 429) throw new HttpError(res.status, redact(url));
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastError;
}

class HttpError extends Error {
  constructor(
    public status: number,
    url: string,
  ) {
    super(`HTTP ${status} from ${url}`);
  }
}

async function getOk(url: string, opts?: { timeoutMs?: number }) {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new HttpError(res.status, redact(url));
  return res;
}

/** Write via a temp file + rename so a crash never leaves a half-written cache. */
async function writeAtomic(path: string, data: string) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, data, "utf8");
  await rename(tmp, path);
}

interface ManifestEntry {
  source: string;
  fetchedAt: string;
  bytes: number;
  note?: string;
}
type Manifest = Record<string, ManifestEntry>;

async function loadManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8")) as Manifest;
  } catch {
    return {};
  }
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

/* ---------------------------------------------------------------- OSDR */

interface OsdrFile {
  file_name: string;
  file_size: number;
  remote_url: string;
  restricted?: boolean;
}

async function fetchOsdr(manifest: Manifest) {
  const listing = (await (await getOk(OSDR.filesApi)).json()) as {
    studies?: Record<string, { study_files?: OsdrFile[] }>;
  };
  const files = listing.studies?.[OSDR.study]?.study_files ?? [];
  const file = files.find((f) => OSDR.match(f.file_name) && !f.restricted);
  if (!file) {
    throw new Error(
      `No CMP TRANSFORMED CSV in ${OSDR.study}. Files: ${files.map((f) => f.file_name).join(", ") || "none"}`,
    );
  }

  const url = new URL(file.remote_url, OSDR.host).toString();
  const csv = await (await getOk(url)).text();
  if (!csv.replace(/^﻿/, "").startsWith("Sample Name")) {
    throw new Error(`Unexpected content from ${url} (not the CMP CSV)`);
  }
  await writeAtomic(OSDR.out, csv);
  manifest[OSDR.out] = {
    source: url,
    fetchedAt: new Date().toISOString(),
    bytes: Buffer.byteLength(csv),
    note: `${OSDR.study} · ${file.file_name}`,
  };
  return `${OSDR.out} (${file.file_name}, ${kb(Buffer.byteLength(csv))})`;
}

/* --------------------------------------------------------------- DONKI */

async function fetchDonkiType(type: (typeof DONKI.types)[number], startDate: string, endDate: string) {
  const range = `startDate=${startDate}&endDate=${endDate}`;
  const candidates = [
    ...(API_KEY ? [`${DONKI.gateway}/${type}?${range}&api_key=${encodeURIComponent(API_KEY)}`] : []),
    `${DONKI.origin}/${type}?${range}`,
  ];
  const errors: string[] = [];
  for (const url of candidates) {
    try {
      const body = (await (await getOk(url, { timeoutMs: 60_000 })).text()).trim();
      // DONKI returns an empty body (not []) when there are no events.
      const events = body ? (JSON.parse(body) as unknown[]) : [];
      if (!Array.isArray(events)) throw new Error(`Expected an array from ${redact(url)}`);
      return { url: redact(url), events };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`${type}: ${errors.join(" | ")}`);
}

async function fetchDonki(manifest: Manifest) {
  if (!API_KEY) console.warn("  ! NASA_API_KEY not set; trying the CCMC origin only.");
  const end = new Date();
  const start = new Date(end.getTime() - DONKI.days * 86_400_000);
  const [startDate, endDate] = [isoDate(start), isoDate(end)];

  const done: string[] = [];
  const failed: string[] = [];
  for (const type of DONKI.types) {
    try {
      const { url, events } = await fetchDonkiType(type, startDate, endDate);
      const out = `${DONKI.outDir}/${type.toLowerCase()}.json`;
      const json = JSON.stringify(
        { type, startDate, endDate, source: url, fetchedAt: new Date().toISOString(), count: events.length, events },
        null,
        2,
      );
      await writeAtomic(out, json);
      manifest[out] = { source: url, fetchedAt: new Date().toISOString(), bytes: Buffer.byteLength(json) };
      done.push(`${type} ${events.length}`);
    } catch (err) {
      failed.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (failed.length) {
    throw new Error(
      `${done.length ? `saved ${done.join(", ")}; ` : ""}failed: ${failed.join(" ; ")} (previous cache kept)`,
    );
  }
  return `${DONKI.outDir}/ (${startDate} → ${endDate}: ${done.join(", ")})`;
}

/* -------------------------------------------------------------- RadLab */

/** Minimal CSV line parser: RadLab quotes strings and never embeds commas. */
const splitCsv = (line: string) => line.split(",").map((c) => c.replace(/^"|"$/g, ""));

const round = (v: string) => (v === "" ? "" : String(Number(Number(v).toPrecision(6))));

/**
 * Keeps timestamp, instrument_id and the two dose columns, drops the
 * per-row instrument/spacecraft labels and trims float noise, which takes
 * 7 days of ISS DosTel (two detectors, ~1.6 min cadence) under 1 MB.
 */
function compactRadlab(csv: string) {
  const lines = csv.trim().split(/\r?\n/);
  const header = splitCsv(lines[0]);
  const idx = (name: string) => header.indexOf(name);
  const [iT, iId, iAbs, iEq] = ["timestamp", "instrument_id", "absorbed_dose_rate", "dose_equivalent_rate"].map(idx);
  if (iT < 0 || iAbs < 0) throw new Error(`Unexpected RadLab header: ${lines[0]}`);

  const rows = lines.slice(1).map(splitCsv);
  const out = ["timestamp,instrument_id,absorbed_dose_rate_uGy_h,dose_equivalent_rate_uSv_h"];
  const days = new Set<string>();
  for (const r of rows) {
    out.push([r[iT], iId >= 0 ? r[iId] : "", round(r[iAbs] ?? ""), iEq >= 0 ? round(r[iEq] ?? "") : ""].join(","));
    days.add(r[iT].slice(0, 10));
  }
  return { csv: `${out.join("\n")}\n`, rows: rows.length, days: days.size };
}

async function fetchRadlabSource(s: RadlabSource, manifest: Manifest) {
  const url = radlabUrl(s);
  const raw = await (await getOk(url, { timeoutMs: 180_000 })).text();
  if (raw.startsWith("<")) throw new Error(`${s.id}: RadLab returned an error page`);
  const { csv, rows, days } = compactRadlab(raw);
  if (rows === 0) throw new Error(`${s.id}: no data between ${s.start} and ${s.end}`);
  const bytes = Buffer.byteLength(csv);
  if (bytes > RADLAB_MAX_BYTES) throw new Error(`${s.id}: ${kb(bytes)} exceeds the 1 MB limit; shorten the window`);

  await writeAtomic(s.out, csv);
  manifest[s.out] = {
    source: url,
    fetchedAt: new Date().toISOString(),
    bytes,
    note: `${s.spacecraft} ${s.instrument}, ${s.start} → ${s.end} UTC, ${rows} rows over ${days} days`,
  };
  return `${s.out} (${rows} rows, ${days} days, ${kb(bytes)})`;
}

async function fetchRadlab(manifest: Manifest) {
  const results = await Promise.allSettled(RADLAB_SOURCES.map((s) => fetchRadlabSource(s, manifest)));
  const ok = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const bad = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason?.message ?? r.reason)] : []));
  if (bad.length) throw new Error(`${ok.length ? `saved ${ok.join("; ")}; ` : ""}failed: ${bad.join(" ; ")}`);
  return ok.join("\n      ");
}

/* ---------------------------------------------------------------- main */

const SOURCES = { osdr: fetchOsdr, donki: fetchDonki, radlab: fetchRadlab } as const;
type SourceName = keyof typeof SOURCES;

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
  const selected = (onlyArg ? onlyArg.split(",") : Object.keys(SOURCES)) as SourceName[];
  const unknown = selected.filter((s) => !(s in SOURCES));
  if (unknown.length) throw new Error(`Unknown source(s): ${unknown.join(", ")}. Use osdr, donki, radlab.`);

  const manifest = await loadManifest();
  let failures = 0;
  for (const name of selected) {
    console.log(`→ ${name}`);
    try {
      console.log(`  ✓ ${await SOURCES[name](manifest)}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${redact(err instanceof Error ? err.message : String(err))}`);
    }
  }
  await writeAtomic(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  if (failures) {
    console.error(`\n${failures} source(s) failed. Cached files from earlier runs were left in place.`);
    process.exitCode = 1;
  } else {
    console.log("\nDone. Run `npm run data:build` to rebuild the derived files.");
  }
}

main().catch((err) => {
  console.error(redact(err instanceof Error ? (err.stack ?? err.message) : String(err)));
  process.exit(1);
});
