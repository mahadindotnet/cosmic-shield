import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Private health photos (GI stool photos; later fundus photos).
 *
 * - Images only: JPEG, PNG or WebP, recognised by their first bytes (the
 *   browser's file name and MIME type are not trusted). Max 5 MB.
 * - Every photo is decoded and re-encoded with sharp: orientation is applied
 *   to the pixels (.rotate()) and all metadata (EXIF incl. GPS and device,
 *   XMP, ICC, IPTC) is dropped, since sharp writes none unless asked.
 * - Stored under UPLOADS_DIR (default ./uploads, gitignored) as
 *   <kind>/<userId>/<random>.<ext>. Never served by path: only through a route
 *   that checks the owner or the flight surgeon (app/api/photos/...).
 */

export const PHOTO_TYPES = {
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
} as const;
export type PhotoType = keyof typeof PHOTO_TYPES;
export type PhotoKind = "gi" | "eye";

/** 5 MB. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Longest side after re-encoding (keeps stored files small). */
const MAX_SIDE = 2048;

/** Runtime folder, not part of the build: kept out of output file tracing. */
export const uploadsRoot = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads"));

/** JPEG, PNG or WebP from the file's signature; null for anything else. */
export function detectImageType(bytes: Uint8Array): PhotoType | null {
  const at = (i: number, ...b: number[]) => b.every((v, k) => bytes[i + k] === v);
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  return null;
}

export type PhotoCheck = { ok: true; type: PhotoType; bytes: Buffer } | { ok: false; error: string };

/** Size and type checks for an uploaded file (no decoding yet). */
export async function checkPhoto(file: File): Promise<PhotoCheck> {
  if (file.size === 0) return { ok: false, error: "The photo is empty." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "The photo must be 5 MB or smaller." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return { ok: false, error: "Only JPEG, PNG or WebP images can be uploaded." };
  return { ok: true, type, bytes };
}

/** Decodes and re-encodes without any metadata. Throws if the image can't be decoded. */
export async function stripPhoto(bytes: Buffer, type: PhotoType): Promise<Buffer> {
  const img = sharp(bytes, { failOn: "error", limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
  if (type === "jpeg") return img.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  if (type === "png") return img.png().toBuffer();
  return img.webp({ quality: 85 }).toBuffer();
}

/** Checks, strips and stores a photo. Returns the stored path (relative to the uploads folder). */
export async function savePhoto(kind: PhotoKind, userId: number, file: File): Promise<{ ok: true; relPath: string } | { ok: false; error: string }> {
  const checked = await checkPhoto(file);
  if (!checked.ok) return checked;
  let clean: Buffer;
  try {
    clean = await stripPhoto(checked.bytes, checked.type);
  } catch {
    return { ok: false, error: "That image couldn't be read. Try another JPEG, PNG or WebP photo." };
  }
  const relPath = `${kind}/${userId}/${randomBytes(16).toString("hex")}.${PHOTO_TYPES[checked.type].ext}`;
  const abs = resolveStored(relPath);
  if (!abs) return { ok: false, error: "The photo couldn't be saved." };
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, clean, { flag: "wx" });
  return { ok: true, relPath };
}

/** Absolute path of a stored photo, or null if `relPath` would leave the uploads folder. */
export function resolveStored(relPath: string): string | null {
  const root = uploadsRoot();
  const abs = path.resolve(/*turbopackIgnore: true*/ root, relPath);
  return abs.startsWith(root + path.sep) ? abs : null;
}

export async function readStoredPhoto(relPath: string): Promise<{ bytes: Buffer; mime: string } | null> {
  const abs = resolveStored(relPath);
  if (!abs) return null;
  try {
    const bytes = await readFile(abs);
    const type = detectImageType(bytes);
    return type ? { bytes, mime: PHOTO_TYPES[type].mime } : null;
  } catch {
    return null;
  }
}

export async function removeStoredPhoto(relPath: string) {
  const abs = resolveStored(relPath);
  if (abs) await rm(abs, { force: true });
}
