// Shared reminder deduplication, inbox and quiet-hour push delivery.
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { NotificationPreferences } from "./notificationFields";
import { internal } from "./_generated/api";
import { shiftDate, zonedTimestamp } from "../src/lib/validation/recurrence";
const minute = 60_000;
export function localTime(now: number, timezone: string) {
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
export function quietSettings(p: NotificationPreferences) {
  return JSON.stringify([p.quietEnabled, p.quietPolicy, p.timezone, p.quietStart, p.quietEnd, [...p.quietDays].sort()]);
}

export type Reminder = { key: string; title: string; body: string; taskId?: Doc<"tasks">["_id"]; expiresAt?: number; pushBody?: string };
export async function addReminder(ctx: MutationCtx, row: Doc<"notificationAccounts">, reminder: Reminder, now: number, canPush: boolean, createdAt: number, guard?: { generation?: number; preferences: string }) {
  const { ownerId, preferences: p } = row;
  if (await ctx.db.query("notifications").withIndex("by_owner_key", q => q.eq("ownerId", ownerId).eq("key", reminder.key)).unique()) return 0;
  const { expiresAt, pushBody, ...entry } = reminder;
  await ctx.db.insert("notifications", {
    ...entry, ownerId, createdAt, visible: p.inApp, read: false,
  });
  if (canPush) {
    const quiet = quietWindow(p, now);
    if (!quiet) await ctx.scheduler.runAfter(0, internal.notificationPush.send, {
      ownerId, title: reminder.title, body: pushBody ?? reminder.body, key: reminder.key,
      ...(expiresAt === undefined ? {} : { expiresAt }),
      ...(reminder.taskId ? { taskId: reminder.taskId } : {}),
      ...(guard?.generation === undefined ? {} : { notificationGeneration: guard.generation }),
      ...(guard ? { notificationPreferences: guard.preferences } : {}),
    });
    else if (p.quietPolicy === "digest") {
      const digestSettings = quietSettings(p);
      const key = ["digest", quiet.endDate, digestSettings, ...(guard ? [guard.preferences] : [])].join(":");
      if (!(await ctx.db.query("notifications").withIndex("by_owner_key", q => q.eq("ownerId", ownerId).eq("key", key)).unique())) {
        await ctx.db.insert("notifications", {
          ownerId, key, title: "Tempo reminders", body: "", createdAt: Date.now(), visible: false, read: true,
        });
        const end = zonedTimestamp(quiet.endDate, quiet.endTime, p.timezone);
        await ctx.scheduler.runAt(Math.max(now + minute, end ?? now + 60 * minute), internal.notificationPush.send, {
          ownerId, title: "Tempo reminders", body: "You have reminders from quiet hours.", key,
          digestSettings,
          ...(guard ? { notificationPreferences: guard.preferences } : {}),
        });
      }
    }
  }
  return p.inApp ? 1 : 0;
}

