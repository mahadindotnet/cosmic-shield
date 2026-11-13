import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  /** Chosen mission environment (lib/mission/environments.ts id); null until picked. */
  environment: text("environment", { enum: ["iss", "lunar", "mars-transit", "mars-surface"] }),
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

/* ------------------------------------------------------ health entries */
/*
 * One typed table per module. Every row belongs to one user (users.id, which
 * stays stable when a crew ID is reassigned) and records who entered it
 * (`entered_by`, for auditing) and where it came from (`source`). Times are
 * ISO 8601 UTC strings. Statuses are never stored: rules run on read.
 */

const ENTRY_SOURCES = ["manual", "seed", "device"] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

const entryColumns = () => ({
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Whose data this is (users.id). */
  userId: integer("user_id").notNull(),
  /** When the measurement was taken (ISO UTC). */
  recordedAt: text("recorded_at").notNull(),
  source: text("source", { enum: ENTRY_SOURCES }).notNull().default("manual"),
  /** users.id of whoever saved the row. */
  enteredBy: integer("entered_by").notNull(),
  /** When the row was saved (ISO UTC). */
  createdAt: text("created_at").notNull(),
});

/** One set of vitals taken together. */
export const vitalsEntry = sqliteTable(
  "vitals_entry",
  {
    ...entryColumns(),
    heartRate: integer("heart_rate").notNull(),
    systolic: integer("systolic").notNull(),
    diastolic: integer("diastolic").notNull(),
    spo2: integer("spo2").notNull(),
    /** mg/dL, optional. */
    glucose: real("glucose"),
  },
  (t) => [index("vitals_entry_user_time").on(t.userId, t.recordedAt)],
);

/** One sleep period. `night` is the UTC date the sleep period started. */
export const sleepEntry = sqliteTable(
  "sleep_entry",
  {
    ...entryColumns(),
    night: text("night").notNull(),
    sleepHours: real("sleep_hours").notNull(),
    /** Nightly HRV as RMSSD, ms. */
    hrvRmssd: real("hrv_rmssd"),
    /** Self-rated 1–5. */
    quality: integer("quality"),
    /** Self-rated stress 1 (calm) – 5 (overwhelmed). */
    stress: integer("stress"),
  },
  (t) => [index("sleep_entry_user_night").on(t.userId, t.night)],
);

/** Personal dosimeter reading for one period. */
export const doseEntry = sqliteTable(
  "dose_entry",
  {
    ...entryColumns(),
    /** Dose equivalent, mSv. */
    doseMsv: real("dose_msv").notNull(),
    /** Length of the period the dose covers, hours (24 = one day). */
    periodHours: real("period_hours").notNull().default(24),
    /** Mission environment at the time. */
    environment: text("environment"),
    note: text("note"),
  },
  (t) => [index("dose_entry_user_time").on(t.userId, t.recordedAt)],
);

/** Bone protection log: exercise (aerobic and resistance, with load) and calcium / vitamin D intake. */
export const countermeasureEntry = sqliteTable(
  "countermeasure_entry",
  {
    ...entryColumns(),
    /** Derived from the minutes: aerobic, resistive, mixed, or none (intake only). */
    kind: text("kind", { enum: ["resistive", "aerobic", "mixed", "other", "none"] }).notNull(),
    /** Total exercise minutes (aerobic + resistance). */
    minutes: integer("minutes").notNull(),
    aerobicMinutes: integer("aerobic_minutes"),
    resistanceMinutes: integer("resistance_minutes"),
    /** Resistance load, kg (with reps: volume = kg × reps). */
    loadKg: real("load_kg"),
    reps: integer("reps"),
    calciumMg: real("calcium_mg"),
    vitaminDIu: real("vitamin_d_iu"),
    /** Perceived effort, 1–10. */
    effort: integer("effort"),
    note: text("note"),
  },
  (t) => [index("countermeasure_entry_user_time").on(t.userId, t.recordedAt)],
);

