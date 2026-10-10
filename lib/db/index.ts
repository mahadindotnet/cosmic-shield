import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";
import path from "path";
import fs from "fs";

const dbPath =
  process.env.DATABASE_URL?.replace("file:", "") ??
  path.join(process.cwd(), "data", "cosmic-shield.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
