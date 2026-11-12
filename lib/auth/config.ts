/**
 * Auth constants and secrets. Pure (no Next.js imports) so the proxy, server
 * code and unit tests can all use it. Secret values are never logged or put
 * in error messages; only the variable names are.
 */

export const CREW_ID_PATTERN = /^(CS|FS)-\d{3}$/;
export const PIN_LENGTH = 6;

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 5 * 60 * 1000;

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const ABSOLUTE_SESSION_MS = 12 * 60 * 60 * 1000;

export const SESSION_COOKIE = "cs_session";
/** Last signed-in crew ID, used to pre-fill the PIN screen after a lock. Not secret. */
export const LAST_CREW_COOKIE = "cs_last_crew";

export const BCRYPT_COST = 12;

const MIN_SECRET_LENGTH = 32;

export class MissingSecretError extends Error {
  constructor(name: string, problem: string) {
    super(
      `${name} ${problem}. Add it to .env (see .env.example); generate one with: ` +
        `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    );
    this.name = "MissingSecretError";
  }
}

function readSecret(name: "SESSION_SECRET" | "PIN_PEPPER"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new MissingSecretError(name, "is not set");
  if (value.length < MIN_SECRET_LENGTH) throw new MissingSecretError(name, `must be at least ${MIN_SECRET_LENGTH} characters`);
  return value;
}

export const getSessionSecret = () => new TextEncoder().encode(readSecret("SESSION_SECRET"));
export const getPinPepper = () => readSecret("PIN_PEPPER");

/** Throws a clear error when a required secret is missing. Called at server startup. */
export function assertAuthEnv() {
  readSecret("SESSION_SECRET");
  readSecret("PIN_PEPPER");
}

/** Secure cookies by default; COOKIE_SECURE=false opts out for plain-HTTP LAN testing. */
export const cookieSecure = () => process.env.COOKIE_SECURE?.trim().toLowerCase() !== "false";

export const showDemoAccounts = () => process.env.SHOW_DEMO_ACCOUNTS?.trim().toLowerCase() !== "false";
