import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertAuthEnv, MissingSecretError } from "./config";
import { generateTemporaryPin, hashPin, isWeakPin, verifyPin } from "./pin";

const PEPPER = "test-pepper-0123456789-abcdefghijklmnopqrstuvwxyz";
const SECRET = "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";

describe("PIN hashing (HMAC pepper + bcrypt)", () => {
  beforeEach(() => vi.stubEnv("PIN_PEPPER", PEPPER));
  afterEach(() => vi.unstubAllEnvs());

  it("verifies the right PIN and rejects a wrong one", async () => {
    const hash = await hashPin("472915", 4);
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(hash).not.toContain("472915");
    expect(await verifyPin("472915", hash)).toBe(true);
    expect(await verifyPin("472916", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    const [a, b] = await Promise.all([hashPin("538204", 4), hashPin("538204", 4)]);
    expect(a).not.toBe(b);
    expect(await verifyPin("538204", a)).toBe(true);
    expect(await verifyPin("538204", b)).toBe(true);
  });

  it("depends on the pepper: a different pepper cannot verify", async () => {
    const hash = await hashPin("619473", 4);
    vi.stubEnv("PIN_PEPPER", `${PEPPER}-rotated`);
    expect(await verifyPin("619473", hash)).toBe(false);
  });

  it("fails clearly, without echoing values, when secrets are missing or short", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.stubEnv("PIN_PEPPER", "");
    expect(() => assertAuthEnv()).toThrow(MissingSecretError);
    expect(() => assertAuthEnv()).toThrow(/PIN_PEPPER is not set/);
    vi.stubEnv("PIN_PEPPER", "short");
    expect(() => assertAuthEnv()).toThrow(/at least 32 characters/);
    try {
      assertAuthEnv();
    } catch (e) {
      expect(String(e)).not.toContain("short");
    }
    vi.stubEnv("PIN_PEPPER", PEPPER);
    expect(() => assertAuthEnv()).not.toThrow();
  });
});

describe("weak PIN check", () => {
  it.each(["000000", "111111", "999999", "123456", "234567", "456789", "654321", "987654", "543210", "890123", "210987"])(
    "rejects %s",
    (pin) => expect(isWeakPin(pin)).toBe(true),
  );

  it.each(["472915", "538204", "619473", "705318", "846251", "112233", "123457", "135790", "121212"])(
    "accepts %s",
    (pin) => expect(isWeakPin(pin)).toBe(false),
  );

  it("treats anything that is not exactly 6 digits as invalid", () => {
    for (const pin of ["12345", "1234567", "12a456", "", " 47291"]) expect(isWeakPin(pin)).toBe(true);
  });

  it("never generates a weak temporary PIN", () => {
    for (let i = 0; i < 500; i++) {
      const pin = generateTemporaryPin();
      expect(pin).toMatch(/^\d{6}$/);
      expect(isWeakPin(pin)).toBe(false);
    }
  });
});
