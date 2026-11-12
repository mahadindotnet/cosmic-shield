import { describe, expect, it } from "vitest";
import { LOCKOUT_MS, MAX_FAILED_ATTEMPTS } from "./config";
import { isLocked, registerFailure, registerSuccess, remainingLockMs, replayAttempts, UNLOCKED, type LockState } from "./lockout";

const T0 = Date.UTC(2026, 10, 12, 12, 0, 0);
const fail = (n: number, start = UNLOCKED, at = T0) => {
  let s: LockState = start;
  for (let i = 0; i < n; i++) s = registerFailure(s, at + i * 1000);
  return s;
};

describe("lockout timing", () => {
  it("allows four failures, locks on the fifth for five minutes", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCKOUT_MS).toBe(5 * 60 * 1000);
    const four = fail(4);
    expect(four).toEqual({ failedAttempts: 4, lockedUntil: null });
    expect(isLocked(four, T0 + 4000)).toBe(false);

    const five = registerFailure(four, T0 + 4000);
    expect(five.lockedUntil).toBe(T0 + 4000 + LOCKOUT_MS);
    expect(isLocked(five, T0 + 4000)).toBe(true);
    expect(remainingLockMs(five, T0 + 4000 + 60_000)).toBe(LOCKOUT_MS - 60_000);
  });

  it("unlocks exactly when the five minutes are up", () => {
    const locked = fail(5);
    const until = locked.lockedUntil!;
    expect(isLocked(locked, until - 1)).toBe(true);
    expect(isLocked(locked, until)).toBe(false);
    expect(remainingLockMs(locked, until)).toBe(0);
  });

  it("starts a fresh count after the lock expires", () => {
    const locked = fail(5);
    const after = registerFailure(locked, locked.lockedUntil! + 1);
    expect(after).toEqual({ failedAttempts: 1, lockedUntil: null });
  });

  it("resets the counter after a successful login", () => {
    expect(registerSuccess()).toEqual(UNLOCKED);
    const s = registerFailure(registerSuccess(), T0);
    expect(s.failedAttempts).toBe(1);
  });

  it("replays history for unknown IDs the same way (no enumeration through lockout)", () => {
    const attempts = Array.from({ length: 5 }, (_, i) => ({ timestamp: T0 + i * 1000, success: false }));
    const replayed = replayAttempts(attempts);
    expect(replayed).toEqual(fail(5));
    // Attempts made while locked don't extend the lock.
    const extra = replayAttempts([...attempts, { timestamp: T0 + 60_000, success: false }]);
    expect(extra.lockedUntil).toBe(replayed.lockedUntil);
    // A success in between resets.
    expect(replayAttempts([...attempts.slice(0, 4), { timestamp: T0 + 4500, success: true }]).failedAttempts).toBe(0);
  });
});
