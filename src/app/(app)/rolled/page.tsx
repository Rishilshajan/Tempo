import { EmptyState } from "@/components/app/empty-state";
import { TaskSurface } from "@/components/tasks/task-surface";
import { getTasks, getDomains, getTaskNoteCounts } from "@/server/queries";

const PAGE_SIZE = 30;

export default async function RolledPage() {
  const [rolled, domains, noteCounts] = await Promise.all([
    getTasks({ status: "rolled_forward", limit: PAGE_SIZE }),
    getDomains(),
    getTaskNoteCounts(),
  ]);

  if (rolled.length === 0)
    return (
      <EmptyState
        domains={domains}
        title="Nothing's rolled forward"
        description="Unfinished past-due tasks move here automatically each night. You're all caught up."
      />
    );

  return (
    <TaskSurface
      tasks={rolled}
      domains={domains}
      title="Rolled-Forward"
      initialView="list"
      boardColumns={["rolled_forward"]}
      noteCounts={noteCounts}
      paginate={{ filter: { status: "rolled_forward" }, pageSize: PAGE_SIZE }}
    />
  );
}
