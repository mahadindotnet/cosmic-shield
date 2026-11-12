import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ABSOLUTE_SESSION_MS, IDLE_TIMEOUT_MS } from "./config";
import { readSessionToken, sessionStatus, signSession, type SessionPayload } from "./session-token";

const T0 = Date.now();
const payload: SessionPayload = {
  uid: 1,
  crewId: "CS-001",
  role: "crew",
  issuedAt: T0,
  lastActive: T0,
  mustChangePin: false,
};

describe("session token", () => {
  beforeEach(() => vi.stubEnv("SESSION_SECRET", "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz"));
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips a signed session", async () => {
    expect(await readSessionToken(await signSession(payload))).toEqual(payload);
  });

  it("rejects a tampered or foreign-key token", async () => {
    const token = await signSession(payload);
    const [h, body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, role: "flight_surgeon" })).toString("base64url");
    expect(await readSessionToken(`${h}.${forged}.${sig}`)).toBeNull();
    vi.stubEnv("SESSION_SECRET", "another-secret-0123456789-abcdefghijklmnopqrst");
    expect(await readSessionToken(`${h}.${body}.${sig}`)).toBeNull();
    expect(await readSessionToken(undefined)).toBeNull();
  });

  it("locks after 15 minutes idle and expires after 12 hours", () => {
    expect(sessionStatus(payload, T0 + IDLE_TIMEOUT_MS - 1)).toBe("active");
    expect(sessionStatus(payload, T0 + IDLE_TIMEOUT_MS)).toBe("idle");
    const busy = { ...payload, lastActive: T0 + ABSOLUTE_SESSION_MS - 1000 };
    expect(sessionStatus(busy, T0 + ABSOLUTE_SESSION_MS - 1)).toBe("active");
    expect(sessionStatus(busy, T0 + ABSOLUTE_SESSION_MS)).toBe("expired");
  });
});
