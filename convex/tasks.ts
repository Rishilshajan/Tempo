import { startSeries } from "./series";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  taskInputFields,
  subtaskInput,
  taskView,
  taskSchedule,
} from "./taskFields";
import { toTaskView } from "./taskViews";
import { domainView } from "./domainFields";
import { createNextOccurrence } from "./taskRecurrence";
import { normalizeSubtasks, recordActivity } from "./taskDetailHelpers";
import {
  calendarDateSchema,
  createTaskSchema,
  localDateKey,
} from "../src/lib/validation/task";

export const searchWorkspace = query({
  args: { term: v.string() },
  returns: v.object({
    tasks: v.array(v.object({ id: v.id("tasks"), title: v.string() })),
    domains: v.array(domainView),
  }),
  handler: async (ctx, { term }) => {
    const user = await ctx.auth.getUserIdentity();
    const search = term.trim().slice(0, 100);
    if (!user || !search) return { tasks: [], domains: [] };
    const ownerId = user.tokenIdentifier;
    const [tasks, domains] = await Promise.all([
      ctx.db.query("tasks").withSearchIndex("search_title", q =>
        q.search("title", search).eq("ownerId", ownerId)).take(30),
      ctx.db.query("domains").withSearchIndex("search_name", q =>
        q.search("name", search).eq("ownerId", ownerId)).take(10),
    ]);
    return {
      tasks: tasks.filter(task => !task.recurrenceCancelled).slice(0, 15)
        .map(({ _id, title }) => ({ id: _id, title })),
      domains: domains.map(({ _id, _creationTime, name, purpose, color, icon }) =>
        ({ _id, _creationTime, name, ...(purpose ? { purpose } : {}), color, icon })),
    };
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to delete a task.");
    const task = await ctx.db.get(id);
    if (!task) return null;
    if (task.ownerId !== user.tokenIdentifier)
      throw new ConvexError("This task is unavailable.");
    await ctx.db.delete(id);
    await ctx.scheduler.runAfter(0, internal.tasks.cleanupDeletedTask, { id });
    return null;
  },
});

export const cleanupDeletedTask = internalMutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const limit = 50;
    const [steps, notes, activity, links, focus] = await Promise.all([
      ctx.db.query("subtasks").withIndex("by_parentTaskId_and_position", (q) => q.eq("parentTaskId", id)).take(limit),
      ctx.db.query("notes").withIndex("by_taskId", (q) => q.eq("taskId", id)).take(limit),
      ctx.db.query("activity").withIndex("by_taskId_and_timestamp", (q) => q.eq("taskId", id)).take(limit),
      ctx.db.query("threadTasks").withIndex("by_taskId", (q) => q.eq("taskId", id)).take(limit),
      ctx.db.query("dailyFocus").withIndex("by_taskId", (q) => q.eq("taskId", id)).take(limit),
    ]);
    for (const row of [...steps, ...notes, ...activity, ...focus])
      await ctx.db.delete(row._id);
    for (const link of links) {
      const thread = await ctx.db.get(link.threadId);
      await ctx.db.delete(link._id);
      if (thread) await ctx.db.patch(thread._id, {
        taskCount: Math.max(0, thread.taskCount - 1),
        updatedAt: Date.now(),
      });
    }
    if ([steps, notes, activity, links, focus].some((rows) => rows.length === limit))
      await ctx.scheduler.runAfter(0, internal.tasks.cleanupDeletedTask, { id });
    return null;
  },
});

export const hasAny = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to view your tasks.");
    return !!(await ctx.db
      .query("tasks")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user.tokenIdentifier))
      .first());
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  returns: v.union(v.null(), taskView),
  handler: async (ctx, { id }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to view a task.");
    const task = await ctx.db.get(id);
    return task?.ownerId === user.tokenIdentifier && !task.recurrenceCancelled
      ? await toTaskView(ctx, task)
      : null;
  },
});

