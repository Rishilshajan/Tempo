"use server";

import { and, asc, desc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  domains,
  tasks,
  threads,
  appSettings,
  taskMilestones,
  taskNotes,
  notificationReads,
} from "@/db/schema";
import { requireUserId } from "@/server/auth";
import type { Task, Domain, AppSettings, TaskMilestone, TaskNote } from "@/db/schema";
import { log } from "@/lib/logger";
import { rollforwardTasks } from "@/server/rollforward";
import {
  todayISO,
  getThreadWithTasks,
  getTasks,
  type TaskFilter,
} from "@/server/queries";
import {
  createDomainSchema,
  updateDomainSchema,
  createTaskSchema,
  updateTaskSchema,
  moveStatusSchema,
  moveDateSchema,
  updateSettingsSchema,
  reorderDomainsSchema,
  type CreateDomainInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type UpdateSettingsInput,
} from "@/server/validation";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function refresh() {
  // one call refreshes every page under the root layout (lists + counts)
  revalidatePath("/", "layout");
}

/* ------------------------------- domains ------------------------------- */

export async function createDomain(
  input: CreateDomainInput,
): Promise<ActionResult<Domain>> {
  const parsed = createDomainSchema.safeParse(input);
  if (!parsed.success) {
    log.warn("createDomain validation failed", parsed.error.issues);
    return { ok: false, error: firstError(parsed.error.issues) };
  }
  const { name, color, glyph, emoji, purpose, morningBias, allowElastic } =
    parsed.data;
  const tag = parsed.data.tag ? slugify(parsed.data.tag) : slugify(name);
  if (!tag) return { ok: false, error: "Could not derive a tag from the name" };

  try {
    const userId = await requireUserId();
    const [order] = await db
      .select({ maxSortOrder: max(domains.sortOrder) })
      .from(domains)
      .where(eq(domains.userId, userId));
    const [row] = await db
      .insert(domains)
      .values({
        userId,
        name,
        tag,
        color,
        glyph: glyph ?? null,
        emoji: emoji ?? null,
        purpose: purpose ?? null,
        morningBias,
        allowElastic,
        sortOrder: (order.maxSortOrder ?? -1) + 1,
      })
      .returning();
    log.success("Domain created", { id: row.id, tag: row.tag });
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") {
      // unique_violation
      log.warn("createDomain duplicate tag", { tag });
      return { ok: false, error: `A domain "@${tag}" already exists` };
    }
    log.error("createDomain failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not create the domain" };
  }
}

export async function reorderDomains(
  ids: string[],
): Promise<ActionResult<null>> {
  const parsed = reorderDomainsSchema.safeParse(ids);
  if (!parsed.success) {
    log.warn("reorderDomains validation failed", parsed.error.issues);
    return { ok: false, error: firstError(parsed.error.issues) };
  }

  try {
    const userId = await requireUserId();
    await db.transaction(async (tx) => {
      const current = await tx
        .select({ id: domains.id })
        .from(domains)
        .where(eq(domains.userId, userId))
        .orderBy(asc(domains.sortOrder), asc(domains.createdAt));
      const currentIds = new Set(current.map((domain) => domain.id));
      if (
        current.length !== parsed.data.length ||
        parsed.data.some((id) => !currentIds.has(id))
      ) {
        throw new Error("Domain list changed while saving its order");
      }

      for (const [sortOrder, id] of parsed.data.entries()) {
        await tx
          .update(domains)
          .set({ sortOrder })
          .where(and(eq(domains.id, id), eq(domains.userId, userId)));
      }
    });
    log.success("Domain order updated", { count: parsed.data.length });
    refresh();
    return { ok: true, data: null };
  } catch (e) {
    log.error("reorderDomains failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not save the domain order" };
  }
}

export async function updateDomain(
  input: { id: string } & Partial<CreateDomainInput>,
): Promise<ActionResult<Domain>> {
  const parsed = updateDomainSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: firstError(parsed.error.issues) };
  const { id, ...rest } = parsed.data;
  try {
    const userId = await requireUserId();
    const [row] = await db
      .update(domains)
      .set({ ...rest, updatedAt: new Date() })
      .where(and(eq(domains.id, id), eq(domains.userId, userId)))
      .returning();
    if (!row) return { ok: false, error: "Domain not found" };
    log.success("Domain updated", { id });
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    log.error("updateDomain failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not update the domain" };
  }
}

export async function deleteDomain(id: string): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await db
      .delete(domains)
      .where(and(eq(domains.id, id), eq(domains.userId, userId)));
    log.success("Domain deleted", { id });
    refresh();
    return { ok: true, data: null };
  } catch (e) {
    log.error("deleteDomain failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not delete the domain" };
  }
}

/* -------------------------------- tasks -------------------------------- */

