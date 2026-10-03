import { EmptyState } from "@/components/app/empty-state";
import { TaskSurface } from "@/components/tasks/task-surface";
import { BriefingPanel } from "@/components/tasks/briefing-panel";
import { getTasks, getDomains, getAppSettings, todayISO } from "@/server/queries";
import { buildBriefing } from "@/server/briefing";

export default async function TodayPage() {
  const [all, domains, settings] = await Promise.all([
    getTasks(),
    getDomains(),
    getAppSettings(),
  ]);

  if (all.length === 0) return <EmptyState domains={domains} />;

  const today = todayISO();
  const todays = all.filter((t) => t.date === today);
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
      />
    </div>
  );
}
