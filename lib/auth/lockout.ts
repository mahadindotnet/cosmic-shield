/**
 * Lockout rules (pure, unit-tested): the 5th consecutive failure locks the
 * account for 5 minutes; a success resets the counter. When a lock expires the
 * counter starts again from zero.
 */
import { LOCKOUT_MS, MAX_FAILED_ATTEMPTS } from "./config";

export interface LockState {
  failedAttempts: number;
  /** Epoch ms, or null when not locked. */
  lockedUntil: number | null;
}

export const UNLOCKED: LockState = { failedAttempts: 0, lockedUntil: null };

export function isLocked(state: LockState, now: number) {
  return state.lockedUntil !== null && state.lockedUntil > now;
}

export function remainingLockMs(state: LockState, now: number) {
  return isLocked(state, now) ? state.lockedUntil! - now : 0;
}

/** State after a failed attempt at `now` (only call when not currently locked). */
export function registerFailure(state: LockState, now: number): LockState {
  // A lock that has expired starts a fresh count.
  const base = state.lockedUntil !== null && state.lockedUntil <= now ? UNLOCKED : state;
  const failedAttempts = base.failedAttempts + 1;
  return failedAttempts >= MAX_FAILED_ATTEMPTS
    ? { failedAttempts, lockedUntil: now + LOCKOUT_MS }
    : { failedAttempts, lockedUntil: null };
}

export const registerSuccess = (): LockState => UNLOCKED;

/**
 * Rebuilds the lock state from a history of attempts (oldest first). Used for
 * crew IDs that do not exist, so they lock exactly like real ones and the
 * lockout cannot be used to tell which IDs exist.
 */
export function replayAttempts(attempts: readonly { timestamp: number; success: boolean }[]): LockState {
  let state = UNLOCKED;
  for (const a of attempts) {
    if (a.success) state = registerSuccess();
    else if (!isLocked(state, a.timestamp)) state = registerFailure(state, a.timestamp);
  }
  return state;
}
