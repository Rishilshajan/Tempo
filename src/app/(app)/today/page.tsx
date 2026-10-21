import { EmptyState } from "@/components/app/empty-state";
import { TaskSurface } from "@/components/tasks/task-surface";
import { BriefingPanel } from "@/components/tasks/briefing-panel";
import {
  getTasks,
  getDomains,
  getAppSettings,
  getTaskDashboardSummary,
  getTaskNoteCounts,
  getDatedSubtasks,
  todayISO,
} from "@/server/queries";
import { buildBriefing } from "@/server/briefing";

export default async function TodayPage() {
  const today = todayISO();
  const [todays, domains, settings, summary, noteCounts, datedSubtasks] = await Promise.all([
    getTasks({ date: today }),
    getDomains(),
    getAppSettings(),
    getTaskDashboardSummary(),
    getTaskNoteCounts(),
    getDatedSubtasks(today, today),
  ]);

  if (summary.all === 0) return <EmptyState domains={domains} />;

  const briefing = buildBriefing(todays, {
    productivityWindow: settings.productivityWindow,
  });

  return (
    <div>
      <BriefingPanel briefing={briefing} />
      <TaskSurface
        tasks={todays}
        domains={domains}
        title="Today"
        initialView="list"
        noteCounts={noteCounts}
        datedSubtasks={datedSubtasks}
      />
    </div>
  );
}
