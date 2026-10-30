import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  dateDistance,
  moveStartToDate,
  occurrenceDate,
  recurrenceAllows,
  shiftDate,
} from "../src/lib/validation/recurrence";
import { calendarDateSchema, localDateKey } from "../src/lib/validation/task";

function nextEligibleSlot(task: Doc<"tasks">, anchor: string, now: number) {
  const rule = task.recurrence;
  if (!rule || !calendarDateSchema.safeParse(anchor).success) return null;
  const today = localDateKey(new Date(now), task.timezone);
  const offsets = task.subtasks.flatMap((step) =>
    step.dueDate ? [dateDistance(task.workDate || anchor, step.dueDate)] : [],
  );
  const minimumDate = shiftDate(today, -Math.min(0, ...offsets));
  const maximumDate = shiftDate("9999-12-31", -Math.max(0, ...offsets));
  if (
    !calendarDateSchema.safeParse(minimumDate).success ||
    minimumDate > maximumDate
  )
    return null;
  const [year, month] = anchor.split("-").map(Number);
  const [lastYear, lastMonth] = maximumDate.split("-").map(Number);
  const maximumOffset =
    rule.unit === "month"
      ? Math.floor(((lastYear - year) * 12 + lastMonth - month) / rule.interval)
      : Math.floor(
          dateDistance(anchor, maximumDate) /
            (rule.interval * (rule.unit === "week" ? 7 : 1)),
        );
  let low = (task.recurrenceSlot ?? task.recurrenceOrdinal ?? 1) + 1;
  let high = maximumOffset + 1;
  if (high >= low && occurrenceDate(anchor, rule, high) > maximumDate)
    high -= 1;
  if (low > high) return null;
  const originalStart =
    task.schedule.type === "fixed"
      ? (task.recurrenceStartAt ?? task.schedule.startAt)
      : null;
  const eligible = (slot: number) => {
    const date = occurrenceDate(anchor, rule, slot);
    if (date < minimumDate) return false;
    return (
      originalStart === null ||
      moveStartToDate(originalStart, date, task.timezone) >=
        Math.floor(now / 60000) * 60000
    );
  };
  if (!eligible(high)) return null;
  // Bounded logarithmic search, even when a task is completed years late.
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (eligible(middle)) high = middle;
    else low = middle + 1;
  }
  return { slot: low, date: occurrenceDate(anchor, rule, low) };
}

/** Called only after the public completion mutation verifies task ownership. */
export async function createNextOccurrence(
  ctx: MutationCtx,
  task: Doc<"tasks">,
) {
  if (!task.recurrence || task.nextOccurrenceId) return;
  const anchor = task.recurrenceAnchorDate ?? task.workDate;
  const ordinal = (task.recurrenceOrdinal ?? 1) + 1;
  if (
    task.recurrence.end.type === "count" &&
    ordinal > task.recurrence.end.count
  )
    return;
  const candidate = nextEligibleSlot(task, anchor, Date.now());
  if (!candidate) return;
  const nextDate = candidate.date;
  if (
    !calendarDateSchema.safeParse(nextDate).success ||
    !recurrenceAllows(task.recurrence, ordinal, nextDate)
  )
    return;
  const rootId = task.recurrenceRootId ?? task._id;
  const requestId = `repeat:${rootId}:${ordinal}`;
  const existing = await ctx.db
    .query("tasks")
    .withIndex("by_ownerId_and_requestId", (q) =>
      q.eq("ownerId", task.ownerId).eq("requestId", requestId),
    )
    .unique();
  if (existing) {
    await ctx.db.patch(task._id, { nextOccurrenceId: existing._id });
    return existing._id;
  }
  const shift = dateDistance(task.workDate || anchor, nextDate);
  const previousSchedule = task.schedule;
  const startAt =
    previousSchedule.type === "fixed"
      ? moveStartToDate(
          task.recurrenceStartAt ?? previousSchedule.startAt,
          nextDate,
          task.timezone,
        )
      : null;
  const schedule =
    previousSchedule.type === "fixed" && startAt !== null
      ? {
          type: "fixed" as const,
          startAt,
          endAt: startAt + previousSchedule.endAt - previousSchedule.startAt,
        }
      : {
          type: "flexible" as const,
          ...(previousSchedule.type === "flexible" && previousSchedule.dueDate
            ? { dueDate: nextDate }
            : {}),
        };
  const domain = task.domainId ? await ctx.db.get(task.domainId) : null;
  const nextId = await ctx.db.insert("tasks", {
    title: task.title,
    ...(task.description ? { description: task.description } : {}),
    ...(domain?.ownerId === task.ownerId ? { domainId: domain._id } : {}),
    priority: task.priority,
    timezone: task.timezone,
    schedule,
    ...(task.estimatedMinutes
      ? { estimatedMinutes: task.estimatedMinutes }
      : {}),
    subtasks: task.subtasks.map((step, index) => ({
      id: `${requestId}-${index}`,
      title: step.title,
      ...(step.dueDate ? { dueDate: shiftDate(step.dueDate, shift) } : {}),
    })),
    ownerId: task.ownerId,
    requestId,
    status: "open",
    workDate: nextDate,
    recurrence: task.recurrence,
    recurrenceAnchorDate: anchor,
    recurrenceOrdinal: ordinal,
    recurrenceSlot: candidate.slot,
    recurrenceRootId: rootId,
    ...(task.recurrenceStartAt !== undefined
      ? { recurrenceStartAt: task.recurrenceStartAt }
      : {}),
  });
  await ctx.db.patch(task._id, { nextOccurrenceId: nextId });
  return nextId;
}
