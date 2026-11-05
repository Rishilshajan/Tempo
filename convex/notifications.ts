import { ConvexError, v, type Infer } from "convex/values";
import { query, mutation, internalMutation, internalQuery, type QueryCtx, type MutationCtx } from "./_generated/server";
import { domainColor, domainIcon } from "./domainFields";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { DEFAULT_NOTIFICATION_PREFERENCES, notificationPreferences, pushPlatform, type NotificationPreferences } from "./notificationFields";
import { shiftDate, zonedTimestamp } from "../src/lib/validation/recurrence";
import { subtaskSnapshot } from "./taskDetailHelpers";

const minute = 60_000;
const owner = async (ctx: QueryCtx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier;
async function requireOwner(ctx: QueryCtx) {
  const id = await owner(ctx);
  if (!id) throw new ConvexError("Please sign in to manage notifications.");
  return id;
}
const account = (ctx: QueryCtx, ownerId: string) => ctx.db.query("notificationAccounts")
  .withIndex("by_owner", q => q.eq("ownerId", ownerId)).unique();
function validateZone(timezone: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }); }
  catch { throw new ConvexError("Choose a valid timezone."); }
}
export const preferences = query({
  args: {}, returns: notificationPreferences,
  handler: async ctx => {
    const ownerId = await owner(ctx);
    return (ownerId && (await account(ctx, ownerId))?.preferences) || DEFAULT_NOTIFICATION_PREFERENCES;
  },
});
export const ensurePreferences = mutation({
  args: { timezone: v.string() }, returns: v.null(),
  handler: async (ctx, { timezone }) => {
    const ownerId = await requireOwner(ctx);
    validateZone(timezone);
    if (!(await account(ctx, ownerId))) await ctx.db.insert("notificationAccounts", {
      ownerId, preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, timezone },
    });
    return null;
  },
});
export const savePreferences = mutation({
  args: { preferences: notificationPreferences }, returns: v.null(),
  handler: async (ctx, { preferences: value }) => {
    const ownerId = await requireOwner(ctx);
    validateZone(value.timezone);
    const validInts = (a: number[], min: number, max: number, length: number) =>
      a.length <= length && new Set(a).size === a.length && a.every(x => Number.isInteger(x) && x >= min && x <= max);
    if (![value.briefingTime, value.quietStart, value.quietEnd].every(x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x)) ||
      !validInts(value.briefingDays, 0, 6, 7) || !validInts(value.quietDays, 0, 6, 7) ||
      !validInts(value.upcomingMinutes, 1, 1440, 8) || !validInts(value.deadlineMinutes, 1, 10080, 8)) {
      throw new ConvexError("Check the reminder timing and selected days.");
    }
    const row = await account(ctx, ownerId);
    if (row) await ctx.db.patch(row._id, { preferences: value });
    else await ctx.db.insert("notificationAccounts", { ownerId, preferences: value });
    return null;
  },
});
const inboxItem = v.object({
  _id: v.id("notifications"), title: v.string(), body: v.string(), taskId: v.optional(v.id("tasks")),
  createdAt: v.number(), read: v.boolean(),
  domain: v.optional(v.object({ name: v.string(), color: domainColor, icon: domainIcon })), estimatedMinutes: v.optional(v.number()),
});
export const inbox = query({
  args: {}, returns: v.object({ items: v.array(inboxItem), unreadCount: v.number() }),
  handler: async ctx => {
    const ownerId = await owner(ctx);
    if (!ownerId) return { items: [], unreadCount: 0 };
    const row = await account(ctx, ownerId);
    const items = await ctx.db.query("notifications")
      .withIndex("by_owner_visible_created", q => q.eq("ownerId", ownerId).eq("visible", true).gt("createdAt", row?.clearedThrough ?? 0))
      .order("desc").take(50);
    const enriched = await Promise.all(items.map(async ({ _id, title, body, taskId, createdAt, read }): Promise<Infer<typeof inboxItem>> => {
      const item = { _id, title, body, createdAt, read };
      const task = taskId ? await ctx.db.get(taskId) : null;
      if (!task || task.ownerId !== ownerId) return item;

      const domain = task.domainId ? await ctx.db.get(task.domainId) : null;
      return {
        ...item,
        taskId: task._id,
        ...(domain?.ownerId === ownerId ? { domain: { name: domain.name, color: domain.color, icon: domain.icon } } : {}),
        ...(task.estimatedMinutes !== undefined ? { estimatedMinutes: task.estimatedMinutes } : {}),
      };
    }));
    return { items: enriched, unreadCount: row?.unreadCount ?? 0 };
  },
});
async function updateInbox(ctx: MutationCtx, id: Doc<"notifications">["_id"], dismiss: boolean) {
  const ownerId = await requireOwner(ctx);
  const item = await ctx.db.get(id);
  if (!item || item.ownerId !== ownerId) throw new ConvexError("Notification not available.");
  const row = await account(ctx, ownerId);
  if (!item.visible || item.createdAt <= (row?.clearedThrough ?? 0)) return null;
  await ctx.db.patch(id, { read: true, ...(dismiss ? { visible: false } : {}) });
  if (!item.read && row) await ctx.db.patch(row._id, { unreadCount: Math.max(0, (row.unreadCount ?? 0) - 1) });
  return null;
}
export const markRead = mutation({
  args: { id: v.id("notifications") }, returns: v.null(),
  handler: (ctx, { id }) => updateInbox(ctx, id, false),
});
export const dismiss = mutation({
  args: { id: v.id("notifications") }, returns: v.null(),
  handler: (ctx, { id }) => updateInbox(ctx, id, true),
});
export const clearAll = mutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    const row = await account(ctx, await requireOwner(ctx));
    if (row) await ctx.db.patch(row._id, {
      clearedThrough: Math.max(Date.now(), row.latestNotificationAt ?? 0, row.clearedThrough ?? 0), unreadCount: 0,
    });
    return null;
  },
});

