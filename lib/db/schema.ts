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
