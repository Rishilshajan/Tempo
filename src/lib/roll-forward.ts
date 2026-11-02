import type { Doc } from "../../convex/_generated/dataModel";
import { localDateKey } from "./validation/task";
import { dateDistance } from "./validation/recurrence";

/** Preserve the original schedule, including overnight blocks and recurrence anchors. */
export function rollForwardPatch(task: Doc<"tasks">, now: number) {
  if (task.recurrenceCancelled || task.status !== "open" || !task.workDate)
    return null;
  const today = localDateKey(new Date(now), task.timezone);
  const lastOccupiedDate =
    task.schedule.type === "fixed"
      ? localDateKey(new Date(task.schedule.endAt - 1), task.timezone)
      : task.workDate;
  const from =
    task.workDate > lastOccupiedDate ? task.workDate : lastOccupiedDate;
  if (from >= today || (task.lastRolledOn && task.lastRolledOn >= today))
    return null;
  return {
    originalWorkDate: task.originalWorkDate ?? task.workDate,
    workDate: today,
    lastRolledOn: today,
    rollForwardCount: (task.rollForwardCount ?? 0) + dateDistance(from, today),
    updatedAt: now,
  };
}