const subscription = { endpoint: v.string(), p256dh: v.string(), auth: v.string(), platform: pushPlatform };
const isPushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
const byEndpoint = (ctx: QueryCtx, endpoint: string) => ctx.db.query("pushSubscriptions")
  .withIndex("by_endpoint", q => q.eq("endpoint", endpoint)).unique();
const devices = (ctx: QueryCtx, ownerId: string) => ctx.db.query("pushSubscriptions")
  .withIndex("by_owner", q => q.eq("ownerId", ownerId)).take(20);
function validateSubscription(endpoint: string, p256dh: string, auth: string) {
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new ConvexError("Invalid push subscription."); }
  const host = url.hostname;
  if (endpoint.length > 2048 || url.protocol !== "https:" || url.port || url.username || url.password ||
    url.hash || !(host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" || host.endsWith(".notify.windows.com") || host.endsWith(".push.apple.com")) ||
    !/^[\w-]{87}=?$/.test(p256dh) || !/^[\w-]{22}(==)?$/.test(auth)) {
    throw new ConvexError("Unsupported push subscription.");
  }
}
export const registerPush = mutation({
  args: subscription, returns: v.null(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    validateSubscription(args.endpoint, args.p256dh, args.auth);
    const prior = await byEndpoint(ctx, args.endpoint);
    if (prior && prior.ownerId !== ownerId && (prior.p256dh !== args.p256dh || prior.auth !== args.auth)) {
      throw new ConvexError("This device subscription is already registered.");
    }
    if ((!prior || prior.ownerId !== ownerId) && (await devices(ctx, ownerId)).length >= 20) {
      throw new ConvexError("Remove a device before enabling another.");
    }
    if (prior) await ctx.db.patch(prior._id, { ...args, ownerId });
    else await ctx.db.insert("pushSubscriptions", { ...args, ownerId });
    return null;
  },
});
export const unregisterPush = mutation({
  args: { endpoint: v.string() }, returns: v.null(),
  handler: async (ctx, { endpoint }) => {
    const ownerId = await requireOwner(ctx);
    const prior = await byEndpoint(ctx, endpoint);
    if (prior?.ownerId === ownerId) await ctx.db.delete(prior._id);
    return null;
  },
});
export const pushDevices = query({
  args: {}, returns: v.array(v.object({ endpoint: v.string(), platform: pushPlatform })),
  handler: async ctx => {
    const ownerId = await owner(ctx);
    return ownerId ? (await devices(ctx, ownerId)).map(({ endpoint, platform }) => ({ endpoint, platform })) : [];
  },
});
export const pushReady = query({
  args: {}, returns: v.boolean(),
  handler: async ctx => Boolean(await owner(ctx)) && isPushConfigured(),
});
export const deliveryDevices = internalQuery({
  args: { ownerId: v.string(), digestSettings: v.optional(v.string()) },
  returns: v.array(v.object(subscription)),
  handler: async (ctx, { ownerId, digestSettings }) => {
    if (digestSettings !== undefined) {
      const row = await account(ctx, ownerId);
      if (!row || quietSettings(row.preferences) !== digestSettings) return [];
    }
    return (await devices(ctx, ownerId)).map(({ endpoint, p256dh, auth, platform }) => ({ endpoint, p256dh, auth, platform }));
  },
});
export const expirePush = internalMutation({
  args: { ownerId: v.string(), endpoint: v.string(), auth: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const prior = await byEndpoint(ctx, args.endpoint);
    if (prior?.ownerId === args.ownerId && prior.auth === args.auth) await ctx.db.delete(prior._id);
    return null;
  },
});

