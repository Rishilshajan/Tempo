import { ConvexError, type Infer } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { activityMetadata, activityType } from "./taskDetailFields";

type Identity = NonNullable<
  Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>
>;
export async function ownedTask(
  ctx: Pick<QueryCtx, "db" | "auth">,
  id: Id<"tasks">,
) {
  const user = await ctx.auth.getUserIdentity();
  if (!user)
    throw new ConvexError("Please sign in to view or update this task.");
  const task = await ctx.db.get(id);
  if (!task || task.ownerId !== user.tokenIdentifier)
    throw new ConvexError("This task is not available.");
  return { task, user };
}

export async function subtaskRows(
  ctx: Pick<QueryCtx, "db">,
  taskId: Id<"tasks">,
) {
  const rows = await ctx.db
    .query("subtasks")
    .withIndex("by_parentTaskId_and_position", (q) =>
      q.eq("parentTaskId", taskId),
    )
    .take(31);
  if (rows.length > 30)
    throw new ConvexError("This task has too many subtasks.");
  return rows;
}

export async function subtaskSnapshot(
  ctx: Pick<QueryCtx, "db">,
  task: Doc<"tasks">,
) {
  if (!task.subtasksNormalized) return task.subtasks;
  return (await subtaskRows(ctx, task._id)).map((row) => ({
    id: String(row._id),
    title: row.title,
    ...(row.dueDate ? { dueDate: row.dueDate } : {}),
    ...(row.scheduledDate ? { scheduledDate: row.scheduledDate } : {}),
    ...(row.completedAt !== undefined ? { completedAt: row.completedAt } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function normalizeSubtasks(ctx: MutationCtx, task: Doc<"tasks">) {
  if (!task.subtasksNormalized) {
    for (const [position, step] of task.subtasks.entries()) {
      await ctx.db.insert("subtasks", {
        parentTaskId: task._id,
        title: step.title,
        position,
        requestId: `legacy:${step.id}`,
        legacyId: step.id,
        createdAt: step.createdAt ?? task._creationTime,
        updatedAt: step.updatedAt ?? task._creationTime,
        ...(step.dueDate ? { dueDate: step.dueDate } : {}),
        ...(step.scheduledDate ? { scheduledDate: step.scheduledDate } : {}),
        ...(step.completedAt !== undefined
          ? { completedAt: step.completedAt }
          : {}),
      });
    }
    await ctx.db.patch(task._id, { subtasks: [], subtasksNormalized: true });
  }
  return subtaskRows(ctx, task._id);
}

export async function recordActivity(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
  user: Identity | null,
  eventType: Infer<typeof activityType>,
  description: string,
  metadata?: Infer<typeof activityMetadata>,
) {
  await ctx.db.insert("activity", {
    taskId,
    eventType,
    description,
    timestamp: Date.now(),
    ...(user
      ? {
          actorId: user.subject ?? user.tokenIdentifier,
          ...(user.name ? { actorName: user.name } : {}),
        }
      : {}),
    ...(metadata ? { metadata } : {}),
  });
}
