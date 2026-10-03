import { EmptyState } from "@/components/app/empty-state";
import { TaskSurface } from "@/components/tasks/task-surface";
import { getTasks, getDomains } from "@/server/queries";

export default async function MyTasksPage() {
  const [all, domains] = await Promise.all([getTasks(), getDomains()]);

  if (all.length === 0) return <EmptyState domains={domains} />;

  return (
    <TaskSurface
      tasks={all}
      domains={domains}
      title="My Tasks"
      initialView="list"
    />
  );
}