function localTime(now: number, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(x => [x.type, x.value]));
  const date = [parts.year, parts.month, parts.day].join("-");
  return { date, time: [parts.hour, parts.minute].join(":"), weekday: new Date(date).getUTCDay() };
}
function quietWindow(p: NotificationPreferences, now: number) {
  if (!p.quietEnabled || p.quietStart === p.quietEnd) return null;
  const { date, time, weekday } = localTime(now, p.timezone);
  const overnight = p.quietStart > p.quietEnd;
  const active = p.quietDays.includes(overnight && time < p.quietEnd ? (weekday + 6) % 7 : weekday);
  if (!active || !(overnight ? time >= p.quietStart || time < p.quietEnd : time >= p.quietStart && time < p.quietEnd)) return null;
  const endDate = overnight && time >= p.quietStart ? shiftDate(date, 1) : date;
  return { endDate, endTime: p.quietEnd };
}
function quietSettings(p: NotificationPreferences) {
  return JSON.stringify([p.quietEnabled, p.quietPolicy, p.timezone, p.quietStart, p.quietEnd, [...p.quietDays].sort()]);
}

type Reminder = { key: string; title: string; body: string; taskId?: Doc<"tasks">["_id"] };
async function addReminder(ctx: MutationCtx, row: Doc<"notificationAccounts">, reminder: Reminder, now: number, canPush: boolean, createdAt: number) {
  const { ownerId, preferences: p } = row;
  if (await ctx.db.query("notifications").withIndex("by_owner_key", q => q.eq("ownerId", ownerId).eq("key", reminder.key)).unique()) return 0;
  await ctx.db.insert("notifications", {
    ...reminder, ownerId, createdAt, visible: p.inApp, read: false,
  });
  if (canPush) {
    const quiet = quietWindow(p, now);
    if (!quiet) await ctx.scheduler.runAfter(0, internal.notificationPush.send, {
      ownerId, title: reminder.title, body: reminder.body, key: reminder.key,
      ...(reminder.taskId ? { taskId: reminder.taskId } : {}),
    });
    else if (p.quietPolicy === "digest") {
      const digestSettings = quietSettings(p);
      const key = ["digest", quiet.endDate, digestSettings].join(":");
      if (!(await ctx.db.query("notifications").withIndex("by_owner_key", q => q.eq("ownerId", ownerId).eq("key", key)).unique())) {
        await ctx.db.insert("notifications", {
          ownerId, key, title: "Tempo reminders", body: "", createdAt: Date.now(), visible: false, read: true,
        });
        const end = zonedTimestamp(quiet.endDate, quiet.endTime, p.timezone);
        await ctx.scheduler.runAt(Math.max(now + minute, end ?? now + 60 * minute), internal.notificationPush.send, {
          ownerId, title: "Tempo reminders", body: "You have reminders from quiet hours.", key,
          digestSettings,
        });
      }
    }
  }
  return p.inApp ? 1 : 0;
}

