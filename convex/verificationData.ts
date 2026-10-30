// Temporary verification tooling: callable by deployment admins only, never the browser API.
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { domainFields } from "./domainFields";
import { taskInputFields, subtaskInput } from "./taskFields";
import { createDomainSchema } from "../src/lib/validation/domain";
import { createTaskSchema, localDateKey } from "../src/lib/validation/task";
import { shiftDate } from "../src/lib/validation/recurrence";

const taskRef = v.object({ id: v.id("tasks"), requestId: v.string() });
const domainRef = v.object({ id: v.id("domains"), requestId: v.string() });

export const lookup = internalQuery({
  args: {
    ownerId: v.string(),
    taskRequests: v.array(v.string()),
    domainRequests: v.array(v.string()),
  },
  returns: v.object({ tasks: v.array(taskRef), domains: v.array(domainRef) }),
  handler: async (ctx, args) => {
    if (args.taskRequests.length > 30 || args.domainRequests.length > 4)
      throw new ConvexError("Invalid verification batch.");
    const owner = args.ownerId;
    if (!owner) throw new ConvexError("An account owner is required.");
    const tasks = [];
    const domains = [];
    for (const requestId of args.taskRequests) {
      const row = await ctx.db
        .query("tasks")
        .withIndex("by_ownerId_and_requestId", (q) =>
          q.eq("ownerId", owner).eq("requestId", requestId),
        )
        .unique();
      if (row) tasks.push({ id: row._id, requestId });
    }
    for (const requestId of args.domainRequests) {
      const row = await ctx.db
        .query("domains")
        .withIndex("by_ownerId_and_requestId", (q) =>
          q.eq("ownerId", owner).eq("requestId", requestId),
        )
        .unique();
      if (row) domains.push({ id: row._id, requestId });
    }
    return { tasks, domains };
  },
});

export const seed = internalMutation({
  args: {
    ownerId: v.string(),
    today: v.string(),
    tomorrow: v.string(),
    timezone: v.string(),
    domains: v.array(v.object({ ...domainFields, requestId: v.string() })),
    tasks: v.array(
      v.object({
        ...taskInputFields,
        requestId: v.string(),
        subtasks: v.array(subtaskInput),
        domainIndex: v.optional(v.number()),
        completed: v.optional(v.boolean()),
      }),
    ),
  },
  returns: v.object({ tasks: v.array(taskRef), domains: v.array(domainRef) }),
  handler: async (ctx, args) => {
    if (
      args.today !== localDateKey(new Date(), args.timezone) ||
      args.tomorrow !== shiftDate(args.today, 1)
    )
      throw new ConvexError(
        "Verification data must be for today and tomorrow only.",
      );
    if (args.domains.length > 4 || args.tasks.length > 30)
      throw new ConvexError("Keep the verification batch small.");
    const ownerId = args.ownerId;
    if (!ownerId) throw new ConvexError("An account owner is required.");
    const domains = [];
    for (const input of args.domains) {
      if (!input.name.startsWith("[Demo] "))
        throw new ConvexError("Sample domains must be clearly marked.");
      const parsed = createDomainSchema.safeParse(input);
      if (!parsed.success)
        throw new ConvexError(parsed.error.issues[0].message);
      const existing = await ctx.db
        .query("domains")
        .withIndex("by_ownerId_and_requestId", (q) =>
          q.eq("ownerId", ownerId).eq("requestId", input.requestId),
        )
        .unique();
      const id =
        existing?._id ??
        (await ctx.db.insert("domains", { ...parsed.data, ownerId }));
      domains.push({ id, requestId: input.requestId });
    }
    const tasks = [];
    for (const input of args.tasks) {
      if (!input.title.startsWith("[Demo] ") || input.recurrence)
        throw new ConvexError(
          "Use clearly marked, non-recurring sample tasks.",
        );
      const domain =
        input.domainIndex === undefined
          ? undefined
          : domains[input.domainIndex];
      if (
        input.domainIndex !== undefined &&
        (!Number.isInteger(input.domainIndex) || !domain)
      )
        throw new ConvexError("Invalid sample domain index.");
      const parsed = createTaskSchema.safeParse({
        ...input,
        domainId: domain?.id,
      });
      if (!parsed.success)
        throw new ConvexError(parsed.error.issues[0].message);
      const data = parsed.data;
      const workDate =
        data.schedule.type === "fixed"
          ? localDateKey(new Date(data.schedule.startAt), data.timezone)
          : data.schedule.dueDate;
      const endDate =
        data.schedule.type === "fixed"
          ? localDateKey(new Date(data.schedule.endAt - 1), data.timezone)
          : workDate;
      if (
        !workDate ||
        ![args.today, args.tomorrow].includes(workDate) ||
        !endDate ||
        ![args.today, args.tomorrow].includes(endDate) ||
        data.subtasks.some(
          (step) =>
            step.dueDate && ![args.today, args.tomorrow].includes(step.dueDate),
        )
      )
        throw new ConvexError(
          "Sample dates must stay within today and tomorrow.",
        );
      if (input.completed && workDate !== args.today)
        throw new ConvexError("Future samples cannot already be completed.");
      const existing = await ctx.db
        .query("tasks")
        .withIndex("by_ownerId_and_requestId", (q) =>
          q.eq("ownerId", ownerId).eq("requestId", input.requestId),
        )
        .unique();
      const id =
        existing?._id ??
        (await ctx.db.insert("tasks", {
          title: data.title,
          description: data.description,
          domainId: domain?.id,
          priority: data.priority,
          schedule: data.schedule,
          timezone: data.timezone,
          estimatedMinutes: data.estimatedMinutes,
          subtasks: data.subtasks.map((step, index) => ({
            ...step,
            id: `${data.requestId}-${index}`,
          })),
          ownerId,
          requestId: data.requestId,
          workDate,
          status: input.completed ? "completed" : "open",
          ...(input.completed ? { completedAt: Date.now() } : {}),
        }));
      tasks.push({ id, requestId: input.requestId });
    }
    // Respect an existing focus choice; fixtures must never overwrite it.
    for (const date of [args.today, args.tomorrow]) {
      const existing = await ctx.db
        .query("dailyFocus")
        .withIndex("by_ownerId_and_date", (q) =>
          q.eq("ownerId", ownerId).eq("date", date),
        )
        .unique();
      const index = args.tasks.findIndex(
        (task) =>
          !task.completed &&
          (task.schedule.type === "fixed"
            ? localDateKey(new Date(task.schedule.startAt), task.timezone)
            : task.schedule.dueDate) === date,
      );
      if (!existing && index >= 0)
        await ctx.db.insert("dailyFocus", {
          ownerId,
          date,
          taskId: tasks[index].id,
        });
    }
    return { tasks, domains };
  },
});

