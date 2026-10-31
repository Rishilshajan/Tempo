import type { TaskRecord } from "@/components/tasks/task-list";
import { belongsToDay, dayWindow } from "./today-model";
import { shiftDate } from "./validation/recurrence";

export function calendarWeek(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const monday = shiftDate(date, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}
export function calendarMonthWeeks(date: string) {
  const first = `${date.slice(0, 7)}-01`;
  const [year, month] = first.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const weeks: string[][] = [];
  for (
    let start = calendarWeek(first)[0];
    start <= last;
    start = shiftDate(start, 7)
  )
    weeks.push(calendarWeek(start));
  return weeks;
}

export function calendarTasks(
  tasks: TaskRecord[],
  date: string,
  timezone: string,
  now: number,
) {
  const day = dayWindow(date, timezone, now);
  return tasks
    .filter((task) => belongsToDay(task, day))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "completed" ? 1 : -1;
      const startA =
        a.schedule.type === "fixed" ? a.schedule.startAt : Infinity;
      const startB =
        b.schedule.type === "fixed" ? b.schedule.startAt : Infinity;
      return (
        (startA === startB ? 0 : startA < startB ? -1 : 1) ||
        a.title.localeCompare(b.title)
      );
    });
}
