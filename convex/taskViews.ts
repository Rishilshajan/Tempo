import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { subtaskSnapshot } from "./taskDetailHelpers";
import { localDateKey } from "../src/lib/validation/task";

export async function isPlannedOccurrence(
  ctx: Pick<QueryCtx, "db">,
  task: Doc<"tasks">,
) {
  if (!task.seriesId || task.status !== "open") return false;
  const seriesId = task.seriesId;
  const completed = await ctx.db.query("tasks")
    .withIndex("by_series_status_completed", q => q.eq("seriesId", seriesId).eq("status", "completed"))
    .order("desc").first();
  const cutoff = completed?.completedAt;
  const date = cutoff === undefined ? "" : localDateKey(new Date(cutoff), task.timezone);
  const occurrences = () => ctx.db.query("tasks")
    .withIndex("by_series_status_cancelled_date", q => q.eq("seriesId", seriesId)
      .eq("status", "open").eq("recurrenceCancelled", undefined).gte("workDate", date))
    .order("asc");
  for await (const candidate of occurrences()) {
    if (cutoff === undefined || candidate.workDate > date ||
      candidate.schedule.type !== "fixed" || candidate.schedule.startAt >= cutoff) {
      return candidate._id !== task._id;
    }
  }
  return true;
}

export async function toTaskView(
  ctx: Pick<QueryCtx, "db">,
  task: Doc<"tasks">,
) {
  const domain = task.domainId ? await ctx.db.get(task.domainId) : null;
  const { ownerId, requestId, ...view } = task;
  void requestId;
  return {
    ...view,
    ...(task.seriesId ? { recurrencePlanned: await isPlannedOccurrence(ctx, task) } : {}),
    subtasks: await subtaskSnapshot(ctx, task),
    domain:
      domain && domain.ownerId === ownerId
        ? { name: domain.name, color: domain.color, icon: domain.icon }
        : null,
  };
}
