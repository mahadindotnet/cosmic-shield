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

  it("0003 converts existing 0–10 check-in scores to 1–5 (and adds sleep_quality)", () => {
    const file = dbFile();
    // Migrations up to 0002 only: copy the folder without 0003.
    const partial = path.join(path.dirname(file), "drizzle-0002");
    fs.cpSync(MIGRATIONS_FOLDER, partial, { recursive: true });
    const journalPath = path.join(partial, "meta", "_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as { entries: { tag: string }[] };
    journal.entries = journal.entries.filter((e) => !e.tag.startsWith("0003"));
    fs.writeFileSync(journalPath, JSON.stringify(journal));
    runMigrations(`file:${file}`, partial);

    const db = new Database(file);
    const insert = db.prepare(
      "INSERT INTO checkin (user_id, recorded_at, source, entered_by, created_at, mood, stress, energy) VALUES (1, '2026-01-01', 'manual', 1, '2026-01-01', ?, ?, ?)",
    );
    for (const [mood, stress] of [[0, null], [5, 10], [10, 3], [7, 0]]) insert.run(mood, stress, null);
    db.close();

    runMigrations(`file:${file}`);
    const after = new Database(file);
    const rows = after.prepare("SELECT mood, stress, sleep_quality FROM checkin ORDER BY id").all();
    after.close();
    expect(rows).toEqual([
      { mood: 1, stress: null, sleep_quality: null },
      { mood: 3, stress: 5, sleep_quality: null },
      { mood: 5, stress: 2, sleep_quality: null },
      { mood: 4, stress: 1, sleep_quality: null },
    ]);
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
