import "server-only";
import { and, lt, ne, sql } from "drizzle-orm";

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
 */
export async function rollforwardTasks(): Promise<number> {
  const today = todayISO();

  const moved = await db
    .update(tasks)
    .set({
      date: today,
      status: sql`case when ${tasks.status} = 'in_progress'
                       then 'in_progress'::task_status
                       else 'rolled_forward'::task_status end`,
      rollforwardCount: sql`${tasks.rollforwardCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(lt(tasks.date, today), ne(tasks.status, "done")))
    .returning({ id: tasks.id });

  log.success("Rollforward complete", { moved: moved.length, today });
  return moved.length;
}
