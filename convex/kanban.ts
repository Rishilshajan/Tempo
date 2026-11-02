import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { applyTaskCompleted, applyTaskProgress } from "./tasks";
import { recordActivity } from "./taskDetailHelpers";
import { localDateKey } from "../src/lib/validation/task";
import { dayWindow, isCarried } from "../src/lib/today-model";
import type { Doc } from "./_generated/dataModel";

const lane = v.union(
  v.literal("planned"),
  v.literal("progress"),
  v.literal("carried"),
  v.literal("completed"),
);
function column(task: Doc<"tasks">, now: number) {
  if (task.status === "completed") return "completed";
  const today = localDateKey(new Date(now), task.timezone);
  if (isCarried(task, dayWindow(today, task.timezone, now))) return "carried";
  return task.progress === "in_progress" ? "progress" : "planned";
}
export const move = mutation({
  args: {
    id: v.id("tasks"),
    from: lane,
    to: lane,
    beforeId: v.optional(v.id("tasks")),
    afterId: v.optional(v.id("tasks")),
    continueToday: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to move tasks.");
    const task = await ctx.db.get(args.id);
    if (
      !task ||
      task.recurrenceCancelled ||
      task.ownerId !== user.tokenIdentifier
    )
      throw new ConvexError("Task is unavailable.");
    const now = Date.now();
    if (column(task, now) !== args.from)
      throw new ConvexError("This task changed. Try moving it again.");
    if (args.to === "carried")
      throw new ConvexError("Rolled Forward is managed automatically.");
    if (task.domainId) {
      const domain = await ctx.db.get(task.domainId);
      if (domain && domain.ownerId !== user.tokenIdentifier)
        throw new ConvexError("Domain is unavailable.");
    }
    let before: number | undefined, after: number | undefined;
    for (const [key, id] of [
      ["before", args.beforeId],
      ["after", args.afterId],
    ] as const) {
      if (!id) continue;
      const neighbor = await ctx.db.get(id);
      if (
        id === args.id ||
        !neighbor ||
        neighbor.ownerId !== user.tokenIdentifier ||
        column(neighbor, now) !== args.to
      )
        throw new ConvexError("The board changed. Try again.");
      const position = neighbor.boardPosition ?? neighbor._creationTime;
      if (key === "before") before = position;
      else after = position;
    }
    if (before !== undefined && after !== undefined && before >= after)
      throw new ConvexError("The card order changed. Refresh and try again.");
    const position =
      before !== undefined && after !== undefined
        ? before + (after - before) / 2
        : before !== undefined
          ? before + 1024
          : after !== undefined
            ? after - 1024
            : now;
    if (!Number.isFinite(position) || position === before || position === after)
      throw new ConvexError(
        "These cards are too close to reorder. Choose a different position.",
      );
    if (args.to === "completed")
      await applyTaskCompleted(ctx, { id: task._id, completed: true });
    else
      await applyTaskProgress(ctx, {
        id: task._id,
        progress: args.to === "progress" ? "in_progress" : "not_started",
      });
    await ctx.db.patch(task._id, {
      boardPosition: position,
      updatedAt: now,
      ...(args.from === "carried" && args.to !== "completed"
        ? { continuedOn: localDateKey(new Date(now), task.timezone) }
        : {}),
    });
    if (args.from === args.to && task.boardPosition !== position)
      await recordActivity(
        ctx,
        task._id,
        user,
        "task_reordered",
        "Task reordered on the board.",
      );
    return null;
  },
});
