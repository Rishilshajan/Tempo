import { EmptyState } from "@/components/app/empty-state";
import { TaskSurface } from "@/components/tasks/task-surface";
import { getTasks, getDomains, getTaskNoteCounts } from "@/server/queries";

const PAGE_SIZE = 30;

export default async function MyTasksPage() {
  const [all, domains, noteCounts] = await Promise.all([
    getTasks({ limit: PAGE_SIZE }),
    getDomains(),
    getTaskNoteCounts(),
  ]);

  if (all.length === 0) return <EmptyState domains={domains} />;

  return (
    <TaskSurface
      tasks={all}
      domains={domains}
      title="My Tasks"
      initialView="list"
      noteCounts={noteCounts}
      paginate={{ filter: {}, pageSize: PAGE_SIZE }}
    />
  );
}
