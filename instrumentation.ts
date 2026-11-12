/**
 * Runs once when the server starts. Fails fast with a clear message if the
 * login secrets are missing (values are never printed).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertAuthEnv } = await import("./lib/auth/config");
    assertAuthEnv();
  }
}
