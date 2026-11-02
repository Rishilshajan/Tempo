import { updateSeries } from "./series";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  activityView,
  noteType,
  noteView,
  threadView,
} from "./taskDetailFields";
import { taskInputFields, taskView, subtaskInput } from "./taskFields";
import {
  normalizeSubtasks,
  ownedTask,
  recordActivity,
  subtaskRows,
  subtaskSnapshot,
} from "./taskDetailHelpers";
import { toTaskView } from "./taskViews";
import {
  noteSchema,
  subtaskDetailSchema,
  taskMetadataSchema,
  threadSchema,
} from "../src/lib/validation/task-details";
import {
  localDateKey,
  editTaskSchema,
  sameTaskValue,
} from "../src/lib/validation/task";

const pageSize = (opts: { numItems: number; cursor: string | null }) => ({
  ...opts,
  numItems: Math.min(30, Math.max(1, opts.numItems)),
});
const requestIdValid = (value: string) => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new ConvexError("Please retry this action.");
};
function validStep(
  input: { title: string; dueDate?: string; scheduledDate?: string },
  task: Doc<"tasks">,
  previous?: Doc<"subtasks">,
) {
  const parsed = subtaskDetailSchema.safeParse(input);
  if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
  const today = localDateKey(new Date(), task.timezone);
  for (const key of ["dueDate", "scheduledDate"] as const) {
    if (
      parsed.data[key] &&
      parsed.data[key] !== previous?.[key] &&
      parsed.data[key] < today
    )
      throw new ConvexError("Choose today or a future date for this subtask.");
  }
  return parsed.data;
}

export const updateMetadata = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
    description: v.optional(v.string()),
    priority: taskInputFields.priority,
    domainId: v.union(v.null(), v.id("domains")),
    estimatedMinutes: v.union(v.null(), v.number()),
  },
  returns: v.null(),
  handler: updateMetadataValues,
});
async function updateMetadataValues(
  ctx: MutationCtx,
  args: {
    id: Id<"tasks">;
    title: string;
    description?: string;
    priority: Doc<"tasks">["priority"];
    domainId: Id<"domains"> | null;
    estimatedMinutes: number | null;
  },
) {
  const { task, user } = await ownedTask(ctx, args.id);
  const parsed = taskMetadataSchema.safeParse(args);
  if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
  if (args.domainId) {
    const domain = await ctx.db.get(args.domainId);
    if (!domain || domain.ownerId !== user.tokenIdentifier)
      throw new ConvexError("Choose one of your own domains.");
  }
  const values = {
    title: parsed.data.title,
    description: parsed.data.description || undefined,
    priority: parsed.data.priority,
    domainId: args.domainId ?? undefined,
    estimatedMinutes: args.estimatedMinutes ?? undefined,
  };
  const changes = [
    ["title", "title_changed", "Task title updated."],
    ["description", "description_changed", "Task description updated."],
    ["priority", "priority_changed", "Task priority updated."],
    ["domainId", "domain_changed", "Task domain updated."],
    ["estimatedMinutes", "estimate_changed", "Task estimate updated."],
  ] as const;
  let changed = false;
  for (const [key, event, description] of changes) {
    if (task[key] === values[key]) continue;
    changed = true;
    await recordActivity(
      ctx,
      task._id,
      user,
      event,
      description,
      key === "domainId"
        ? {
            ...(task.domainId ? { previousDomainId: task.domainId } : {}),
            ...(args.domainId ? { domainId: args.domainId } : {}),
          }
        : {
            ...(task[key] !== undefined ? { before: String(task[key]) } : {}),
            ...(values[key] !== undefined
              ? { after: String(values[key]) }
              : {}),
          },
    );
  }
  if (changed)
    await ctx.db.patch(task._id, { ...values, updatedAt: Date.now() });
  return null;
}

