import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { rollForwardPatch } from "../src/lib/roll-forward";
import { recordActivity } from "./taskDetailHelpers";

// Cursor follows the stable status index: updating workDate cannot skip rows.
export const processBatch = internalMutation({
  args: { cursor: v.optional(v.string()), runAt: v.optional(v.number()) },
  returns: v.object({
    examined: v.number(),
    rolled: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = args.runAt ?? Date.now();
    const result = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .paginate({ cursor: args.cursor ?? null, numItems: 100 });
    let rolled = 0;
    for (const task of result.page) {
      let patch;
      try {
        patch = rollForwardPatch(task, now);
      } catch {
        console.error("Invalid roll-forward date/timezone for task", task._id);
        continue;
      }
      if (!patch) continue;
      await ctx.db.patch(task._id, patch);
      await recordActivity(
        ctx,
        task._id,
        null,
        "rolled_forward",
        `Rolled forward from ${task.workDate} to ${patch.workDate} (×${patch.rollForwardCount}).`,
        {
          beforeScheduledDate: task.workDate,
          afterScheduledDate: patch.workDate,
        },
      );
      rolled++;
    }
    if (!result.isDone)
      await ctx.scheduler.runAfter(0, internal.rollForward.processBatch, {
        cursor: result.continueCursor,
        runAt: now,
      });
    return { examined: result.page.length, rolled, done: result.isDone };
  },
});