export async function createTask(
  input: CreateTaskInput,
): Promise<ActionResult<Task>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    log.warn("createTask validation failed", parsed.error.issues);
    return { ok: false, error: firstError(parsed.error.issues) };
  }
  try {
    const userId = await requireUserId();
    const { milestones, ...taskData } = parsed.data;
    // Task + its milestones are one unit of work: if the milestone insert
    // fails we must not leave an orphaned task behind.
    const row = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(tasks)
        .values({
          ...taskData,
          userId,
          domainId: taskData.domainId ?? null,
          // Default to today so quick-added tasks land on Today and participate
          // in rollforward. Clearing the date later makes a task "unscheduled".
          date: taskData.date ?? todayISO(),
        })
        .returning();
      if (milestones?.length) {
        await tx.insert(taskMilestones).values(
          milestones.map((m, i) => ({
            taskId: created.id,
            userId,
            title: m.title,
            description: m.description ?? null,
            date: m.date ?? null,
            scheduledTime: m.scheduledTime ?? null,
            durationEstMin: m.durationEstMin,
            isCompleted: m.isCompleted ?? false,
            sortOrder: i,
          })),
        );
      }
      return created;
    });
    log.success("Task created", {
      id: row.id,
      title: row.title,
      milestones: milestones?.length ?? 0,
    });
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    log.error("createTask failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not create the task" };
  }
}

