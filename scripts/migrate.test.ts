import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MIGRATIONS_FOLDER, runMigrations } from "./migrate";

const tmp: string[] = [];
const dbFile = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-migrate-"));
  tmp.push(dir);
  return path.join(dir, "test.db");
};
const inspect = (file: string) => {
  const db = new Database(file);
  const names = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => (r as { name: string }).name);
  const userCols = db
    .prepare("PRAGMA table_info(users)")
    .all()
    .map((r) => (r as { name: string }).name);
  db.close();
  return { names, userCols };
};

afterEach(() => {
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("runMigrations", () => {
  it("builds a fresh database with every typed table and is idempotent", () => {
    const file = dbFile();
    expect(runMigrations(`file:${file}`).adopted).toBe(false);
    runMigrations(`file:${file}`);
    const { names, userCols } = inspect(file);
    for (const t of ["vitals_entry", "sleep_entry", "dose_entry", "countermeasure_entry", "gi_entry", "eye_screening", "checkin", "users", "vital_reading"]) {
      expect(names).toContain(t);
    }
    expect(userCols).toContain("environment");
  });

  it("adopts a database created by drizzle-kit push (baseline tables, no journal)", () => {
    const file = dbFile();
    const baseline = fs.readFileSync(path.join(MIGRATIONS_FOLDER, "0000_baseline.sql"), "utf8");
    const db = new Database(file);
    for (const stmt of baseline.split("--> statement-breakpoint")) db.exec(stmt);
    db.close();

    expect(runMigrations(`file:${file}`).adopted).toBe(true);
    const { names, userCols } = inspect(file);
    expect(names).toContain("vitals_entry");
    expect(userCols).toContain("environment");
  });
});
