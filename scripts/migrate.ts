/**
 * Applies the generated SQL migrations in drizzle/ to DATABASE_URL
 * (default data/cosmic-shield.db).
 *
 *   npm run db:migrate          # apply pending migrations
 *   npm run db:generate         # after editing lib/db/schema.ts
 *
 * Databases created before migrations existed (with `drizzle-kit push`) already
 * contain the 0000_baseline tables. For those, the baseline is recorded as
 * applied without running it, then the later migrations run as normal.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import fs from "node:fs";
import path from "node:path";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");
const MIGRATIONS_TABLE = "__drizzle_migrations";

export function resolveDbPath(url = process.env.DATABASE_URL) {
  return url?.replace(/^file:/, "") ?? path.join(process.cwd(), "data", "cosmic-shield.db");
}

/** Records the baseline as applied on a pre-migration (push-created) database. */
export function adoptPushedDatabase(sqlite: Database.Database) {
  const has = (name: string) =>
    Boolean(sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
  if (has(MIGRATIONS_TABLE) || !has("users")) return false;

  const [baseline] = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  sqlite.exec(
    `CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)`,
  );
  sqlite
    .prepare(`INSERT INTO "${MIGRATIONS_TABLE}" (hash, created_at) VALUES (?, ?)`)
    .run(baseline.hash, baseline.folderMillis);
  return true;
}

export function runMigrations(url?: string) {
  const dbPath = resolveDbPath(url);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  try {
    const adopted = adoptPushedDatabase(sqlite);
    migrate(drizzle(sqlite), { migrationsFolder: MIGRATIONS_FOLDER, migrationsTable: MIGRATIONS_TABLE });
    return { dbPath, adopted };
  } finally {
    sqlite.close();
  }
}

if (/migrate\.ts$/.test(process.argv[1] ?? "")) {
  try {
    const { dbPath, adopted } = runMigrations();
    console.log(`Migrations applied to ${path.relative(process.cwd(), dbPath)}${adopted ? " (existing database adopted)" : ""}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Migration failed");
    process.exit(1);
  }
}
