import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { todayISO } from "@/server/queries";
import { log } from "@/lib/logger";

/**
 * Move every unfinished past-due task to today and bump its push counter.
 * - `done` tasks are never touched.
 * - `in_progress` tasks keep their status (active work is not demoted to
 *   slippage) but are still re-dated + counted so they don't silently drop.
 * - `not_started` / `rolled_forward` become `rolled_forward`.
 * Idempotent: after a run the moved rows are dated today, so a second run the
 * same day is a no-op. "Today" comes from todayISO() so the Today filter, the
 * briefing and this job all agree on the same day boundary.
 *
 * Pass a `userId` to roll only that user's tasks (the manual in-app trigger);
 * omit it for the nightly cron, which rolls every user's past-due work.
 */
export async function rollforwardTasks(userId?: string): Promise<number> {
  const today = todayISO();
  const conds = [
    sql`coalesce(${tasks.scheduledEndDate}, ${tasks.date}) < ${today}`,
    ne(tasks.status, "done"),
  ];
  if (userId) conds.push(eq(tasks.userId, userId));

  const moved = await db
    .update(tasks)
    .set({
      date: today,
      scheduledEndDate: sql`case
        when ${tasks.scheduledEndDate} is null then null
        else ${today}::date + (${tasks.scheduledEndDate} - ${tasks.date})
      end`,
      status: sql`case when ${tasks.status} = 'in_progress'
                       then 'in_progress'::task_status
                       else 'rolled_forward'::task_status end`,
      rollforwardCount: sql`${tasks.rollforwardCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(...conds))
    .returning({ id: tasks.id });

  log.success("Rollforward complete", { moved: moved.length, today, userId });
  return moved.length;
}