export const reschedule = mutation({
  args: { id: v.id("tasks"), schedule: taskSchedule },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to reschedule a task.");
    const task = await ctx.db.get(args.id);
    if (
      !task ||
      task.recurrenceCancelled ||
      task.ownerId !== user.tokenIdentifier
    )
      throw new ConvexError("This task is not available.");
    if (task.status === "completed")
      throw new ConvexError("Reopen this task before rescheduling it.");
    const parsed = createTaskSchema.safeParse({
      ...task,
      schedule: args.schedule,
      recurrence: undefined,
      subtasks: [],
      requestId: "00000000-0000-4000-8000-000000000000",
    });
    if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
    const workDate =
      args.schedule.type === "fixed"
        ? localDateKey(new Date(args.schedule.startAt), task.timezone)
        : (args.schedule.dueDate ??
          (task.recurrence ? localDateKey(new Date(), task.timezone) : ""));
    if (JSON.stringify(task.schedule) === JSON.stringify(args.schedule))
      return null;
    await ctx.db.patch(args.id, {
      schedule: args.schedule,
      workDate,
      lastRolledOn: undefined,
      continuedOn: undefined,
      updatedAt: Date.now(),
    });
    const dueChanged =
      task.schedule.type === "flexible" &&
      args.schedule.type === "flexible" &&
      task.schedule.dueDate !== args.schedule.dueDate;
    await recordActivity(
      ctx,
      task._id,
      user,
      dueChanged ? "due_date_changed" : "schedule_changed",
      dueChanged ? "Task due date updated." : "Task rescheduled.",
      { previousSchedule: task.schedule, schedule: args.schedule },
    );
    return null;
  },
});

export const list = query({
  args: {
    view: v.union(v.literal("today"), v.literal("all"), v.literal("domain")),
    today: v.string(),
    domainId: v.optional(v.id("domains")),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(taskView),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to view your tasks.");
    if (!calendarDateSchema.safeParse(args.today).success)
      throw new ConvexError("Invalid calendar date.");
    const ownerId = user.tokenIdentifier;
    const table = ctx.db.query("tasks");
    let rows;
    const options = {
      ...args.paginationOpts,
      numItems: Math.min(args.paginationOpts.numItems, 50),
    };
    if (args.view === "domain") {
      if (!args.domainId) throw new ConvexError("Choose a domain.");
      const domain = await ctx.db.get(args.domainId);
      if (!domain || domain.ownerId !== ownerId)
        throw new ConvexError("This domain is not available.");
      rows = await table
        .withIndex("by_ownerId_and_domainId", (q) =>
          q.eq("ownerId", ownerId).eq("domainId", args.domainId),
        )
        .order("desc")
        .paginate(options);
    } else if (args.view === "today") {
      rows = await table
        .withIndex("by_ownerId_and_status_and_workDate", (q) =>
          q
            .eq("ownerId", ownerId)
            .eq("status", "open")
            .lte("workDate", args.today),
        )
        .order("desc")
        .paginate(options);
    } else {
      rows = await table
        .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
        .order("desc")
        .paginate(options);
    }
    const page = await Promise.all(
      rows.page
        .filter((task) => !task.recurrenceCancelled)
        .map((task) => toTaskView(ctx, task)),
    );
    return { ...rows, page };
  },
});

export const create = mutation({
  args: {
    ...taskInputFields,
    subtasks: v.array(subtaskInput),
    requestId: v.string(),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to create a task.");
    const ownerId = user.tokenIdentifier;
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_ownerId_and_requestId", (q) =>
        q.eq("ownerId", ownerId).eq("requestId", args.requestId),
      )
      .unique();
    if (existing) return existing._id;
    const parsed = createTaskSchema.safeParse(args);
    if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
    if (args.domainId) {
      const domain = await ctx.db.get(args.domainId);
      if (!domain || domain.ownerId !== ownerId)
        throw new ConvexError(
          "Choose one of your available domains, or Uncategorized.",
        );
    }
    const data = parsed.data;
    const anchor =
      data.schedule.type === "fixed"
        ? localDateKey(new Date(data.schedule.startAt), data.timezone)
        : (data.schedule.dueDate ?? localDateKey(new Date(), data.timezone));
    if (
      data.recurrence?.end.type === "date" &&
      data.recurrence.end.date < anchor
    )
      throw new ConvexError(
        "Repeat end date must be on or after the first occurrence.",
      );
    const workDate = data.recurrence
      ? anchor
      : data.schedule.type === "fixed"
        ? localDateKey(new Date(data.schedule.startAt), data.timezone)
        : (data.schedule.dueDate ?? "");
    const id = await ctx.db.insert("tasks", {
      multiDay: data.multiDay,
      allowOverlap: data.allowOverlap,
      title: data.title,
      ...(data.description ? { description: data.description } : {}),
      ...(args.domainId ? { domainId: args.domainId } : {}),
      priority: data.priority,
      schedule: data.schedule,
      timezone: data.timezone,
      ...(data.estimatedMinutes
        ? { estimatedMinutes: data.estimatedMinutes }
        : {}),
      subtasks: data.subtasks.map((step, index) => ({
        ...step,
        id: `${data.requestId}-${index}`,
      })),
      workDate,
      status: "open",
      ownerId,
      requestId: data.requestId,
      ...(data.recurrence
        ? {
            recurrence: data.recurrence,
            recurrenceAnchorDate: anchor,
            recurrenceOrdinal: 1,
            recurrenceSlot: 1,
          }
        : {}),
      ...(data.recurrence && data.schedule.type === "fixed"
        ? { recurrenceStartAt: data.schedule.startAt }
        : {}),
    });
    const created = await ctx.db.get(id);
    if (created) await normalizeSubtasks(ctx, created);
    await recordActivity(ctx, id, user, "task_created", "Task created.");
    const seriesTask = await ctx.db.get(id);
    if (seriesTask?.recurrence) await startSeries(ctx, seriesTask);
    return id;
  },
});

