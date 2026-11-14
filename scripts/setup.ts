/**
 * One-step local setup:  npm run setup
 *
 * 1. Creates .env from .env.example if it doesn't exist, and fills in
 *    SESSION_SECRET and PIN_PEPPER with fresh random values wherever they
 *    still hold the example placeholders. Existing values are kept.
 * 2. Applies the database migrations (npm run db:migrate).
 * 3. Seeds the demo accounts and data (npm run db:seed).
 *
 * Secrets are written to .env only; they are never printed.
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

const PLACEHOLDERS: Record<string, string> = {
  SESSION_SECRET: "replace-with-a-long-random-string",
  PIN_PEPPER: "replace-with-a-different-long-random-string",
};

const secret = () => randomBytes(48).toString("base64url");

function prepareEnv() {
  const created = !fs.existsSync(envPath);
  let text = created ? fs.readFileSync(examplePath, "utf8") : fs.readFileSync(envPath, "utf8");
  const filled: string[] = [];
  for (const [key, placeholder] of Object.entries(PLACEHOLDERS)) {
    const line = new RegExp(`^${key}=(.*)$`, "m");
    const match = text.match(line);
    if (!match) {
      text += `${text.endsWith("\n") ? "" : "\n"}${key}=${secret()}\n`;
      filled.push(key);
    } else if (match[1].trim() === "" || match[1].trim() === placeholder) {
      text = text.replace(line, `${key}=${secret()}`);
      filled.push(key);
    }
  }
  fs.writeFileSync(envPath, text);
  console.log(created ? "Created .env from .env.example." : "Using the existing .env.");
  if (filled.length) console.log(`Generated ${filled.join(" and ")} (written to .env, not shown).`);
}

prepareEnv();
execSync("npm run db:migrate", { stdio: "inherit" });
execSync("npm run db:seed", { stdio: "inherit" });
console.log("\nReady. Start the app with:  npm run dev  → http://localhost:3000");