export const updateTask = mutation({
  args: {
    editScope: v.optional(v.union(v.literal("this"), v.literal("future"))),
    id: v.id("tasks"),
    ...taskInputFields,
    subtasks: v.array(subtaskInput),
    stepKeys: v.array(v.string()),
    expectedStepIds: v.array(v.string()),
    requestId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { task, user } = await ownedTask(ctx, args.id);
    requestIdValid(args.requestId);
    if (task.lastEditRequestId === args.requestId) return null;
    const originalSteps = await subtaskSnapshot(ctx, task);
    const originalKeys = originalSteps.map((step) => step.id);
    if (
      args.stepKeys.length !== args.subtasks.length ||
      args.stepKeys.length > 30 ||
      args.stepKeys.some((key) => !key || key.length > 200) ||
      new Set(args.stepKeys).size !== args.stepKeys.length
    )
      throw new ConvexError(
        "Please reopen the editor and retry your subtask changes.",
      );
    if (
      args.expectedStepIds.length !== originalKeys.length ||
      originalKeys.some((key, index) => args.expectedStepIds[index] !== key)
    )
      throw new ConvexError(
        "Subtasks changed while you were editing. Reopen the editor to keep those changes.",
      );
    const parsed = editTaskSchema(
      { ...task, subtasks: originalSteps, requestId: args.requestId },
      args.stepKeys,
      originalKeys,
      args.editScope !== "future" && !!task.recurrence,
    ).safeParse(args);
    if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
    const data = parsed.data;
    const scheduleChanged =
      !sameTaskValue(task.schedule, data.schedule) ||
      task.timezone !== data.timezone;
    const recurrenceChanged = !sameTaskValue(task.recurrence, data.recurrence);
    if (task.status === "completed" && scheduleChanged)
      throw new ConvexError("Reopen this task before changing its schedule.");
    if (recurrenceChanged && task.recurrence && args.editScope !== "future")
      throw new ConvexError(
        "Choose This and future occurrences to change repeat settings.",
      );
    await updateMetadataValues(ctx, {
      id: task._id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      domainId: args.domainId ?? null,
      estimatedMinutes: data.estimatedMinutes ?? null,
    });
    const rows = await normalizeSubtasks(ctx, task);
    const retained = new Set<Id<"subtasks">>();
    for (const [position, input] of data.subtasks.entries()) {
      const key = args.stepKeys[position];
      const existing = rows.find(
        (row) => String(row._id) === key || row.legacyId === key,
      );
      if (existing) {
        retained.add(existing._id);
        if (
          existing.title !== input.title ||
          existing.dueDate !== input.dueDate ||
          existing.position !== position
        ) {
          await ctx.db.patch(existing._id, {
            title: input.title,
            dueDate: input.dueDate,
            position,
            updatedAt: Date.now(),
          });
          await recordActivity(
            ctx,
            task._id,
            user,
            "subtask_updated",
            `Subtask updated: ${input.title}`,
            {
              subtaskId: existing._id,
              before: existing.title,
              after: input.title,
            },
          );
        }
      } else {
        const id = await ctx.db.insert("subtasks", {
          ...input,
          parentTaskId: task._id,
          position,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          requestId: `edit:${args.requestId}:${key}`,
          legacyId: key,
        });
        retained.add(id);
        await recordActivity(
          ctx,
          task._id,
          user,
          "subtask_created",
          `Subtask added: ${input.title}`,
          { subtaskId: id },
        );
      }
    }
    for (const row of rows)
      if (!retained.has(row._id)) {
        await ctx.db.delete(row._id);
        await recordActivity(
          ctx,
          task._id,
          user,
          "subtask_deleted",
          `Subtask deleted: ${row.title}`,
          { subtaskId: row._id },
        );
      }
    const workDate =
      data.schedule.type === "fixed"
        ? localDateKey(new Date(data.schedule.startAt), data.timezone)
        : (data.schedule.dueDate ??
          (data.recurrence ? localDateKey(new Date(), data.timezone) : ""));
    await ctx.db.patch(task._id, {
      multiDay: data.multiDay,
      allowOverlap: data.allowOverlap,
      schedule: data.schedule,
      timezone: data.timezone,
      recurrence: data.recurrence,
      ...(scheduleChanged || recurrenceChanged
        ? { workDate, lastRolledOn: undefined, continuedOn: undefined }
        : {}),
      ...(recurrenceChanged
        ? {
            recurrenceAnchorDate: data.recurrence ? workDate : undefined,
            recurrenceOrdinal: data.recurrence ? 1 : undefined,
            recurrenceSlot: data.recurrence ? 1 : undefined,
            recurrenceRootId: undefined,
            recurrenceStartAt:
              data.recurrence && data.schedule.type === "fixed"
                ? data.schedule.startAt
                : undefined,
          }
        : {}),
      lastEditRequestId: args.requestId,
      updatedAt: Date.now(),
    });
    await updateSeries(ctx, task, args.editScope ?? "this");
    if (scheduleChanged)
      await recordActivity(
        ctx,
        task._id,
        user,
        "schedule_changed",
        "Task schedule updated.",
        { previousSchedule: task.schedule, schedule: data.schedule },
      );
    if (recurrenceChanged)
      await recordActivity(
        ctx,
        task._id,
        user,
        "schedule_changed",
        "Task repeat settings updated.",
      );
    return null;
  },
});

