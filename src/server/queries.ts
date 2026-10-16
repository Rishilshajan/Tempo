import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { domains, tasks, threads, taskNotes, appSettings } from "@/db/schema";
import { log } from "@/lib/logger";
import { requireUserId } from "@/server/auth";
import type { Task, Domain, AppSettings, Thread } from "@/db/schema";

export async function withDbTiming<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  let outcome: "ok" | "error" = "ok";
  log.info("Database query started", { name });
  try {
    return await operation();
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    log.info("Database query finished", {
      name,
      outcome,
      durationMs: Date.now() - startedAt,
    });
  }
}

/**
 * Today as YYYY-MM-DD in the app's timezone - the single source of "today".
 * Set APP_TIMEZONE (IANA, e.g. "Asia/Kolkata") so the day boundary is
 * host-independent; unset falls back to the system timezone (fine in local
 * dev, but on a UTC host like Vercel you MUST set APP_TIMEZONE).
 */
export function todayISO(): string {
  const timeZone = process.env.APP_TIMEZONE || undefined;
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Human-readable "today" (e.g. "Monday, Oct 2") in the app's timezone. */
export function todayLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.APP_TIMEZONE || undefined,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

export const getDomains = cache(async (): Promise<Domain[]> => {
  const userId = await requireUserId();
  return withDbTiming("domains", () =>
    db
      .select()
      .from(domains)
      .where(eq(domains.userId, userId))
      .orderBy(asc(domains.sortOrder), asc(domains.createdAt)),
  );
});

/** The current user's app_settings row - lazily created with defaults. */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const userId = await requireUserId();
  return withDbTiming("app_settings", async () => {
    const rows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.userId, userId))
      .limit(1);
    if (rows[0]) return rows[0];
    const [created] = await db
      .insert(appSettings)
      .values({ userId })
      .returning();
    return created;
  });
});

export type TaskFilter = {
  status?: Task["status"];
  date?: string;
  domainId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

/** A thread plus its tasks in lineage order (oldest first), scoped to the user. */
export async function getThreadWithTasks(
  threadId: string,
): Promise<{ thread: Thread; tasks: Task[] } | null> {
  const userId = await requireUserId();
  return withDbTiming("thread_with_tasks", async () => {
    const [thread] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, threadId), eq(threads.userId, userId)))
      .limit(1);
    if (!thread) return null;
    const rows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.threadId, threadId), eq(tasks.userId, userId)))
      .orderBy(asc(tasks.createdAt), asc(tasks.id));
    return { thread, tasks: rows };
  });
}

export async function getTasks(filter: TaskFilter = {}): Promise<Task[]> {
  const userId = await requireUserId();
  const where: SQL[] = [eq(tasks.userId, userId)];
  if (filter.status) where.push(eq(tasks.status, filter.status));
  if (filter.date) where.push(eq(tasks.date, filter.date));
  if (filter.domainId) where.push(eq(tasks.domainId, filter.domainId));
  if (filter.dateFrom) where.push(sql`${tasks.date} >= ${filter.dateFrom}`);
  if (filter.dateTo) where.push(sql`${tasks.date} <= ${filter.dateTo}`);

  return withDbTiming("tasks", () => {
    const q = db
      .select()
      .from(tasks)
      .where(and(...where))
      // id tiebreaker keeps ordering deterministic (seed rows share createdAt),
      // so offset pagination never overlaps / duplicates rows.
      .orderBy(desc(tasks.createdAt), desc(tasks.id))
      .$dynamic();
    if (filter.limit !== undefined) q.limit(filter.limit);
    if (filter.offset !== undefined) q.offset(filter.offset);
    return q;
  });
}

/** Map of taskId -> number of notes, for the card 📝 indicator. */
export const getTaskNoteCounts = cache(
  async (): Promise<Record<string, number>> => {
    const userId = await requireUserId();
    const rows = await withDbTiming("task_note_counts", () =>
      db
        .select({ taskId: taskNotes.taskId, n: count() })
        .from(taskNotes)
        .where(eq(taskNotes.userId, userId))
        .groupBy(taskNotes.taskId),
    );
    return Object.fromEntries(rows.map((r) => [r.taskId, Number(r.n)]));
  },
);

export type NavCounts = {
  today: number;
  all: number;
  rolled: number;
  uncategorized: number;
};

export type TaskDashboardSummary = NavCounts & {
  activeToday: number;
};

export const getTaskDashboardSummary = cache(
  async (): Promise<TaskDashboardSummary> => {
    const userId = await requireUserId();
    const today = todayISO();
    return withDbTiming("task_dashboard_summary", async () => {
      const [summary] = await db
        .select({
          all: count(),
          rolled: sql<number>`count(*) filter (where ${tasks.status} = 'rolled_forward')`.mapWith(
            Number,
          ),
          today: sql<number>`count(*) filter (where ${tasks.date} = ${today})`.mapWith(
            Number,
          ),
          uncategorized: sql<number>`count(*) filter (where ${tasks.domainId} is null)`.mapWith(
            Number,
          ),
          activeToday: sql<number>`count(*) filter (where ${tasks.date} = ${today} and ${tasks.status} <> 'done')`.mapWith(
            Number,
          ),
        })
        .from(tasks)
        .where(eq(tasks.userId, userId));

      return summary;
    });
  },
);

export async function getTaskCounts(): Promise<NavCounts> {
  const { all, rolled, today, uncategorized } =
    await getTaskDashboardSummary();
  return { all, rolled, today, uncategorized };
}
