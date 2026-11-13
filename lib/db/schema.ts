import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const crew = sqliteTable("crew", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
});

export const vitalReading = sqliteTable("vital_reading", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  crewId: text("crew_id").notNull(),
  metric: text("metric").notNull(),
  value: real("value").notNull(),
  missionDay: integer("mission_day").notNull(),
  recordedAt: text("recorded_at").notNull(),
});

export const checkIn = sqliteTable("check_in", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  crewId: text("crew_id").notNull(),
  affectScore: integer("affect_score").notNull(),
  note: text("note").notNull(),
  recordedAt: text("recorded_at").notNull(),
});

export const escalationEvent = sqliteTable("escalation_event", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  crewId: text("crew_id").notNull(),
  level: text("level").notNull(),
  reason: text("reason").notNull(),
  evidenceJson: text("evidence_json").notNull(),
  recordedAt: text("recorded_at").notNull(),
});

/* ------------------------------------------------------------- auth */

/** Login accounts: crew ID + PIN (no email or password). */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Login identifier, e.g. "CS-001" or "FS-001". Can be reassigned by a flight surgeon. */
  crewId: text("crew_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["crew", "flight_surgeon"] }).notNull(),
  /** Job title shown in the UI, e.g. "Commander". */
  title: text("title").notNull().default(""),
  /** Links to the crew health data (demo profile id). Stable when crewId changes. */
  profileId: text("profile_id"),
  /** bcrypt(HMAC-SHA256(PIN_PEPPER, pin)). Never logged. */
  pinHash: text("pin_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  /** Epoch ms; null when not locked. */
  lockedUntil: integer("locked_until"),
  mustChangePin: integer("must_change_pin", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

/** Every login attempt and session event. Never contains PINs or hashes. */
export const loginAudit = sqliteTable("login_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  crewId: text("crew_id").notNull(),
  /** Epoch ms. */
  timestamp: integer("timestamp").notNull(),
  success: integer("success", { mode: "boolean" }).notNull(),
  reason: text("reason").notNull(),
});

/* ----------------------------------------------------------- alerts */

/** "Dismiss for today" acknowledgements of pattern alerts (one row per dismissal). */
export const alertAck = sqliteTable("alert_ack", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** users.id of the person who acknowledged. */
  userId: integer("user_id").notNull(),
  /** Crew ID at the time of acknowledgement, e.g. "CS-003". */
  crewId: text("crew_id").notNull(),
  ruleId: text("rule_id").notNull(),
  /** UTC day the alert is dismissed for (YYYY-MM-DD; the ISS runs on UTC). */
  day: text("day").notNull(),
  /** Epoch ms. */
  acknowledgedAt: integer("acknowledged_at").notNull(),
});