export const addSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
    dueDate: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    requestId: v.string(),
  },
  returns: v.id("subtasks"),
  handler: async (ctx, args) => {
    const { task, user } = await ownedTask(ctx, args.taskId);
    requestIdValid(args.requestId);
    const existing = await ctx.db
      .query("subtasks")
      .withIndex("by_parentTaskId_and_requestId", (q) =>
        q.eq("parentTaskId", task._id).eq("requestId", args.requestId),
      )
      .unique();
    if (existing) return existing._id;
    const data = validStep(args, task);
    const rows = await normalizeSubtasks(ctx, task);
    if (rows.length >= 30)
      throw new ConvexError("A task can have up to 30 subtasks.");
    const now = Date.now();
    const id = await ctx.db.insert("subtasks", {
      ...data,
      parentTaskId: task._id,
      position: rows.length,
      createdAt: now,
      updatedAt: now,
      requestId: args.requestId,
    });
    await ctx.db.patch(task._id, { updatedAt: now });
    await recordActivity(
      ctx,
      task._id,
      user,
      "subtask_created",
      `Subtask added: ${data.title}`,
      { subtaskId: id },
    );
    return id;
  },
});
export const updateSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskId: v.id("subtasks"),
    title: v.string(),
    dueDate: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { task, user } = await ownedTask(ctx, args.taskId);
    const step = await ctx.db.get(args.subtaskId);
    if (!step || step.parentTaskId !== task._id)
      throw new ConvexError("This subtask is not available.");
    const data = validStep(args, task, step);
    if (
      step.title === data.title &&
      step.dueDate === data.dueDate &&
      step.scheduledDate === data.scheduledDate
    )
      return null;
    await ctx.db.patch(step._id, {
      title: data.title,
      dueDate: data.dueDate,
      scheduledDate: data.scheduledDate,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(task._id, { updatedAt: Date.now() });
    await recordActivity(
      ctx,
      task._id,
      user,
      "subtask_updated",
      `Subtask updated: ${data.title}`,
      {
        subtaskId: step._id,
        before: step.title,
        after: data.title,
        ...(step.dueDate ? { beforeDueDate: step.dueDate } : {}),
        ...(data.dueDate ? { afterDueDate: data.dueDate } : {}),
        ...(step.scheduledDate
          ? { beforeScheduledDate: step.scheduledDate }
          : {}),
        ...(data.scheduledDate
          ? { afterScheduledDate: data.scheduledDate }
          : {}),
      },
    );
    return null;
  },
});
export const deleteSubtask = mutation({
  args: { taskId: v.id("tasks"), subtaskId: v.id("subtasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { task, user } = await ownedTask(ctx, args.taskId);
    const step = await ctx.db.get(args.subtaskId);
    if (!step) return null;
    if (step.parentTaskId !== task._id)
      throw new ConvexError("This subtask is not available.");
    await ctx.db.delete(step._id);
    const rows = await subtaskRows(ctx, task._id);
    for (const [position, row] of rows.entries())
      if (row.position !== position) await ctx.db.patch(row._id, { position });
    await ctx.db.patch(task._id, { updatedAt: Date.now() });
    await recordActivity(
      ctx,
      task._id,
      user,
      "subtask_deleted",
      `Subtask deleted: ${step.title}`,
      { subtaskId: step._id },
    );
    return null;
  },
});
export const moveSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskId: v.id("subtasks"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { task, user } = await ownedTask(ctx, args.taskId);
    const rows = await normalizeSubtasks(ctx, task);
    const index = rows.findIndex((row) => row._id === args.subtaskId);
    if (index < 0) throw new ConvexError("This subtask is not available.");
    const next = index + (args.direction === "up" ? -1 : 1);
    if (next < 0 || next >= rows.length) return null;
    await ctx.db.patch(rows[index]._id, {
      position: next,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(rows[next]._id, {
      position: index,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(task._id, { updatedAt: Date.now() });
    await recordActivity(
      ctx,
      task._id,
      user,
      "subtasks_reordered",
      `Subtask moved ${args.direction}: ${rows[index].title}`,
      { subtaskId: rows[index]._id },
    );
    return null;
  },
});

export const listNotes = query({
  args: { taskId: v.id("tasks"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(noteView),
  handler: async (ctx, args) => {
    await ownedTask(ctx, args.taskId);
    return ctx.db
      .query("notes")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .paginate(pageSize(args.paginationOpts));
  },
});
export const saveNote = mutation({
  args: {
    taskId: v.id("tasks"),
    noteId: v.optional(v.id("notes")),
    title: v.optional(v.string()),
    content: v.string(),
    type: noteType,
    requestId: v.string(),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const { task, user } = await ownedTask(ctx, args.taskId);
    requestIdValid(args.requestId);
    const parsed = noteSchema.safeParse(args);
    if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
    const data = { ...parsed.data, title: parsed.data.title || undefined };
    const now = Date.now();
    if (args.noteId) {
      const note = await ctx.db.get(args.noteId);
      if (!note || note.taskId !== task._id)
        throw new ConvexError("This note is not available.");
      if (
        note.title === data.title &&
        note.content === data.content &&
        note.type === data.type
      )
        return note._id;
      await ctx.db.patch(note._id, { ...data, updatedAt: now });
      await ctx.db.patch(task._id, { updatedAt: now });
      await recordActivity(
        ctx,
        task._id,
        user,
        "note_updated",
        `Note updated: ${data.title || "Untitled note"}`,
        { noteId: note._id },
      );
      return note._id;
    }
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_taskId_and_requestId", (q) =>
        q.eq("taskId", task._id).eq("requestId", args.requestId),
      )
      .unique();
    if (existing) return existing._id;
    const id = await ctx.db.insert("notes", {
      ...data,
      taskId: task._id,
      createdBy: user.subject ?? user.tokenIdentifier,
      createdAt: now,
      updatedAt: now,
      requestId: args.requestId,
    });
    await ctx.db.patch(task._id, {
      notesCount: (task.notesCount ?? 0) + 1,
      updatedAt: now,
    });
    await recordActivity(
      ctx,
      task._id,
      user,
      "note_created",
      `Note added: ${data.title || "Untitled note"}`,
      { noteId: id },
    );
    return id;
  },
});
export const deleteNote = mutation({
  args: { taskId: v.id("tasks"), noteId: v.id("notes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { task, user } = await ownedTask(ctx, args.taskId);
    const note = await ctx.db.get(args.noteId);
    if (!note) return null;
    if (note.taskId !== task._id)
      throw new ConvexError("This note is not available.");
    await ctx.db.delete(note._id);
    await ctx.db.patch(task._id, {
      notesCount: Math.max(0, (task.notesCount ?? 0) - 1),
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      task._id,
      user,
      "note_deleted",
      `Note deleted: ${note.title || "Untitled note"}`,
      { noteId: note._id },
    );
    return null;
  },
});
export const listActivity = query({
  args: { taskId: v.id("tasks"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(activityView),
  handler: async (ctx, args) => {
    await ownedTask(ctx, args.taskId);
    return ctx.db
      .query("activity")
      .withIndex("by_taskId_and_timestamp", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .paginate(pageSize(args.paginationOpts));
  },
});

async function ownedThread(
  ctx: Pick<QueryCtx, "auth" | "db">,
  threadId: Id<"threads">,
) {
  const user = await ctx.auth.getUserIdentity();
  const thread = await ctx.db.get(threadId);
  if (!user || !thread || thread.ownerId !== user.tokenIdentifier)
    throw new ConvexError("This thread is not available.");
  return { thread, user };
}
async function attachTask(
  ctx: MutationCtx,
  threadId: Id<"threads">,
  taskId: Id<"tasks">,
) {
  const { user } = await ownedTask(ctx, taskId);
  const { thread } = await ownedThread(ctx, threadId);
  const existing = await ctx.db
    .query("threadTasks")
    .withIndex("by_threadId_and_taskId", (q) =>
      q.eq("threadId", threadId).eq("taskId", taskId),
    )
    .unique();
  if (existing) return;
  const memberships = await ctx.db
    .query("threadTasks")
    .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
    .take(21);
  if (memberships.length >= 20)
    throw new ConvexError("A task can belong to up to 20 threads.");
  await ctx.db.insert("threadTasks", {
    threadId,
    taskId,
    addedAt: Date.now(),
    addedBy: user.subject ?? user.tokenIdentifier,
  });
  await ctx.db.patch(threadId, {
    taskCount: thread.taskCount + 1,
    updatedAt: Date.now(),
  });
  await ctx.db.patch(taskId, {
    threadCount: memberships.length + 1,
    updatedAt: Date.now(),
  });
  await recordActivity(
    ctx,
    taskId,
    user,
    "task_linked",
    `Task linked to thread: ${thread.name}`,
    { threadId },
  );
}
export const threadsForTask = query({
  args: { taskId: v.id("tasks") },
  returns: v.array(threadView),
  handler: async (ctx, args) => {
    const { user } = await ownedTask(ctx, args.taskId);
    const links = await ctx.db
      .query("threadTasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .take(21);
    if (links.length > 20)
      throw new ConvexError("This task has too many threads.");
    const threads = await Promise.all(
      links.map((link) => ctx.db.get(link.threadId)),
    );
    return threads.filter(
      (thread): thread is Doc<"threads"> =>
        !!thread && thread.ownerId === user.tokenIdentifier,
    );
  },
});
export const listThreads = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(threadView),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to view your threads.");
    return ctx.db
      .query("threads")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user.tokenIdentifier))
      .order("desc")
      .paginate(pageSize(args.paginationOpts));
  },
});
export const createThread = mutation({
  args: {
    taskId: v.id("tasks"),
    relatedTaskId: v.optional(v.id("tasks")),
    name: v.string(),
    description: v.optional(v.string()),
    requestId: v.string(),
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const { task, user } = await ownedTask(ctx, args.taskId);
    requestIdValid(args.requestId);
    const parsed = threadSchema.safeParse(args);
    if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
    const existing = await ctx.db
      .query("threads")
      .withIndex("by_ownerId_and_requestId", (q) =>
        q.eq("ownerId", user.tokenIdentifier).eq("requestId", args.requestId),
      )
      .unique();
    if (existing) return existing._id;
    const id = await ctx.db.insert("threads", {
      ...parsed.data,
      ownerId: user.tokenIdentifier,
      createdBy: user.subject ?? user.tokenIdentifier,
      requestId: args.requestId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      taskCount: 0,
    });
    await recordActivity(
      ctx,
      task._id,
      user,
      "thread_created",
      `Thread created: ${parsed.data.name}`,
      { threadId: id },
    );
    await attachTask(ctx, id, task._id);
    if (args.relatedTaskId && args.relatedTaskId !== task._id)
      await attachTask(ctx, id, args.relatedTaskId);
    return id;
  },
});
export const linkTask = mutation({
  args: { taskId: v.id("tasks"), threadId: v.id("threads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await attachTask(ctx, args.threadId, args.taskId);
    return null;
  },
});
export const unlinkTask = mutation({
  args: { taskId: v.id("tasks"), threadId: v.id("threads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { task, user } = await ownedTask(ctx, args.taskId);
    const { thread } = await ownedThread(ctx, args.threadId);
    const link = await ctx.db
      .query("threadTasks")
      .withIndex("by_threadId_and_taskId", (q) =>
        q.eq("threadId", args.threadId).eq("taskId", args.taskId),
      )
      .unique();
    if (!link) return null;
    await ctx.db.delete(link._id);
    const remaining = await ctx.db
      .query("threadTasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
      .take(21);
    await ctx.db.patch(thread._id, {
      taskCount: Math.max(0, thread.taskCount - 1),
      updatedAt: Date.now(),
    });
    await ctx.db.patch(task._id, {
      threadCount: remaining.length,
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      task._id,
      user,
      "task_unlinked",
      `Task removed from thread: ${thread.name}`,
      { threadId: thread._id },
    );
    return null;
  },
});
export const threadTasks = query({
  args: {
    taskId: v.id("tasks"),
    threadId: v.id("threads"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(taskView),
  handler: async (ctx, args) => {
    const { user } = await ownedTask(ctx, args.taskId);
    await ownedThread(ctx, args.threadId);
    const rows = await ctx.db
      .query("threadTasks")
      .withIndex("by_threadId_and_taskId", (q) =>
        q.eq("threadId", args.threadId),
      )
      .paginate(pageSize(args.paginationOpts));
    const tasks = await Promise.all(
      rows.page.map((link) => ctx.db.get(link.taskId)),
    );
    return {
      ...rows,
      page: await Promise.all(
        tasks
          .filter(
            (task): task is Doc<"tasks"> =>
              !!task && task.ownerId === user.tokenIdentifier,
          )
          .map((task) => toTaskView(ctx, task)),
      ),
    };
  },
});

/** Explicit, resumable migration. Does not invent activity for historical changes. */
export const migrateSubtasks = internalMutation({
  args: { cursor: v.union(v.null(), v.string()) },
  returns: v.object({
    cursor: v.string(),
    isDone: v.boolean(),
    migrated: v.number(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("tasks")
      .paginate({ cursor: args.cursor, numItems: 20 });
    let migrated = 0;
    for (const task of page.page) {
      if (task.subtasksNormalized) continue;
      await normalizeSubtasks(ctx, task);
      migrated++;
    }
    return { cursor: page.continueCursor, isDone: page.isDone, migrated };
  },
});

/** Only known timestamps are imported: no inferred changes or guessed actors. */
export const backfillKnownActivity = internalMutation({
  args: { cursor: v.union(v.null(), v.string()) },
  returns: v.object({
    cursor: v.string(),
    isDone: v.boolean(),
    created: v.number(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("tasks")
      .paginate({ cursor: args.cursor, numItems: 20 });
    let created = 0;
    for (const task of page.page) {
      const creation = await ctx.db
        .query("activity")
        .withIndex("by_taskId_and_eventType", (q) =>
          q.eq("taskId", task._id).eq("eventType", "task_created"),
        )
        .first();
      if (!creation) {
        await ctx.db.insert("activity", {
          taskId: task._id,
          eventType: "task_created",
          description: "Task created",
          timestamp: task._creationTime,
        });
        created++;
      }
      if (!task.subtasksNormalized) await normalizeSubtasks(ctx, task);
      const rows = await subtaskRows(ctx, task._id);
      for (const step of rows)
        if (step.completedAt !== undefined) {
          const completion = await ctx.db
            .query("activity")
            .withIndex("by_taskId_and_subtaskId_and_eventType", (q) =>
              q
                .eq("taskId", task._id)
                .eq("metadata.subtaskId", step._id)
                .eq("eventType", "subtask_completed"),
            )
            .first();
          if (!completion) {
            await ctx.db.insert("activity", {
              taskId: task._id,
              eventType: "subtask_completed",
              description: `Subtask completed: ${step.title}`,
              timestamp: step.completedAt,
              metadata: { subtaskId: step._id },
            });
            created++;
          }
        }
    }
    return { cursor: page.continueCursor, isDone: page.isDone, created };
  },
});
