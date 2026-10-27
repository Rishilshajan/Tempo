import {
  pgTable,
  pgEnum,
  pgPolicy,
  uuid,
  text,
  boolean,
  integer,
  date,
  time,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

/* -------------------------- RLS helpers --------------------------
   Every user-owned table carries a nullable `user_id` -> auth.users
   and a single "owner only" policy. The column is nullable for now so
   existing rows survive the add; it's backfilled and flipped to
   NOT NULL in the scoping phase. Drizzle connects as the table owner
   and BYPASSES RLS, so the app keeps working today - these policies
   lock down the public anon/authenticated key's REST surface.        */

const userId = () =>
  uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" });

/** `FOR ALL` owner-scoped policy keyed on the request's auth.uid(). */
function ownerPolicy(name: string) {
  return pgPolicy(name, {
    for: "all",
    to: authenticatedRole,
    using: sql`(select auth.uid()) = user_id`,
    withCheck: sql`(select auth.uid()) = user_id`,
  });
}

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

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    tag: text("tag").notNull().unique(), // e.g. "alpha" -> displayed as @alpha
    color: text("color").notNull(), // hex
    emoji: text("emoji"), // legacy
    glyph: text("glyph"), // Lucide glyph key (e.g. "rocket")
    purpose: text("purpose"), // semantic anchor / scope
    morningBias: boolean("morning_bias").default(true).notNull(),
    allowElastic: boolean("allow_elastic").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("domains_order_idx").on(t.sortOrder, t.createdAt),
    ownerPolicy("domains_owner"),
  ],
);

/* ---------------------------- threads ----------------------------
   A chain of related tasks that continue one line of work (like a
   Gmail conversation). Tasks reference a thread; completing one can
   spawn the next, keeping full context + history.                   */

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    title: text("title").notNull(),
    status: text("status").default("active").notNull(), // 'active' | 'closed'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  () => [ownerPolicy("threads_owner")],
);

/* ----------------------------- tasks ----------------------------- */

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    title: text("title").notNull(),
    description: text("description"),
    // Thread continuity: which thread this task belongs to, and which task
    // spawned it (exact lineage within the thread).
    threadId: uuid("thread_id").references(() => threads.id, {
      onDelete: "set null",
    }),
    parentTaskId: uuid("parent_task_id").references(
      (): AnyPgColumn => tasks.id,
      { onDelete: "set null" },
    ),
    domainId: uuid("domain_id").references(() => domains.id, {
      onDelete: "set null",
    }),
    importance: importanceEnum("importance").default("flexible").notNull(),
    inferredImportant: boolean("inferred_important").default(false).notNull(),
    status: taskStatusEnum("status").default("not_started").notNull(),
    date: date("date"),
    scheduledEndDate: date("scheduled_end_date"),
    scheduledStart: time("scheduled_start"), // e.g. "09:00"
    scheduledEnd: time("scheduled_end"), // e.g. "10:30"
    timeHint: text("time_hint"), // "before noon", "by 2pm"
    durationMin: integer("duration_min"),
    minDurationMin: integer("min_duration_min"), // elastic floor
    isElastic: boolean("is_elastic").default(true).notNull(),
    rollforwardCount: integer("rollforward_count").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }), // most recent completion, retained when reopened
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("tasks_date_created_idx").on(t.date, t.createdAt),
    index("tasks_status_created_idx").on(t.status, t.createdAt),
    index("tasks_domain_id_idx").on(t.domainId),
    index("tasks_thread_id_idx").on(t.threadId, t.createdAt),
    index("tasks_escalation_idx")
      .on(t.rollforwardCount)
      .where(sql`${t.rollforwardCount} >= 3 and ${t.status} <> 'done'`),
    ownerPolicy("tasks_owner"),
  ],
);

/* ------------------------- task_milestones -----------------------
   Deconstructed sub-steps of a task (generated or manual).         */

export const taskMilestones = pgTable(
  "task_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"), // subtask details
    date: date("date"), // per-subtask date
    scheduledTime: time("scheduled_time"), // per-subtask time, e.g. "09:30"
    durationEstMin: integer("duration_est_min").default(15).notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  () => [ownerPolicy("task_milestones_owner")],
);

/* --------------------------- task_notes --------------------------
   Append-only notes/output log per task (what the task produced:
   results, meeting notes, decisions, reference links).             */

export const taskNotes = pgTable(
  "task_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("task_notes_task_created_idx").on(t.taskId, t.createdAt),
    ownerPolicy("task_notes_owner"),
  ],
);

/* -------------------------- dependencies -------------------------
   blocks_task depends_on depends_on_task (Part 2 depends on Part 1).
   A directed edge is unique.                                        */

export const dependencies = pgTable(
  "dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
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
    ownerPolicy("dependencies_owner"),
  ],
);

/* --------------------------- app_settings ------------------------
   Single-row settings (no user_id in the rapid-test phase).        */

export const appSettings = pgTable(
  "app_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    productivityWindow: text("productivity_window").default("morning").notNull(),
    focusStart: time("focus_start").default("08:30").notNull(),
    focusEnd: time("focus_end").default("11:30").notNull(),
    elasticCushionMin: integer("elastic_cushion_min").default(45).notNull(),
    alertTimes: jsonb("alert_times").$type<string[]>().default([]).notNull(),
    palette: text("palette").default("sage-focus").notNull(),
    theme: text("theme").default("light").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  () => [ownerPolicy("app_settings_owner")],
);

/* -------------------------- warning_rules ------------------------
   Auditable: which conditions trigger agent warnings.              */

export const warningRules = pgTable(
  "warning_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    condition: text("condition").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
  },
  () => [ownerPolicy("warning_rules_owner")],
);

/* ----------------------- push_subscriptions ----------------------
   Web Push endpoints for PWA notifications. One row per device/browser
   that opted in. No user_id yet (single-user); add with auth later.   */

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(), // client public key
    auth: text("auth").notNull(), // client auth secret
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  () => [ownerPolicy("push_subscriptions_owner")],
);

/* ------------------------ notification_log -----------------------
   Send-once guard. A unique `slot` (e.g. "2026-10-03|09:00") makes a
   duplicate insert fail, so overlapping cron ticks never double-send.  */

export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    slot: text("slot").notNull().unique(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  () => [ownerPolicy("notification_log_owner")],
);

/* ----------------------- notification_reads ----------------------
   Read flags for the in-app notification feed. Notifications are
   derived live from task state, so we persist which notification ids
   a user has read (click or "clear all"); the feed hides them.       */

export const notificationReads = pgTable(
  "notification_reads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    notificationId: text("notification_id").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("notification_reads_user_nid_unique").on(
      t.userId,
      t.notificationId,
    ),
    ownerPolicy("notification_reads_owner"),
  ],
);

/* --------------------------- inferred types ---------------------- */

export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskMilestone = typeof taskMilestones.$inferSelect;
export type NewTaskMilestone = typeof taskMilestones.$inferInsert;
export type TaskNote = typeof taskNotes.$inferSelect;
export type NewTaskNote = typeof taskNotes.$inferInsert;
export type Dependency = typeof dependencies.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
export type WarningRule = typeof warningRules.$inferSelect;
export type NotificationRead = typeof notificationReads.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
