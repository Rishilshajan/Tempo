import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { subtaskSnapshot } from "./taskDetailHelpers";

export async function toTaskView(
  ctx: Pick<QueryCtx, "db">,
  task: Doc<"tasks">,
) {
  const domain = task.domainId ? await ctx.db.get(task.domainId) : null;
  const { ownerId, requestId, ...view } = task;
  void requestId;
  return {
    ...view,
    subtasks: await subtaskSnapshot(ctx, task),
    domain:
      domain && domain.ownerId === ownerId
        ? { name: domain.name, color: domain.color, icon: domain.icon }
        : null,
  };
}
