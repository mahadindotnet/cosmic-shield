import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkPhoto, detectImageType, MAX_PHOTO_BYTES, readStoredPhoto, resolveStored, savePhoto, stripPhoto } from "./photos";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "cs-uploads-"));
  process.env.UPLOADS_DIR = dir;
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.UPLOADS_DIR;
});

/** A small JPEG carrying EXIF (camera make and model, a location note) and orientation 6. */
async function jpegWithExif() {
  return sharp({ create: { width: 40, height: 20, channels: 3, background: "#8a6" } })
    .jpeg()
    .withExif({ IFD0: { Make: "TestCam", Model: "Secret-Model", Copyright: "GPS 51.5N 0.1W" } })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

const file = (bytes: Uint8Array, name = "x.jpg", type = "image/jpeg") => new File([new Uint8Array(bytes)], name, { type });

describe("detectImageType", () => {
  it("recognises JPEG, PNG and WebP by signature, nothing else", async () => {
    const base = sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } });
    expect(detectImageType(await base.clone().jpeg().toBuffer())).toBe("jpeg");
    expect(detectImageType(await base.clone().png().toBuffer())).toBe("png");
    expect(detectImageType(await base.clone().webp().toBuffer())).toBe("webp");
    expect(detectImageType(await base.clone().gif().toBuffer())).toBeNull();
    expect(detectImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(detectImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("checkPhoto", () => {
  it("rejects empty, over 5 MB and non-images (whatever the name or MIME type says)", async () => {
    expect(await checkPhoto(file(new Uint8Array()))).toEqual({ ok: false, error: "The photo is empty." });
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(await checkPhoto(file(big))).toEqual({ ok: false, error: "The photo must be 5 MB or smaller." });
    expect(await checkPhoto(file(new TextEncoder().encode("%PDF-1.7"), "a.jpg"))).toEqual({
      ok: false,
      error: "Only JPEG, PNG or WebP images can be uploaded.",
    });
  });
});

describe("stripPhoto / savePhoto", () => {
  it("removes EXIF and applies the orientation to the pixels", async () => {
    const input = await jpegWithExif();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await stripPhoto(input, "jpeg");
    const meta = await sharp(out).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect([meta.width, meta.height]).toEqual([20, 40]);
    expect(out.includes(Buffer.from("Secret-Model"))).toBe(false);
  });

  it("stores under <kind>/<userId>/ with a random name, and reads it back clean", async () => {
    const saved = await savePhoto("gi", 7, file(await jpegWithExif()));
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.relPath).toMatch(/^gi\/7\/[0-9a-f]{32}\.jpg$/);
    const back = await readStoredPhoto(saved.relPath);
    expect(back?.mime).toBe("image/jpeg");
    expect((await sharp(back!.bytes).metadata()).exif).toBeUndefined();
  });

  it("rejects an image that can't be decoded", async () => {
    const broken = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    expect(await savePhoto("gi", 7, file(broken))).toEqual({ ok: false, error: "That image couldn't be read. Try another JPEG, PNG or WebP photo." });
  });

  it("never resolves a path outside the uploads folder", () => {
    expect(resolveStored("../secret.txt")).toBeNull();
    expect(resolveStored("gi/../../x")).toBeNull();
    expect(resolveStored("gi/1/a.jpg")).toBe(path.join(dir, "gi", "1", "a.jpg"));
  });
});
