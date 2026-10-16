import { EmptyState } from "@/components/app/empty-state";
import { TaskSurface } from "@/components/tasks/task-surface";
import {
  getTasks,
  getDomains,
  getTaskNoteCounts,
  todayISO,
} from "@/server/queries";

/** Add `days` to a YYYY-MM-DD string (UTC math, tz-safe). */
function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export default async function CalendarPage() {
  // Bound the calendar to a window around today so the fetch stays small
  // regardless of how many tasks exist overall.
  const today = todayISO();
  const [all, domains, noteCounts] = await Promise.all([
    getTasks({
      dateFrom: addDaysISO(today, -60),
      dateTo: addDaysISO(today, 180),
    }),
    getDomains(),
    getTaskNoteCounts(),
  ]);

  if (all.length === 0) return <EmptyState domains={domains} />;

  return (
    <TaskSurface
      tasks={all}
      domains={domains}
      title="Calendar"
      initialView="calendar"
      noteCounts={noteCounts}
    />
  );
}
