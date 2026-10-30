import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { taskView } from "./taskFields";
import { toTaskView } from "./taskViews";
import { calendarDateSchema } from "../src/lib/validation/task";
import { belongsToDay, dayWindow } from "../src/lib/today-model";

function checkedWindow(date: string, timezone: string, now: number) {
  if (!calendarDateSchema.safeParse(date).success)
    throw new ConvexError("Choose a valid date.");
  try {
    return dayWindow(date, timezone, now);
  } catch {
    throw new ConvexError("Choose a valid timezone.");
  }
}

export const feed = query({
  args: {
    date: v.string(),
    timezone: v.string(),
    kind: v.union(
      v.literal("open"),
      v.literal("dated"),
      v.literal("fixed"),
      v.literal("completed"),
    ),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(taskView),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to view your day.");
    const day = checkedWindow(args.date, args.timezone, 0);
    const owner = user.tokenIdentifier;
    const options = {
      ...args.paginationOpts,
      numItems: Math.min(args.paginationOpts.numItems, 50),
    };
    let result;
    if (args.kind === "open")
      result = await ctx.db
        .query("tasks")
        .withIndex("by_ownerId_and_status_and_workDate", (q) =>
          q
            .eq("ownerId", owner)
            .eq("status", "open")
            .lte("workDate", args.date),
        )
        .paginate(options);
    else if (args.kind === "dated")
      result = await ctx.db
        .query("tasks")
        .withIndex("by_ownerId_and_workDate", (q) =>
          q.eq("ownerId", owner).eq("workDate", args.date),
        )
        .paginate(options);
    else if (args.kind === "fixed")
      result = await ctx.db
        .query("tasks")
        .withIndex("by_ownerId_and_schedule_type_and_schedule_endAt", (q) =>
          q
            .eq("ownerId", owner)
            .eq("schedule.type", "fixed")
            .gt("schedule.endAt", day.start),
        )
        .paginate(options);
    else
      result = await ctx.db
        .query("tasks")
        .withIndex("by_ownerId_and_completedAt", (q) =>
          q
            .eq("ownerId", owner)
            .gte("completedAt", day.start)
            .lt("completedAt", day.end),
        )
        .paginate(options);
    // Two-dimensional interval overlap: filter only this bounded index page.
    // Future fixed blocks are never sent to the browser as today's blocks.
    const records =
      args.kind === "fixed"
        ? result.page.filter(
            (task) =>
              task.schedule.type === "fixed" && task.schedule.startAt < day.end,
          )
        : result.page;
    return {
      ...result,
      page: await Promise.all(records.map((task) => toTaskView(ctx, task))),
    };
  },
});

export const focus = query({
  args: { date: v.string(), timezone: v.string(), today: v.string() },
  returns: v.union(v.null(), taskView),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to view your focus.");
    const day = checkedWindow(args.date, args.timezone, 0);
    day.today = args.today;
    const selection = await ctx.db
      .query("dailyFocus")
      .withIndex("by_ownerId_and_date", (q) =>
        q.eq("ownerId", user.tokenIdentifier).eq("date", args.date),
      )
      .unique();
    const task = selection ? await ctx.db.get(selection.taskId) : null;
    return task &&
      task.ownerId === user.tokenIdentifier &&
      task.status === "open" &&
      belongsToDay(task, day)
      ? await toTaskView(ctx, task)
      : null;
  },
});

export const setFocus = mutation({
  args: {
    date: v.string(),
    timezone: v.string(),
    taskId: v.union(v.id("tasks"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to choose your focus.");
    const day = checkedWindow(args.date, args.timezone, Date.now());
    if (args.date < day.today)
      throw new ConvexError("Choose today or a future date.");
    if (args.taskId) {
      const task = await ctx.db.get(args.taskId);
      if (
        !task ||
        task.ownerId !== user.tokenIdentifier ||
        task.status !== "open" ||
        !belongsToDay(task, day)
      )
        throw new ConvexError("Choose an open task from this day.");
    }
    const existing = await ctx.db
      .query("dailyFocus")
      .withIndex("by_ownerId_and_date", (q) =>
        q.eq("ownerId", user.tokenIdentifier).eq("date", args.date),
      )
      .unique();
    if (args.taskId) {
      if (existing) await ctx.db.patch(existing._id, { taskId: args.taskId });
      else
        await ctx.db.insert("dailyFocus", {
          ownerId: user.tokenIdentifier,
          date: args.date,
          taskId: args.taskId,
        });
    } else if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});
