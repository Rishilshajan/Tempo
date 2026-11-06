import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  dateDistance,
  occurrenceDate,
  recurrenceAllows,
  shiftDate,
  moveStartToDate,
} from "../src/lib/validation/recurrence";
import { localDateKey } from "../src/lib/validation/task";
import {
  subtaskSnapshot,
  normalizeSubtasks,
  recordActivity,
} from "./taskDetailHelpers";

/** Each endpoint moves in wall-clock time, preserving overnight/multi-day spans through DST. */
export function occurrenceSchedule(
  template: Pick<Doc<"tasks">, "schedule" | "timezone">,
  date: string,
) {
  const { schedule, timezone } = template;
  if (schedule.type === "flexible")
    return {
      type: "flexible" as const,
      ...(schedule.dueDate ? { dueDate: date } : {}),
    };
  const startDay = localDateKey(new Date(schedule.startAt), timezone);
  const endDay = localDateKey(new Date(schedule.endAt), timezone);
  const result = {
    type: "fixed" as const,
    startAt: moveStartToDate(schedule.startAt, date, timezone),
    endAt: moveStartToDate(
      schedule.endAt,
      shiftDate(date, dateDistance(startDay, endDay)),
      timezone,
    ),
  };
  // Nonexistent local times shift forward; never emit a zero/negative session.
  if (result.endAt <= result.startAt)
    result.endAt = result.startAt + schedule.endAt - schedule.startAt;
  return result;
}
export async function startSeries(
  ctx: MutationCtx,
  task: Doc<"tasks">,
  previous?: Doc<"tasks">,
) {
  if (!task.recurrence) return;
  const anchor =
    task.schedule.type === "fixed"
      ? localDateKey(new Date(task.schedule.startAt), task.timezone)
      : (task.schedule.dueDate ?? localDateKey(new Date(), task.timezone));
  const lineageRootId =
    previous?.recurrenceRootId ?? task.recurrenceRootId ?? task._id;
  const seriesId = await ctx.db.insert("taskSeries", {
    lineageRootId,
    previousSeriesId: previous?.seriesId,
    previousRootId: previous ? lineageRootId : undefined,
    ownerId: task.ownerId,
    rootTaskId: task._id,
    active: true,
    anchor,
    nextOrdinal: 2,
    template: {
      title: task.title,
      description: task.description,
      priority: task.priority,
      domainId: task.domainId,
      schedule: task.schedule,
      timezone: task.timezone,
      estimatedMinutes: task.estimatedMinutes,
      recurrence: task.recurrence,
      multiDay: task.multiDay,
      allowOverlap: task.allowOverlap,
      subtasks: await subtaskSnapshot(ctx, task),
    },
  });
  await ctx.db.patch(task._id, {
    seriesId,
    recurrenceRootId: lineageRootId,
    recurrenceManaged: true,
    recurrenceOrdinal: 1,
  });
  await ctx.scheduler.runAfter(0, internal.series.generate, { seriesId });
}
export const generate = internalMutation({
  args: { seriesId: v.id("taskSeries") },
  returns: v.null(),
  handler: async (ctx, { seriesId }) => {
    const series = await ctx.db.get(seriesId);
    if (!series?.active || !series.template.recurrence) return null;
    const template = series.template,
      rule = template.recurrence!;
    const today = localDateKey(new Date(), template.timezone);
    const horizon = shiftDate(
      today > series.anchor ? today : series.anchor,
      30,
    );
    let ordinal = series.nextOrdinal;
    for (let count = 0; count < 20; count++) {
      const date = occurrenceDate(series.anchor, rule, ordinal);
      if (date > "9999-12-31" || !recurrenceAllows(rule, ordinal, date)) {
        await ctx.db.patch(seriesId, { active: false, nextOrdinal: ordinal });
        return null;
      }
      if (date > horizon) {
        await ctx.db.patch(seriesId, { nextOrdinal: ordinal });
        return null;
      }
      const requestId = `series:${seriesId}:${ordinal}`;
      const existing = await ctx.db
        .query("tasks")
        .withIndex("by_ownerId_and_requestId", (q) =>
          q.eq("ownerId", series.ownerId).eq("requestId", requestId),
        )
        .unique();
      const completedSeries = series.previousSeriesId
        ? await ctx.db
            .query("tasks")
            .withIndex("by_seriesId_and_workDate_and_status", (q) =>
              q
                .eq("seriesId", series.previousSeriesId)
                .eq("workDate", date)
                .eq("status", "completed"),
            )
            .first()
        : null;
      const completedLegacy = series.previousRootId
        ? await ctx.db
            .query("tasks")
            .withIndex("by_recurrenceRootId_and_workDate_and_status", (q) =>
              q
                .eq("recurrenceRootId", series.previousRootId)
                .eq("workDate", date)
                .eq("status", "completed"),
            )
            .first()
        : null;
      const alreadyCompleted = !!(completedSeries || completedLegacy);
      if (!existing && !alreadyCompleted) {
        const domain = template.domainId
          ? await ctx.db.get(template.domainId)
          : null;
        const delta = dateDistance(series.anchor, date);
        const id = await ctx.db.insert("tasks", {
          ...template,
          domainId: domain?.ownerId === series.ownerId ? domain._id : undefined,
          schedule: occurrenceSchedule(template, date),
          subtasks: template.subtasks.map((step, index) => ({
            id: requestId + "-" + index,
            title: step.title,
            ...(step.dueDate
              ? { dueDate: shiftDate(step.dueDate, delta) }
              : {}),
            ...(step.scheduledDate
              ? { scheduledDate: shiftDate(step.scheduledDate, delta) }
              : {}),
          })),
          ownerId: series.ownerId,
          requestId,
          status: "open",
          workDate: date,
          seriesId,
          recurrenceManaged: true,
          recurrenceRootId: series.lineageRootId ?? series.rootTaskId,
          recurrenceOrdinal: ordinal,
          recurrenceAnchorDate: series.anchor,
        });
        const task = await ctx.db.get(id);
        if (task) await normalizeSubtasks(ctx, task);
        await recordActivity(
          ctx,
          id,
          null,
          "task_created",
          "Recurring session created.",
        );
      }
      ordinal++;
    }
    await ctx.db.patch(seriesId, { nextOrdinal: ordinal });
    await ctx.scheduler.runAfter(0, internal.series.generate, { seriesId });
    return null;
  },
});
export const extend = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("taskSeries")
      .withIndex("by_active", (q) => q.eq("active", true))
      .paginate({ cursor: cursor ?? null, numItems: 25 });
    for (const series of page.page)
      await ctx.scheduler.runAfter(0, internal.series.generate, {
        seriesId: series._id,
      });
    if (!page.isDone)
      await ctx.scheduler.runAfter(0, internal.series.extend, {
        cursor: page.continueCursor,
      });
    return null;
  },
});
/** Superseded future sessions stay available for audit; completed history is untouched. */
export const retire = internalMutation({
  args: {
    seriesId: v.id("taskSeries"),
    from: v.number(),
    except: v.id("tasks"),
    cursor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("tasks")
      .withIndex("by_seriesId_and_recurrenceOrdinal", (q) =>
        q.eq("seriesId", args.seriesId).gte("recurrenceOrdinal", args.from),
      )
      .paginate({ cursor: args.cursor ?? null, numItems: 50 });
    for (const task of page.page)
      if (task._id !== args.except && task.status !== "completed")
        await ctx.db.patch(task._id, { recurrenceCancelled: true });
    if (!page.isDone)
      await ctx.scheduler.runAfter(0, internal.series.retire, {
        ...args,
        cursor: page.continueCursor,
      });
    return null;
  },
});
export async function updateSeries(
  ctx: MutationCtx,
  previous: Doc<"tasks">,
  scope: "this" | "future",
) {
  if (scope === "this") {
    if (!previous.recurrence) {
      const updated = await ctx.db.get(previous._id);
      if (updated) await startSeries(ctx, updated);
    }
    return;
  }
  if (!previous.seriesId && previous.nextOccurrenceId)
    await ctx.scheduler.runAfter(0, internal.series.retireLegacy, {
      id: previous.nextOccurrenceId,
      ownerId: previous.ownerId,
    });
  if (previous.seriesId) {
    await ctx.db.patch(previous.seriesId, { active: false });
    await ctx.scheduler.runAfter(0, internal.series.retire, {
      seriesId: previous.seriesId,
      from: previous.recurrenceOrdinal ?? 1,
      except: previous._id,
    });
  }
  const updated = await ctx.db.get(previous._id);
  if (updated) {
    await ctx.db.patch(updated._id, { recurrenceManaged: true });
    await startSeries(ctx, updated, previous);
  }
}

export const retireLegacy = internalMutation({
  args: { id: v.id("tasks"), ownerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, ownerId }) => {
    const task = await ctx.db.get(id);
    if (!task || task.ownerId !== ownerId) return null;
    if (task.status !== "completed")
      await ctx.db.patch(id, {
        recurrenceCancelled: true,
        recurrenceManaged: true,
      });
    if (task.nextOccurrenceId)
      await ctx.scheduler.runAfter(0, internal.series.retireLegacy, {
        id: task.nextOccurrenceId,
        ownerId,
      });
    return null;
  },
});
