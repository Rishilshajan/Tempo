import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { domains, tasks, appSettings } from "@/db/schema";
import { log } from "@/lib/logger";
import type { Task, Domain, AppSettings } from "@/db/schema";

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
  return withDbTiming("domains", () =>
    db
      .select()
      .from(domains)
      .orderBy(asc(domains.sortOrder), asc(domains.createdAt)),
  );
});

/** The single app_settings row - lazily created with defaults on first read. */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  return withDbTiming("app_settings", async () => {
    const rows = await db.select().from(appSettings).limit(1);
    if (rows[0]) return rows[0];
    const [created] = await db.insert(appSettings).values({}).returning();
    return created;
  });
});

export type TaskFilter = {
  status?: Task["status"];
  date?: string;
  domainId?: string;
};

export async function getTasks(filter: TaskFilter = {}): Promise<Task[]> {
  const where: SQL[] = [];
  if (filter.status) where.push(eq(tasks.status, filter.status));
  if (filter.date) where.push(eq(tasks.date, filter.date));
  if (filter.domainId) where.push(eq(tasks.domainId, filter.domainId));

  return withDbTiming("tasks", () =>
    db
      .select()
      .from(tasks)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(tasks.createdAt)),
  );
}

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
        .from(tasks);

      return summary;
    });
  },
);

export async function getTaskCounts(): Promise<NavCounts> {
  const { all, rolled, today, uncategorized } =
    await getTaskDashboardSummary();
  return { all, rolled, today, uncategorized };
}
