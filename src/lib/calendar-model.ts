/**
 * TEMPO-004 - Pure date-grid and selected-day task calculations.
 * Used by: MyTasksCalendar. Shared consumers remain supported.
 * Code map: src/components/code-map.md.
 */
import type { TaskRecord } from "@/components/tasks/task-list";
import { belongsToDay, dayWindow } from "./today-model";
import { shiftDate } from "./validation/recurrence";

/**
 * TEMPO-004-F35 - calendarWeek
 * Purpose: Returns the seven date strings for a Monday-based week.
 * Used by: calendarMonthWeeks.
 * Trigger: The displayed month grid is constructed.
 */
export function calendarWeek(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const monday = shiftDate(date, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}
/**
 * TEMPO-004-F36 - calendarMonthWeeks
 * Purpose: Builds the weeks intersecting the displayed month.
 * Used by: MyTasksCalendar.
 * Trigger: The displayed month changes or the calendar recomputes.
 */
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

/**
 * TEMPO-004-F37 - calendarTasks
 * Purpose: Selects and orders tasks belonging to a date in the active timezone.
 * Used by: MyTasksCalendar; CalendarTaskDay.
 * Trigger: The selected date, calendar period or task data changes.
 */
export function calendarTasks(
  tasks: TaskRecord[],
  date: string,
  timezone: string,
  now: number,
) {
  const day = dayWindow(date, timezone, now);
  return tasks
    .filter((task) =>
      task.schedule.type === "fixed"
        ? task.schedule.startAt >= day.start && task.schedule.startAt < day.end
        : belongsToDay(task, day),
    )
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
