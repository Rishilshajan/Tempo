import "server-only";

import { and, desc, eq, gte, ne } from "drizzle-orm";

import { db } from "@/db";
import { tasks, notificationReads } from "@/db/schema";
import {
  getTaskDashboardSummary,
  todayISO,
  withDbTiming,
} from "@/server/queries";
import { requireUserId } from "@/server/auth";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: "urgent" | "rolled" | "info";
};

/**
 * In-app notification feed shown in the header bell. Derived live from task
 * state (no storage) - the same signals the briefing surfaces, as a glanceable
 * list: repeat-slippage escalations, rolled-forward work, and today's load.
 */
export async function getInAppNotifications(): Promise<AppNotification[]> {
  const userId = await requireUserId();
  const [summary, escalations, reads] = await Promise.all([
    getTaskDashboardSummary(),
    withDbTiming("task_escalations", () =>
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          rollforwardCount: tasks.rollforwardCount,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            gte(tasks.rollforwardCount, 3),
            ne(tasks.status, "done"),
          ),
        )
        .orderBy(desc(tasks.rollforwardCount)),
    ),
    withDbTiming("notification_reads", () =>
      db
        .select({ nid: notificationReads.notificationId })
        .from(notificationReads)
        .where(eq(notificationReads.userId, userId)),
    ),
  ]);
  const readSet = new Set(reads.map((r) => r.nid));
  // Daily summaries are stamped with today's date so a read flag only hides
  // them for the day - they re-surface tomorrow with fresh counts.
  const today = todayISO();
  const items: AppNotification[] = [];

  // Repeat offenders: pushed 3+ times - needs a real decision.
  for (const t of escalations) {
    items.push({
      id: `esc-${t.id}`,
      title: "Still real?",
      body: `"${t.title}" has rolled forward ${t.rollforwardCount}×.`,
      href: "/rolled",
      tone: "urgent",
    });
  }

  // Rolled-forward summary.
  if (summary.rolled) {
    items.push({
      id: `rolled-summary-${today}`,
      title: `${summary.rolled} task${summary.rolled > 1 ? "s" : ""} rolled forward`,
      body: "Unfinished past-due work moved to today.",
      href: "/rolled",
      tone: "rolled",
    });
  }

  // Today's load.
  if (summary.activeToday) {
    items.push({
      id: `today-load-${today}`,
      title: `${summary.activeToday} task${summary.activeToday > 1 ? "s" : ""} on deck today`,
      body: "Open Today to start your briefing.",
      href: "/today",
      tone: "info",
    });
  }

  // Hide anything the user has marked read (persisted per account).
  return items.filter((n) => !readSet.has(n.id));
}