export async function updateTask(
  input: UpdateTaskInput,
): Promise<ActionResult<Task>> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: firstError(parsed.error.issues) };
  const { id, ...rest } = parsed.data;
  try {
    const userId = await requireUserId();
    // Keep completedAt in sync with status when status is part of the update.
    const completedPatch =
      rest.status === undefined
        ? {}
        : { completedAt: rest.status === "done" ? new Date() : null };
    const [row] = await db
      .update(tasks)
      .set({ ...rest, ...completedPatch, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    if (!row) return { ok: false, error: "Task not found" };
    log.success("Task updated", { id });
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    log.error("updateTask failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not update the task" };
  }
}

export async function moveTaskStatus(
  id: string,
  status: Task["status"],
): Promise<ActionResult<Task>> {
  // the one guard: status must be a legal enum value
  const parsed = moveStatusSchema.safeParse({ id, status });
  if (!parsed.success)
    return { ok: false, error: firstError(parsed.error.issues) };
  try {
    const userId = await requireUserId();
    const [row] = await db
      .update(tasks)
      .set({
        status: parsed.data.status,
        completedAt: parsed.data.status === "done" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
      .returning();
    if (!row) return { ok: false, error: "Task not found" };
    log.event("Task status moved", { id, status });
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    log.error("moveTaskStatus failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not move the task" };
  }
}

/**
 * One-tap complete toggle (card checkbox). `done` -> status done + stamp
 * completedAt; un-done -> back to not_started and clear the stamp.
 */
export async function toggleTaskDone(
  id: string,
  done: boolean,
): Promise<ActionResult<Task>> {
  try {
    const userId = await requireUserId();
    const [row] = await db
      .update(tasks)
      .set({
        status: done ? "done" : "not_started",
        completedAt: done ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    if (!row) return { ok: false, error: "Task not found" };
    log.event("Task done toggled", { id, done });
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    log.error("toggleTaskDone failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not update the task" };
  }
}

/** Add `days` calendar days to a YYYY-MM-DD string (UTC math, tz-safe). */
function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Manually re-date a task. This is a DELIBERATE reschedule, so it does NOT
 * bump rollforwardCount - only the automatic past-due job counts as slippage.
 */
export async function moveTaskToDate(
  id: string,
  date: string,
): Promise<ActionResult<Task>> {
  const parsed = moveDateSchema.safeParse({ id, date });
  if (!parsed.success)
    return { ok: false, error: firstError(parsed.error.issues) };
  try {
    const userId = await requireUserId();
    const [row] = await db
      .update(tasks)
      .set({ date: parsed.data.date, updatedAt: new Date() })
      .where(and(eq(tasks.id, parsed.data.id), eq(tasks.userId, userId)))
      .returning();
    if (!row) return { ok: false, error: "Task not found" };
    log.event("Task re-dated", { id, date: parsed.data.date });
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    log.error("moveTaskToDate failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not reschedule the task" };
  }
}

/** Convenience: push a task to tomorrow (manual, not counted as slippage). */
export async function moveTaskToTomorrow(id: string): Promise<ActionResult<Task>> {
  return moveTaskToDate(id, addDaysISO(todayISO(), 1));
}

/* ------------------------------- threads ------------------------------- */

export type FollowUpContext = {
  threadId: string;
  threadTitle: string;
  parentTaskId: string;
  prefill: {
    title: string;
    domainId: string | null;
    description: string | null;
    importance: Task["importance"];
  };
};

/**
 * Start a follow-up for a task: ensure it belongs to a thread (creating one
 * titled after the task if needed), optionally complete it, and return the
 * context the Create sheet pre-fills the successor with. Powers both
 * "Complete & add follow-up" (complete: true) and "Add to thread".
 */
export async function startThreadFollowUp(
  taskId: string,
  opts: { complete: boolean },
): Promise<ActionResult<FollowUpContext>> {
  try {
    const userId = await requireUserId();
    const result = await db.transaction(async (tx) => {
      const [task] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
      if (!task) return null;

      if (opts.complete) {
        await tx
          .update(tasks)
          .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
      }

      // Ensure a thread.
      let threadId = task.threadId;
      let threadTitle = task.title;
      if (threadId) {
        const [t] = await tx
          .select({ title: threads.title })
          .from(threads)
          .where(and(eq(threads.id, threadId), eq(threads.userId, userId)));
        if (t) threadTitle = t.title;
      } else {
        const [created] = await tx
          .insert(threads)
          .values({ userId, title: task.title })
          .returning({ id: threads.id, title: threads.title });
        threadId = created.id;
        threadTitle = created.title;
        await tx
          .update(tasks)
          .set({ threadId, updatedAt: new Date() })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
      }

      // Carry the task's latest note (its output) into the follow-up context.
      const [lastNote] = await tx
        .select({ body: taskNotes.body })
        .from(taskNotes)
        .where(and(eq(taskNotes.taskId, taskId), eq(taskNotes.userId, userId)))
        .orderBy(desc(taskNotes.createdAt))
        .limit(1);
      const carriedDescription =
        [
          task.description,
          lastNote ? `↳ From "${task.title}": ${lastNote.body}` : null,
        ]
          .filter(Boolean)
          .join("\n\n") || null;

      return {
        threadId,
        threadTitle,
        parentTaskId: task.id,
        prefill: {
          title: task.title,
          domainId: task.domainId,
          description: carriedDescription,
          importance: task.importance,
        },
      } satisfies FollowUpContext;
    });

    if (!result) return { ok: false, error: "Task not found" };
    log.event("Thread follow-up started", {
      taskId,
      threadId: result.threadId,
      completed: opts.complete,
    });
    refresh();
    return { ok: true, data: result };
  } catch (e) {
    log.error("startThreadFollowUp failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not start a follow-up" };
  }
}

/** Client-callable fetch of a thread + its tasks (for the drawer panel). */
export async function getThread(threadId: string) {
  return getThreadWithTasks(threadId);
}

/** Client-callable task page fetch for "load more" pagination. */
export async function fetchTasksPage(filter: TaskFilter): Promise<Task[]> {
  return getTasks(filter);
}

/** Rename a thread. */
export async function renameThread(
  id: string,
  title: string,
): Promise<ActionResult<null>> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Thread needs a title" };
  try {
    const userId = await requireUserId();
    await db
      .update(threads)
      .set({ title: trimmed.slice(0, 120), updatedAt: new Date() })
      .where(and(eq(threads.id, id), eq(threads.userId, userId)));
    refresh();
    return { ok: true, data: null };
  } catch (e) {
    log.error("renameThread failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not rename the thread" };
  }
}

/** Close or reopen a thread. */
export async function setThreadStatus(
  id: string,
  status: "active" | "closed",
): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await db
      .update(threads)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(threads.id, id), eq(threads.userId, userId)));
    refresh();
    return { ok: true, data: null };
  } catch (e) {
    log.error("setThreadStatus failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not update the thread" };
  }
}

export async function deleteTask(id: string): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    log.success("Task deleted", { id });
    refresh();
    return { ok: true, data: null };
  } catch (e) {
    log.error("deleteTask failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not delete the task" };
  }
}

/* ------------------------------ settings ------------------------------ */

export async function updateAppSettings(
  input: UpdateSettingsInput,
): Promise<ActionResult<AppSettings>> {
  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: firstError(parsed.error.issues) };
  try {
    const userId = await requireUserId();
    const existing = await db
      .select({ id: appSettings.id })
      .from(appSettings)
      .where(eq(appSettings.userId, userId))
      .limit(1);
    const id = existing[0]?.id;
    const [row] = id
      ? await db
          .update(appSettings)
          .set({ ...parsed.data, updatedAt: new Date() })
          .where(and(eq(appSettings.id, id), eq(appSettings.userId, userId)))
          .returning()
      : await db
          .insert(appSettings)
          .values({ ...parsed.data, userId })
          .returning();
    log.success("Settings updated", parsed.data);
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    log.error("updateAppSettings failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not save settings" };
  }
}

/* ------------------------------ milestones ----------------------------- */

