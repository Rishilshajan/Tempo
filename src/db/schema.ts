import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  date,
  time,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ----------------------------- enums ----------------------------- */

export const importanceEnum = pgEnum("importance", [
  "important",
  "medium",
  "flexible",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "not_started",
  "in_progress",
  "done",
  "rolled_forward",
]);

/* ---------------------------- domains ----------------------------
   User-created categories (@alpha, @beta, ...). Starts EMPTY -
   nothing is seeded; the user creates their own.                   */

export const domains = pgTable("domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  tag: text("tag").notNull().unique(), // e.g. "alpha" -> displayed as @alpha
  color: text("color").notNull(), // hex
  emoji: text("emoji"), // legacy
  glyph: text("glyph"), // Lucide glyph key (e.g. "rocket")
  purpose: text("purpose"), // semantic anchor / scope
  morningBias: boolean("morning_bias").default(true).notNull(),
  allowElastic: boolean("allow_elastic").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ----------------------------- tasks ----------------------------- */

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  domainId: uuid("domain_id").references(() => domains.id, {
    onDelete: "set null",
  }),
  importance: importanceEnum("importance").default("flexible").notNull(),
  inferredImportant: boolean("inferred_important").default(false).notNull(),
  status: taskStatusEnum("status").default("not_started").notNull(),
  date: date("date"),
  scheduledStart: time("scheduled_start"), // e.g. "09:00"
  scheduledEnd: time("scheduled_end"), // e.g. "10:30"
  timeHint: text("time_hint"), // "before noon", "by 2pm"
  durationMin: integer("duration_min"),
  minDurationMin: integer("min_duration_min"), // elastic floor
  isElastic: boolean("is_elastic").default(true).notNull(),
  rollforwardCount: integer("rollforward_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------- task_milestones -----------------------
   Deconstructed sub-steps of a task (generated or manual).         */

export const taskMilestones = pgTable("task_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  durationEstMin: integer("duration_est_min").default(15).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------- dependencies -------------------------
   blocks_task depends_on depends_on_task (Part 2 depends on Part 1).
   A directed edge is unique.                                        */

export const dependencies = pgTable(
  "dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blocksTaskId: uuid("blocks_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("dependencies_pair_unique").on(
      t.blocksTaskId,
      t.dependsOnTaskId,
    ),
  ],
);

/* --------------------------- app_settings ------------------------
   Single-row settings (no user_id in the rapid-test phase).        */

export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  productivityWindow: text("productivity_window").default("morning").notNull(),
  focusStart: time("focus_start").default("08:30").notNull(),
  focusEnd: time("focus_end").default("11:30").notNull(),
  elasticCushionMin: integer("elastic_cushion_min").default(45).notNull(),
  alertTimes: jsonb("alert_times").$type<string[]>().default([]).notNull(),
  palette: text("palette").default("sage-focus").notNull(),
  theme: text("theme").default("light").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* -------------------------- warning_rules ------------------------
   Auditable: which conditions trigger agent warnings.              */

export const warningRules = pgTable("warning_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  condition: text("condition").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
});

/* ----------------------- push_subscriptions ----------------------
   Web Push endpoints for PWA notifications. One row per device/browser
   that opted in. No user_id yet (single-user); add with auth later.   */

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(), // client public key
  auth: text("auth").notNull(), // client auth secret
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------ notification_log -----------------------
   Send-once guard. A unique `slot` (e.g. "2026-10-03|09:00") makes a
   duplicate insert fail, so overlapping cron ticks never double-send.  */

export const notificationLog = pgTable("notification_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  slot: text("slot").notNull().unique(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
});

/* --------------------------- inferred types ---------------------- */

export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskMilestone = typeof taskMilestones.$inferSelect;
export type NewTaskMilestone = typeof taskMilestones.$inferInsert;
export type Dependency = typeof dependencies.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
export type WarningRule = typeof warningRules.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
