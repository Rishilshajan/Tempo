// Pure reminder planning: next wake-up only, never periodic scans of task tables.
import type { Doc } from "./_generated/dataModel";
import type { NotificationPreferences } from "./notificationFields";
import type { Reminder } from "./notificationDelivery";
import { localTime } from "./notificationDelivery";
import { shiftDate, zonedTimestamp } from "../src/lib/validation/recurrence";

const minute = 60_000;
type Step = { id: string; title: string; completedAt?: number; scheduledDate?: string; dueDate?: string };

export function taskReminderPlan(task: Doc<"tasks">, steps: Step[], p: NotificationPreferences, now: number) {
  const reminders: Reminder[] = [];
  const future: number[] = [];
  if (task.status !== "open" || task.recurrenceCancelled) return { reminders, nextAt: undefined };
  const { date } = localTime(now, task.timezone);
  const emit = (key: string, title: string, body: string, expiresAt?: number, pushBody?: string) => {
    reminders.push({ key: `${task._id}:${key}`, title, body, taskId: task._id,
      ...(expiresAt === undefined ? {} : { expiresAt }), ...(pushBody ? { pushBody } : {}) });
  };
  const leadReminder = (at: number, leads: number[], kind: string, title: string, pushBody: string) => {
    if (now >= at) return;
    const sorted = [...leads].sort((a, b) => a - b);
    const active = sorted.find(lead => now >= at - lead * minute);
    if (active !== undefined) emit([kind, at, active].join(":"), title, task.title, at, pushBody);
    for (const lead of sorted) if (at - lead * minute > now) future.push(at - lead * minute);
  };
  if (p.upcoming && task.schedule.type === "fixed") {
    const at = task.schedule.startAt;
    leadReminder(at, p.upcomingMinutes, "upcoming", "Upcoming task",
      `${task.title} · Starts at ${localTime(at, task.timezone).time}`);
  }
  const dueDate = task.schedule.type === "flexible" ? task.schedule.dueDate : undefined;
  const dueAt = dueDate ? zonedTimestamp(shiftDate(dueDate, 1), "00:00", task.timezone) : undefined;
  if (dueAt !== undefined && p.deadlines) {
    const dueLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: task.timezone }).format(dueAt - 1);
    leadReminder(dueAt, p.deadlineMinutes, "deadline", "Deadline approaching", `${task.title} · Due ${dueLabel}`);
  }
  if (p.overdue && dueAt !== undefined) {
    if (dueAt <= now) {
      emit(["overdue", date].join(":"), "Overdue task", task.title);
      future.push(zonedTimestamp(shiftDate(date, 1), "00:00", task.timezone));
    } else future.push(dueAt);
  }
  if (p.recurring && task.recurrence && task.workDate >= date) {
    if (task.workDate === date) emit(["recurring", date].join(":"), "Recurring task today", task.title);
    else future.push(zonedTimestamp(task.workDate, "00:00", task.timezone));
  }
  if (p.subtasks) for (const step of steps) {
    const target = step.scheduledDate ?? step.dueDate;
    if (step.completedAt !== undefined || !target || target < date) continue;
    if (target === date) emit(["step", step.id, date].join(":"), "Subtask due today", step.title);
    else future.push(zonedTimestamp(target, "00:00", task.timezone));
  }
  return { reminders, nextAt: future.filter(at => Number.isFinite(at) && at > now).sort((a, b) => a - b)[0] };
}

export function nextOwnerWake(p: NotificationPreferences, now: number) {
  const { date, time, weekday } = localTime(now, p.timezone);
  const times: number[] = [];
  // Daily roll-forward notifications inspect only the indexed rows rolled today.
  if (p.rollForward) times.push(zonedTimestamp(shiftDate(date, 1), "00:05", p.timezone));
  if (p.briefing) for (let offset = 0; offset <= 7; offset++) {
    if ((offset || time < p.briefingTime) && p.briefingDays.includes((weekday + offset) % 7)) {
      times.push(zonedTimestamp(shiftDate(date, offset), p.briefingTime, p.timezone));
      break;
    }
  }
  return times.filter(at => at > now).sort((a, b) => a - b)[0];
}