export const processBatch = internalMutation({
  args: { cursor: v.optional(v.string()), now: v.optional(v.number()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const page = await ctx.db.query("notificationAccounts").paginate({ cursor: args.cursor ?? null, numItems: 50 });
    for (const row of page.page) await ctx.scheduler.runAfter(0, internal.notifications.processOwner, { ownerId: row.ownerId, now });
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.notifications.processBatch, { cursor: page.continueCursor, now });
    return null;
  },
});
export const processOwner = internalMutation({
  args: { ownerId: v.string(), now: v.number(), cursor: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, { ownerId, now, cursor }) => {
    const row = await account(ctx, ownerId);
    if (!row) return null;
    const p = row.preferences;
    const canPush = isPushConfigured() && (await devices(ctx, ownerId)).length > 0;
    if (!p.inApp && !canPush) return null;
    if (!p.briefing && !p.rollForward && !p.upcoming && !p.deadlines && !p.overdue && !p.recurring && !p.subtasks) return null;
    const { date, time, weekday } = localTime(now, p.timezone);
    let added = 0;
    const createdAt = Math.max(Date.now(), (row.clearedThrough ?? 0) + 1);
    const add = async (r: Reminder) => { added += await addReminder(ctx, row, r, now, canPush, createdAt); };
    if (!cursor && p.briefing && p.briefingDays.includes(weekday) && time >= p.briefingTime) {
      const planned = (await ctx.db.query("tasks").withIndex("by_ownerId_and_status_and_workDate",
        q => q.eq("ownerId", ownerId).eq("status", "open").eq("workDate", date)).take(6))
        .filter(task => !task.recurrenceCancelled);
      await add({ key: ["briefing", date].join(":"), title: "Daily briefing",
        body: planned.length ? planned.slice(0, 3).map(task => task.title).join(" · ") + (planned.length > 3 ? " · More in Today" : "") : "No open tasks planned for today." });
    }
    if (!cursor && p.rollForward) {
      const carried = (await ctx.db.query("tasks").withIndex("by_ownerId_and_lastRolledOn",
        q => q.eq("ownerId", ownerId).eq("lastRolledOn", date)).take(31))
        .filter(task => task.status === "open" && !task.recurrenceCancelled);
      if (carried.length) await add({
        key: ["carried", date].join(":"), title: "Tasks rolled forward",
        body: carried.length === 1 ? carried[0].title : "Open Today to review your carried tasks.",
      });
    }
    const page = await ctx.db.query("tasks").withIndex("by_ownerId_and_status_and_workDate", q => q.eq("ownerId", ownerId).eq("status", "open"))
      .paginate({ cursor: cursor ?? null, numItems: 30 });
    for (const task of page.page) {
      if (task.recurrenceCancelled) continue;
      const taskId = task._id;
      const alert = async (key: string, title: string, body: string) => add({ key: [taskId, key].join(":"), title, body, taskId });
      const scheduled = task.schedule;
      const taskDate = task.timezone === p.timezone ? date : localTime(now, task.timezone).date;
      // When a task is created inside several reminder windows, send only the
      // most relevant lead. Earlier leads still send on time for existing tasks.
      const activeLead = (at: number, leads: number[]) =>
        now < at ? [...leads].sort((a, b) => a - b).find(lead => now >= at - lead * minute) : undefined;
      if (p.upcoming && scheduled.type === "fixed") {
        const lead = activeLead(scheduled.startAt, p.upcomingMinutes);
        if (lead !== undefined) {
          await alert(["upcoming", scheduled.startAt, lead].join(":"), "Upcoming task", task.title);
        }
      }
      const dueDate = scheduled.type === "flexible" ? scheduled.dueDate : undefined;
      const dueAt = dueDate ? zonedTimestamp(shiftDate(dueDate, 1), "00:00", task.timezone) : undefined;
      if (dueAt != null && p.deadlines) {
        const lead = activeLead(dueAt, p.deadlineMinutes);
        if (lead !== undefined) {
          await alert(["deadline", dueAt, lead].join(":"), "Deadline approaching", task.title);
        }
      }
      if (p.overdue && dueAt != null && dueAt <= now) await alert(["overdue", taskDate].join(":"), "Overdue task", task.title);
      if (p.recurring && task.recurrence && task.workDate === taskDate) {
        await alert(["recurring", taskDate].join(":"), "Recurring task today", task.title);
      }
      if (p.subtasks) {
        for (const step of await subtaskSnapshot(ctx, task)) {
          if (step.completedAt === undefined && (step.scheduledDate ?? step.dueDate) === taskDate) {
            await alert(["step", step.id, taskDate].join(":"), "Subtask due today", step.title);
          }
        }
      }
    }
    if (added) await ctx.db.patch(row._id, { unreadCount: (row.unreadCount ?? 0) + added, latestNotificationAt: createdAt });
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.notifications.processOwner, { ownerId, now, cursor: page.continueCursor });
    return null;
  },
});
