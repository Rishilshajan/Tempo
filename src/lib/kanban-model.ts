import { localDateKey } from "./validation/task";
import { dayWindow, isCarried, belongsToDay } from "./today-model";
import { shiftDate } from "./validation/recurrence";
import type { TaskRecord } from "@/components/tasks/task-list";

export type Lane = "planned" | "progress" | "carried" | "completed";
export function taskLane(task: TaskRecord, now = Date.now()): Lane {
  if (task.status === "completed") return "completed";
  const today = localDateKey(new Date(now), task.timezone);
  if (isCarried(task, dayWindow(today, task.timezone, now))) return "carried";
  return task.progress === "in_progress" ? "progress" : "planned";
}
export function taskDate(task: TaskRecord) {
  return task.schedule.type === "fixed"
    ? localDateKey(new Date(task.schedule.startAt), task.timezone)
    : task.schedule.dueDate;
}
export type BoardFilters = {
  domain: string;
  priority: string;
  date: string;
  from: string;
  to: string;
  sort: string;
  dueDate?: string;
};
export function filterTasks(
  tasks: TaskRecord[],
  filter: BoardFilters,
  now = Date.now(),
) {
  return tasks
    .filter((task) => {
      if (filter.domain && task.domainId !== filter.domain) return false;
      if (filter.priority !== "all" && task.priority !== filter.priority)
        return false;
      if (
        filter.dueDate &&
        (task.schedule.type !== "flexible" ||
          task.schedule.dueDate !== filter.dueDate)
      )
        return false;
      const today = localDateKey(new Date(now), task.timezone);
      const date = taskDate(task);
      if (filter.date === "all") return true;
      if (filter.date === "today")
        return belongsToDay(task, dayWindow(today, task.timezone, now));
      if (filter.date === "tomorrow")
        return belongsToDay(
          task,
          dayWindow(shiftDate(today, 1), task.timezone, now),
        );
      if (filter.date === "overdue")
        return (
          task.status === "open" &&
          (task.schedule.type === "fixed"
            ? task.schedule.endAt < now
            : !!date && date < today)
        );
      if (filter.date === "custom")
        return (
          !!filter.from &&
          belongsToDay(task, dayWindow(filter.from, task.timezone, now))
        );
      let from = filter.from,
        to = filter.to;
      if (filter.date === "week" || filter.date === "next_week") {
        const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
        from = shiftDate(
          today,
          -((weekday + 6) % 7) + (filter.date === "next_week" ? 7 : 0),
        );
        to = shiftDate(from, 6);
      }
      if (!from || !to || to < from) return false;
      if (task.schedule.type === "fixed")
        return (
          task.schedule.startAt < dayWindow(to, task.timezone, now).end &&
          task.schedule.endAt > dayWindow(from, task.timezone, now).start
        );
      return !!date && date >= from && date <= to;
    })
    .sort((a, b) => {
      let result = 0;
      const priority = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (filter.sort === "priority")
        result = priority[a.priority] - priority[b.priority];
      if (filter.sort === "due")
        result = (
          a.schedule.type === "flexible"
            ? (a.schedule.dueDate ?? "9999")
            : "9999"
        ).localeCompare(
          b.schedule.type === "flexible"
            ? (b.schedule.dueDate ?? "9999")
            : "9999",
        );
      if (filter.sort === "scheduled")
        result =
          (a.schedule.type === "fixed" ? a.schedule.startAt : Infinity) -
          (b.schedule.type === "fixed" ? b.schedule.startAt : Infinity);
      if (filter.sort === "created") result = b._creationTime - a._creationTime;
      if (filter.sort === "updated")
        result =
          (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime);
      return (
        (Number.isFinite(result) ? result : 0) ||
        (a.boardPosition ?? a._creationTime) -
          (b.boardPosition ?? b._creationTime) ||
        String(a._id).localeCompare(String(b._id))
      );
    });
}
