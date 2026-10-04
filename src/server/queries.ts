import "server-only";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { domains, tasks, appSettings } from "@/db/schema";
import type { Task, Domain, AppSettings } from "@/db/schema";

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

export async function getDomains(): Promise<Domain[]> {
  return db
    .select()
    .from(domains)
    .orderBy(asc(domains.sortOrder), asc(domains.createdAt));
}

/** The single app_settings row - lazily created with defaults on first read. */
export async function getAppSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSettings).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db.insert(appSettings).values({}).returning();
  return created;
}

export type TaskFilter = {
  status?: Task["status"];
  date?: string;
  domainId?: string;
};

export async function getTasks(filter: TaskFilter = {}): Promise<Task[]> {
  const where = [];
  if (filter.status) where.push(eq(tasks.status, filter.status));
  if (filter.date) where.push(eq(tasks.date, filter.date));
  if (filter.domainId) where.push(eq(tasks.domainId, filter.domainId));

  return db
    .select()
    .from(tasks)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(tasks.createdAt));
}

export type NavCounts = {
  today: number;
  all: number;
  rolled: number;
  uncategorized: number;
};

export async function getTaskCounts(): Promise<NavCounts> {
  const today = todayISO();
  const [all, rolled, todayCount, uncategorized] = await Promise.all([
    db.select({ n: count() }).from(tasks),
    db
      .select({ n: count() })
      .from(tasks)
      .where(eq(tasks.status, "rolled_forward")),
    db.select({ n: count() }).from(tasks).where(eq(tasks.date, today)),
    db.select({ n: count() }).from(tasks).where(isNull(tasks.domainId)),
  ]);

  return {
    all: all[0]?.n ?? 0,
    rolled: rolled[0]?.n ?? 0,
    today: todayCount[0]?.n ?? 0,
    uncategorized: uncategorized[0]?.n ?? 0,
  };
}