export async function getMilestones(taskId: string): Promise<TaskMilestone[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(taskMilestones)
    .where(
      and(eq(taskMilestones.taskId, taskId), eq(taskMilestones.userId, userId)),
    )
    .orderBy(taskMilestones.sortOrder);
}

/** Replace all of a task's milestones with the given list (ordered). */
export async function setMilestones(
  taskId: string,
  items: {
    title: string;
    description?: string | null;
    date?: string | null;
    scheduledTime?: string | null;
    durationEstMin: number;
    isCompleted: boolean;
  }[],
): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    // Only operate on a task the user owns.
    const [owned] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);
    if (!owned) return { ok: false, error: "Task not found" };
    // Replace-in-place must be atomic: a failed insert after the delete would
    // otherwise wipe every subtask with no way to recover them.
    await db.transaction(async (tx) => {
      await tx
        .delete(taskMilestones)
        .where(
          and(
            eq(taskMilestones.taskId, taskId),
            eq(taskMilestones.userId, userId),
          ),
        );
      if (items.length) {
        await tx.insert(taskMilestones).values(
          items.map((m, i) => ({
            taskId,
            userId,
            title: m.title,
            description: m.description ?? null,
            date: m.date ?? null,
            scheduledTime: m.scheduledTime ?? null,
            durationEstMin: m.durationEstMin,
            isCompleted: m.isCompleted,
            sortOrder: i,
          })),
        );
      }
    });
    log.success("Milestones saved", { taskId, count: items.length });
    refresh();
    return { ok: true, data: null };
  } catch (e) {
    log.error("setMilestones failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not save subtasks" };
  }
}

/* ------------------------------ task notes ----------------------------- */

const MAX_NOTE = 5000;

/** A task's notes/output log, newest first (client-callable, like getMilestones). */
export async function getTaskNotes(taskId: string): Promise<TaskNote[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(taskNotes)
    .where(and(eq(taskNotes.taskId, taskId), eq(taskNotes.userId, userId)))
    .orderBy(desc(taskNotes.createdAt));
}

/** Append a note/output entry to a task. */
export async function addTaskNote(
  taskId: string,
  body: string,
): Promise<ActionResult<TaskNote>> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Note can't be empty" };
  if (text.length > MAX_NOTE) return { ok: false, error: "Note is too long" };
  try {
    const userId = await requireUserId();
    const [owned] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);
    if (!owned) return { ok: false, error: "Task not found" };
    const [row] = await db
      .insert(taskNotes)
      .values({ taskId, userId, body: text })
      .returning();
    log.success("Task note added", { taskId, id: row.id });
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    log.error("addTaskNote failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not save the note" };
  }
}

/** Edit a note entry. */
export async function updateTaskNote(
  id: string,
  body: string,
): Promise<ActionResult<TaskNote>> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Note can't be empty" };
  if (text.length > MAX_NOTE) return { ok: false, error: "Note is too long" };
  try {
    const userId = await requireUserId();
    const [row] = await db
      .update(taskNotes)
      .set({ body: text, updatedAt: new Date() })
      .where(and(eq(taskNotes.id, id), eq(taskNotes.userId, userId)))
      .returning();
    if (!row) return { ok: false, error: "Note not found" };
    refresh();
    return { ok: true, data: row };
  } catch (e) {
    log.error("updateTaskNote failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not update the note" };
  }
}

/** Delete a note entry. */
export async function deleteTaskNote(id: string): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await db
      .delete(taskNotes)
      .where(and(eq(taskNotes.id, id), eq(taskNotes.userId, userId)));
    refresh();
    return { ok: true, data: null };
  } catch (e) {
    log.error("deleteTaskNote failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not delete the note" };
  }
}

/* --------------------------- notifications ----------------------------- */

/**
 * Persist read flags for in-app notifications (per account). Notifications are
 * derived live from task state, so we store which notification ids the user has
 * read; the feed hides them. Idempotent via the (user_id, notification_id) index.
 */
export async function markNotificationsRead(
  ids: string[],
): Promise<ActionResult<null>> {
  if (!ids.length) return { ok: true, data: null };
  try {
    const userId = await requireUserId();
    await db
      .insert(notificationReads)
      .values(ids.map((notificationId) => ({ userId, notificationId })))
      .onConflictDoNothing();
    refresh();
    return { ok: true, data: null };
  } catch (e) {
    log.error("markNotificationsRead failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not update notifications" };
  }
}

/** Manual trigger for the rollforward job (same logic as the nightly cron). */
export async function runRollforwardNow(): Promise<ActionResult<number>> {
  try {
    const userId = await requireUserId();
    const moved = await rollforwardTasks(userId);
    refresh();
    return { ok: true, data: moved };
  } catch (e) {
    log.error("runRollforwardNow failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not run rollforward" };
  }
}
