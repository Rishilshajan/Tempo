// Event-driven reminder wakes. The hourly cron repairs due jobs, not task scans.
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { addReminder, localTime } from "./notificationDelivery";
import { taskReminderPlan, nextOwnerWake } from "./notificationPlan";
import { subtaskSnapshot } from "./taskDetailHelpers";

export const backgroundJobsEnabled = () => process.env.TEMPO_BACKGROUND_JOBS_ENABLED === "true";
const wakeRef = makeFunctionReference<"mutation", { id: Id<"notificationSchedules">; revision: number }>("notificationScheduling:wake");
const rebuildRef = makeFunctionReference<"mutation", { ownerId: string; cursor?: string }>("notificationScheduling:rebuildOwner");
const bootstrapRef = makeFunctionReference<"mutation", { force?: boolean; cursor?: string }>("notificationScheduling:bootstrapOwners");
const reconcileRef = makeFunctionReference<"mutation", Record<string, never>>("notificationScheduling:reconcile");
const account = (ctx: MutationCtx, ownerId: string) => ctx.db.query("notificationAccounts")
  .withIndex("by_owner", q => q.eq("ownerId", ownerId)).unique();
const schedule = (ctx: MutationCtx, key: string) => ctx.db.query("notificationSchedules")
  .withIndex("by_key", q => q.eq("key", key)).unique();

async function arm(ctx: MutationCtx, row: Doc<"notificationSchedules">, at?: number) {
  const revision = row.revision + 1;
  await ctx.db.patch(row._id, { revision, nextRunAt: at });
  if (at !== undefined) await ctx.scheduler.runAfter(Math.max(0, at - Date.now()), wakeRef, { id: row._id, revision });
}
async function queue(ctx: MutationCtx, key: string, ownerId: string, taskId?: Id<"tasks">) {
  const previous = await schedule(ctx, key);
  const now = Date.now();
  if (previous) {
    await ctx.db.patch(previous._id, { generation: previous.generation + 1 });
    await arm(ctx, previous, now);
  } else {
    const id = await ctx.db.insert("notificationSchedules", {
      key, ownerId, ...(taskId ? { taskId } : {}), kind: taskId ? "task" : "owner",
      revision: 1, generation: 1, nextRunAt: now,
    });
    await ctx.scheduler.runAfter(0, wakeRef, { id, revision: 1 });
  }
}

/** Called once after a task/subtask mutation commits its final task state. */
export async function syncTaskNotifications(ctx: MutationCtx, taskId: Id<"tasks">, freshTask?: Doc<"tasks">) {
  if (!backgroundJobsEnabled()) return;
  const task = freshTask ?? await ctx.db.get(taskId);
  if (!task || task.status !== "open" || task.recurrenceCancelled) {
    const existing = await schedule(ctx, `task:${taskId}`);
    if (existing) {
      if (!task) await ctx.db.delete(existing._id);
      else await ctx.db.patch(existing._id, { generation: existing.generation + 1, revision: existing.revision + 1, nextRunAt: undefined });
    }
    return;
  }
  await queue(ctx, `task:${taskId}`, task.ownerId, taskId);
}

/** Roll-forward hooks call this once per affected owner, without rebuilding tasks. */
export async function syncOwnerDailyNotifications(ctx: MutationCtx, ownerId: string) {
  if (backgroundJobsEnabled()) await queue(ctx, `owner:${ownerId}`, ownerId);
}

/** Preferences/device changes invalidate jobs and rebuild only this owner's tasks. */
export async function syncOwnerNotifications(ctx: MutationCtx, ownerId: string) {
  if (!backgroundJobsEnabled()) return;
  const row = await account(ctx, ownerId);
  if (!row) return;
  await ctx.db.patch(row._id, { notificationScheduleVersion: 1 });
  await syncOwnerDailyNotifications(ctx, ownerId);
  await ctx.scheduler.runAfter(0, rebuildRef, { ownerId });
}

async function ownerReminders(ctx: MutationCtx, row: Doc<"notificationAccounts">, now: number, canPush: boolean) {
  const p = row.preferences;
  const { date, time, weekday } = localTime(now, p.timezone);
  const createdAt = Math.max(now, (row.clearedThrough ?? 0) + 1);
  let added = 0;
  const send = async (key: string, title: string, body: string, taskId?: Id<"tasks">) => {
    // Check once before reading briefing/carried task summaries on later refreshes.
    const prior = await ctx.db.query("notifications").withIndex("by_owner_key", q => q.eq("ownerId", row.ownerId).eq("key", key)).unique();
    if (!prior) added += await addReminder(ctx, row, { key, title, body, ...(taskId ? { taskId } : {}) }, now, canPush, createdAt, { preferences: JSON.stringify(p) });
  };
  if (p.briefing && p.briefingDays.includes(weekday) && time >= p.briefingTime) {
    const key = `briefing:${date}`;
    const prior = await ctx.db.query("notifications").withIndex("by_owner_key", q => q.eq("ownerId", row.ownerId).eq("key", key)).unique();
    if (!prior) {
      const planned = (await ctx.db.query("tasks").withIndex("by_ownerId_and_status_and_workDate", q => q.eq("ownerId", row.ownerId).eq("status", "open").eq("workDate", date)).take(6))
        .filter(task => !task.recurrenceCancelled);
      await send(key, "Daily briefing", planned.length ? planned.slice(0, 3).map(task => task.title).join(" · ") + (planned.length > 3 ? " · More in Today" : "") : "No open tasks planned for today.");
    }
  }
  if (p.rollForward) {
    const key = `carried:${date}`;
    const prior = await ctx.db.query("notifications").withIndex("by_owner_key", q => q.eq("ownerId", row.ownerId).eq("key", key)).unique();
    if (!prior) {
      const carried = (await ctx.db.query("tasks").withIndex("by_ownerId_and_lastRolledOn", q => q.eq("ownerId", row.ownerId).eq("lastRolledOn", date)).take(31))
        .filter(task => task.status === "open" && !task.recurrenceCancelled);
      if (carried.length) await send(key, "Tasks rolled forward", carried.slice(0, 3).map(task => task.title).join(" · ") + (carried.length > 3 ? " · More in Today" : ""), carried.length === 1 ? carried[0]._id : undefined);
    }
  }
  return { added, createdAt };
}