/** Gastrointestinal log: Bristol stool type, fluid intake, an optional note and photo. */
export const giEntry = sqliteTable(
  "gi_entry",
  {
    ...entryColumns(),
    /** Bristol stool scale 1–7. */
    bristolType: integer("bristol_type"),
    hydrationLiters: real("hydration_liters"),
    /** Comma-separated symptom keys, e.g. "nausea,bloating". */
    symptoms: text("symptoms"),
    note: text("note"),
    /**
     * Optional stool photo: path under the uploads folder (never served by
     * path; only via /api/photos/gi/[id] to the owner or the flight surgeon).
     */
    photoPath: text("photo_path"),
    /** Classifier result for the photo; the prototype never analyses ("not_analysed"). */
    photoAnalysis: text("photo_analysis"),
  },
  (t) => [index("gi_entry_user_time").on(t.userId, t.recordedAt)],
);

/**
 * Eye screening: Amsler grid result or a fundus photo. Photos live under
 * uploads/ (gitignored); only the relative path is stored here.
 */
export const eyeScreening = sqliteTable(
  "eye_screening",
  {
    ...entryColumns(),
    kind: text("kind", { enum: ["amsler", "fundus"] }).notNull(),
    eye: text("eye", { enum: ["left", "right", "both"] }).notNull(),
    /** Amsler: "normal" or "distortion". */
    amslerResult: text("amsler_result", { enum: ["normal", "distortion"] }),
    /** JSON of marked grid cells, Amsler only. */
    amslerMarks: text("amsler_marks"),
    /** Relative path under uploads/, fundus only. */
    photoPath: text("photo_path"),
    note: text("note"),
  },
  (t) => [index("eye_screening_user_time").on(t.userId, t.recordedAt)],
);

/**
 * Daily Mind check-in. Scales are 1–5 (migration 0003 converted any older
 * 0–10 rows). The note is private: the flight surgeon sees scores only, unless
 * the note triggered a safety escalation.
 */
export const checkin = sqliteTable(
  "checkin",
  {
    ...entryColumns(),
    /** Self-rated 1 (low) – 5 (great). */
    mood: integer("mood").notNull(),
    /** Self-rated 1 (calm) – 5 (overwhelmed). */
    stress: integer("stress"),
    /** Unused (kept from the original table). */
    energy: integer("energy"),
    /** Self-rated sleep quality 1 (poor) – 5 (great), optional. */
    sleepQuality: integer("sleep_quality"),
    note: text("note"),
  },
  (t) => [index("checkin_user_time").on(t.userId, t.recordedAt)],
);

/**
 * An Escalate raised by a saved entry: a record for the flight surgeon with
 * the evidence (values, limits crossed and their sources). Written once when
 * the entry is saved; the entry's status itself is still computed on read.
 */
export const escalation = sqliteTable(
  "escalation",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Whose data raised it (users.id). */
    userId: integer("user_id").notNull(),
    /** Crew ID at the time, e.g. "CS-001". */
    crewId: text("crew_id").notNull(),
    /** Which rule set raised it, e.g. "vitals". */
    ruleId: text("rule_id").notNull(),
    /** Table and row that raised it. */
    entryTable: text("entry_table").notNull(),
    entryId: integer("entry_id").notNull(),
    /** Plain-language reasons, joined. */
    reason: text("reason").notNull(),
    /** JSON: values, triggered limits with sources. */
    evidenceJson: text("evidence_json").notNull(),
    createdAt: text("created_at").notNull(),
    /** Set when the flight surgeon has reviewed it (epoch ms). */
    reviewedAt: integer("reviewed_at"),
    reviewedBy: integer("reviewed_by"),
  },
  (t) => [index("escalation_user_time").on(t.userId, t.createdAt)],
);

/* ---------------------------------------------------- notifications */

/**
 * Read state of in-app notifications. The notifications themselves are
 * computed on each request (lib/notifications); only "this user has read the
 * item with this key" is stored. Also holds "Choose later" on the environment
 * dialog, per login session (key "env-prompt-later:<session issuedAt>").
 */
export const notificationRead = sqliteTable(
  "notification_read",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    /** Stable item key, e.g. "checkin-due:2026-11-13" or "escalation:42". */
    key: text("key").notNull(),
    /** Epoch ms. */
    readAt: integer("read_at").notNull(),
  },
  (t) => [uniqueIndex("notification_read_user_key").on(t.userId, t.key)],
);

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
