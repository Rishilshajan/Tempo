import "server-only";

import { and, desc, gte, ne } from "drizzle-orm";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getTaskDashboardSummary, withDbTiming } from "@/server/queries";

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
  const [summary, escalations] = await Promise.all([
    getTaskDashboardSummary(),
    withDbTiming("task_escalations", () =>
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          rollforwardCount: tasks.rollforwardCount,
        })
        .from(tasks)
        .where(and(gte(tasks.rollforwardCount, 3), ne(tasks.status, "done")))
        .orderBy(desc(tasks.rollforwardCount)),
    ),
  ]);
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
      id: "rolled-summary",
      title: `${summary.rolled} task${summary.rolled > 1 ? "s" : ""} rolled forward`,
      body: "Unfinished past-due work moved to today.",
      href: "/rolled",
      tone: "rolled",
    });
  }

  // Today's load.
  if (summary.activeToday) {
    items.push({
      id: "today-load",
      title: `${summary.activeToday} task${summary.activeToday > 1 ? "s" : ""} on deck today`,
      body: "Open Today to start your briefing.",
      href: "/today",
      tone: "info",
    });
  }

  return items;
}