export const wake = internalMutation({
  args: { id: v.id("notificationSchedules"), revision: v.number() }, returns: v.null(),
  handler: async (ctx, { id, revision }) => {
    if (!backgroundJobsEnabled()) return null;
    const job = await ctx.db.get(id);
    if (!job || job.revision !== revision) return null;
    const row = await account(ctx, job.ownerId);
    if (!row) { await ctx.db.delete(id); return null; }
    const now = Date.now();
    const p = row.preferences;
    const canPush = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) &&
      (await ctx.db.query("pushSubscriptions").withIndex("by_owner", q => q.eq("ownerId", job.ownerId)).take(1)).length > 0;
    if (!p.inApp && !canPush) { await arm(ctx, job); return null; }
    let added = 0;
    let nextAt: number | undefined;
    const createdAt = Math.max(now, (row.clearedThrough ?? 0) + 1);
    if (job.kind === "task") {
      const task = job.taskId ? await ctx.db.get(job.taskId) : null;
      if (!task || task.ownerId !== job.ownerId || task.status !== "open" || task.recurrenceCancelled) {
        if (!task) await ctx.db.delete(id);
        else await ctx.db.patch(id, { generation: job.generation + 1, revision: job.revision + 1, nextRunAt: undefined });
        return null;
      }
      const plan = taskReminderPlan(task, p.subtasks ? await subtaskSnapshot(ctx, task) : [], p, now);
      nextAt = plan.nextAt;
      for (const reminder of plan.reminders) added += await addReminder(ctx, row, reminder, now, canPush, createdAt,
        { generation: job.generation, preferences: JSON.stringify(p) });
    } else {
      added = (await ownerReminders(ctx, row, now, canPush)).added;
      nextAt = nextOwnerWake(p, now);
    }
    if (added) await ctx.db.patch(row._id, { unreadCount: (row.unreadCount ?? 0) + added, latestNotificationAt: createdAt });
    await arm(ctx, job, nextAt);
    return null;
  },
});

export const rebuildOwner = internalMutation({
  args: { ownerId: v.string(), cursor: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, { ownerId, cursor }) => {
    if (!backgroundJobsEnabled()) return null;
    const page = await ctx.db.query("tasks").withIndex("by_ownerId_and_status_and_workDate", q => q.eq("ownerId", ownerId).eq("status", "open"))
      .paginate({ cursor: cursor ?? null, numItems: 30 });
    for (const task of page.page) await syncTaskNotifications(ctx, task._id, task);
    if (!page.isDone) await ctx.scheduler.runAfter(0, rebuildRef, { ownerId, cursor: page.continueCursor });
    return null;
  },
});

/** Backfills existing accounts once; new accounts/preferences initialize directly. */
export const bootstrapOwners = internalMutation({
  args: { force: v.optional(v.boolean()), cursor: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, { force, cursor }) => {
    if (!backgroundJobsEnabled()) return null;
    // Explicit opt-in recovery after re-enabling a deployment. Normal hourly
    // recovery never scans initialized owners or all tasks again.
    if (force) {
      const page = await ctx.db.query("notificationAccounts").paginate({ cursor: cursor ?? null, numItems: 20 });
      for (const row of page.page) await syncOwnerNotifications(ctx, row.ownerId);
      if (!page.isDone) await ctx.scheduler.runAfter(0, bootstrapRef, { force, cursor: page.continueCursor });
      return null;
    }
    const rows = await ctx.db.query("notificationAccounts").withIndex("by_notificationScheduleVersion", q => q.eq("notificationScheduleVersion", undefined)).take(20);
    for (const row of rows) await syncOwnerNotifications(ctx, row.ownerId);
    if (rows.length === 20) await ctx.scheduler.runAfter(0, bootstrapRef, {});
    return null;
  },
});

export const reconcile = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    if (!backgroundJobsEnabled()) return null;
    await ctx.scheduler.runAfter(0, bootstrapRef, {});
    const now = Date.now();
    const jobs = await ctx.db.query("notificationSchedules").withIndex("by_nextRunAt", q => q.gte("nextRunAt", 0).lte("nextRunAt", now)).take(50);
    for (const job of jobs) {
      // Move the repair cursor ahead before scheduling to avoid repeatedly queuing
      // the same due page while another continuation is waiting to execute.
      await ctx.db.patch(job._id, { nextRunAt: now + 60_000 });
      await ctx.scheduler.runAfter(0, wakeRef, { id: job._id, revision: job.revision });
    }
    if (jobs.length === 50) await ctx.scheduler.runAfter(0, reconcileRef, {});
    return null;
  },
});

export const runMaintenance = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    if (backgroundJobsEnabled()) await ctx.scheduler.runAfter(0,
      makeFunctionReference<"mutation", Record<string, never>>("rollForward:processBatch"), {});
    return null;
  },
});
