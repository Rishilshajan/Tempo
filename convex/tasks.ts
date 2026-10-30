import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  taskInputFields,
  subtaskInput,
  taskView,
  taskSchedule,
} from "./taskFields";
import { toTaskView } from "./taskViews";
import { createNextOccurrence } from "./taskRecurrence";
import {
  calendarDateSchema,
  createTaskSchema,
  localDateKey,
} from "../src/lib/validation/task";

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
    return task?.ownerId === user.tokenIdentifier
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
    if (!task || task.ownerId !== user.tokenIdentifier)
      throw new ConvexError("This task is not available.");
    if (task.status === "completed")
      throw new ConvexError("Reopen this task before rescheduling it.");
    const parsed = createTaskSchema.safeParse({
      ...task,
      schedule: args.schedule,
      subtasks: [],
      requestId: "00000000-0000-4000-8000-000000000000",
    });
    if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
    const workDate =
      args.schedule.type === "fixed"
        ? localDateKey(new Date(args.schedule.startAt), task.timezone)
        : (args.schedule.dueDate ??
          (task.recurrence ? localDateKey(new Date(), task.timezone) : ""));
    await ctx.db.patch(args.id, { schedule: args.schedule, workDate });
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
      rows.page.map((task) => toTaskView(ctx, task)),
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
    return await ctx.db.insert("tasks", {
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
  },
});

export const setProgress = mutation({
  args: {
    id: v.id("tasks"),
    progress: v.union(v.literal("not_started"), v.literal("in_progress")),
  },
  returns: v.null(),
  handler: async (ctx, { id, progress }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to update a task.");
    const task = await ctx.db.get(id);
    if (!task || task.ownerId !== user.tokenIdentifier)
      throw new ConvexError("This task is not available.");
    await ctx.db.patch(id, {
      progress,
      status: "open",
      completedAt: undefined,
    });
    return null;
  },
});

export const setCompleted = mutation({
  args: {
    id: v.id("tasks"),
    completed: v.boolean(),
    subtaskId: v.optional(v.string()),
  },
  returns: v.union(v.null(), v.id("tasks")),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to update a task.");
    const task = await ctx.db.get(args.id);
    if (!task || task.ownerId !== user.tokenIdentifier)
      throw new ConvexError("This task is not available.");
    if (args.subtaskId) {
      if (!task.subtasks.some((step) => step.id === args.subtaskId))
        throw new ConvexError("This step is not available.");
      await ctx.db.patch(args.id, {
        subtasks: task.subtasks.map((step) => {
          if (step.id !== args.subtaskId) return step;
          const rest = {
            id: step.id,
            title: step.title,
            ...(step.dueDate ? { dueDate: step.dueDate } : {}),
          };
          return args.completed ? { ...rest, completedAt: Date.now() } : rest;
        }),
      });
    } else {
      await ctx.db.patch(args.id, {
        status: args.completed ? "completed" : "open",
        completedAt: args.completed ? Date.now() : undefined,
        ...(!args.completed ? { progress: "not_started" as const } : {}),
      });
      if (args.completed && task.status !== "completed")
        return (await createNextOccurrence(ctx, task)) ?? null;
    }
    return null;
  },
});