export const cleanup = internalMutation({
  args: {
    ownerId: v.string(),
    tasks: v.array(taskRef),
    domains: v.array(domainRef),
  },
  returns: v.object({
    deletedTasks: v.number(),
    deletedDomains: v.number(),
    retainedDomains: v.array(v.id("domains")),
  }),
  handler: async (ctx, args) => {
    if (args.tasks.length > 30 || args.domains.length > 4)
      throw new ConvexError("Invalid verification batch.");
    const ownerId = args.ownerId;
    if (!ownerId) throw new ConvexError("An account owner is required.");
    const ids = new Set(args.tasks.map((task) => task.id));
    const focus = await ctx.db
      .query("dailyFocus")
      .withIndex("by_ownerId_and_date", (q) => q.eq("ownerId", ownerId))
      .take(200);
    if (focus.length === 200)
      throw new ConvexError(
        "Review the account's focus history before cleaning this batch.",
      );
    let deletedTasks = 0,
      deletedDomains = 0;
    for (const ref of args.tasks) {
      const task = await ctx.db.get(ref.id);
      if (!task) continue;
      if (task.ownerId !== ownerId || task.requestId !== ref.requestId)
        throw new ConvexError(
          "This record does not match the sample manifest.",
        );
      await ctx.db.delete(ref.id);
      deletedTasks++;
    }
    for (const selection of focus) {
      if (ids.has(selection.taskId)) await ctx.db.delete(selection._id);
    }
    const retainedDomains = [];
    for (const ref of args.domains) {
      const domain = await ctx.db.get(ref.id);
      if (!domain) continue;
      if (domain.ownerId !== ownerId || domain.requestId !== ref.requestId)
        throw new ConvexError(
          "This domain does not match the sample manifest.",
        );
      const used = await ctx.db
        .query("tasks")
        .withIndex("by_ownerId_and_domainId", (q) =>
          q.eq("ownerId", ownerId).eq("domainId", ref.id),
        )
        .first();
      if (used) {
        retainedDomains.push(ref.id);
        continue;
      }
      await ctx.db.delete(ref.id);
      deletedDomains++;
    }
    return { deletedTasks, deletedDomains, retainedDomains };
  },
});