export const setProgress = mutation({
  args: {
    id: v.id("tasks"),
    progress: v.union(v.literal("not_started"), v.literal("in_progress")),
  },
  returns: v.null(),
  handler: applyTaskProgress,
});

export const setCompleted = mutation({
  args: {
    id: v.id("tasks"),
    completed: v.boolean(),
    subtaskId: v.optional(v.string()),
  },
  returns: v.union(v.null(), v.id("tasks")),
  handler: applyTaskCompleted,
});

export async function applyTaskProgress(
  ctx: MutationCtx,
  {
    id,
    progress,
  }: { id: Id<"tasks">; progress: "not_started" | "in_progress" },
) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new ConvexError("Please sign in to update a task.");
  const task = await ctx.db.get(id);
  if (
    !task ||
    task.recurrenceCancelled ||
    task.ownerId !== user.tokenIdentifier
  )
    throw new ConvexError("This task is not available.");
  if (task.status === "open" && (task.progress ?? "not_started") === progress)
    return null;
  await ctx.db.patch(id, {
    progress,
    status: "open",
    completedAt: undefined,
    updatedAt: Date.now(),
  });
  await recordActivity(
    ctx,
    id,
    user,
    task.status === "completed" ? "task_reopened" : "status_changed",
    progress === "in_progress"
      ? "Status changed to In progress."
      : "Status changed to Not started.",
    {
      before:
        task.status === "completed"
          ? "completed"
          : (task.progress ?? "not_started"),
      after: progress,
    },
  );
  return null;
}

export async function applyTaskCompleted(
  ctx: MutationCtx,
  args: { id: Id<"tasks">; completed: boolean; subtaskId?: string },
) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new ConvexError("Please sign in to update a task.");
  const task = await ctx.db.get(args.id);
  if (
    !task ||
    task.recurrenceCancelled ||
    task.ownerId !== user.tokenIdentifier
  )
    throw new ConvexError("This task is not available.");
  if (args.subtaskId) {
    const rows = await normalizeSubtasks(ctx, task);
    const step = rows.find(
      (row) =>
        String(row._id) === args.subtaskId || row.legacyId === args.subtaskId,
    );
    if (!step) throw new ConvexError("This step is not available.");
    if ((step.completedAt !== undefined) === args.completed) return null;
    await ctx.db.patch(step._id, {
      completedAt: args.completed ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(task._id, { updatedAt: Date.now() });
    await recordActivity(
      ctx,
      task._id,
      user,
      args.completed ? "subtask_completed" : "subtask_reopened",
      `Subtask ${args.completed ? "completed" : "reopened"}: ${step.title}`,
      { subtaskId: step._id },
    );
  } else {
    if ((task.status === "completed") === args.completed) return null;
    await ctx.db.patch(args.id, {
      status: args.completed ? "completed" : "open",
      completedAt: args.completed ? Date.now() : undefined,
      ...(!args.completed ? { progress: "not_started" as const } : {}),
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      task._id,
      user,
      args.completed ? "task_completed" : "task_reopened",
      args.completed ? "Task completed." : "Task reopened.",
    );
    if (args.completed && task.status !== "completed")
      return (await createNextOccurrence(ctx, task)) ?? null;
  }
  return null;
}
