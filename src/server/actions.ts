"use server";

import { asc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { domains, tasks, appSettings, taskMilestones } from "@/db/schema";
import type { Task, Domain, AppSettings, TaskMilestone } from "@/db/schema";
import { log } from "@/lib/logger";
import { rollforwardTasks } from "@/server/rollforward";
import { todayISO } from "@/server/queries";
import {
  createDomainSchema,
  updateDomainSchema,
  createTaskSchema,
  updateTaskSchema,
  moveStatusSchema,
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
    const [order] = await db
      .select({ maxSortOrder: max(domains.sortOrder) })
      .from(domains);
    const [row] = await db
      .insert(domains)
      .values({
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
    await db.transaction(async (tx) => {
      const current = await tx
        .select({ id: domains.id })
        .from(domains)
        .orderBy(asc(domains.sortOrder), asc(domains.createdAt));
      const currentIds = new Set(current.map((domain) => domain.id));
      if (
        current.length !== parsed.data.length ||
        parsed.data.some((id) => !currentIds.has(id))
      ) {
        throw new Error("Domain list changed while saving its order");
      }

      for (const [sortOrder, id] of parsed.data.entries()) {
        await tx.update(domains).set({ sortOrder }).where(eq(domains.id, id));
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
    const [row] = await db
      .update(domains)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(domains.id, id))
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
    await db.delete(domains).where(eq(domains.id, id));
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
    const { milestones, ...taskData } = parsed.data;
    // Task + its milestones are one unit of work: if the milestone insert
    // fails we must not leave an orphaned task behind.
    const row = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(tasks)
        .values({
          ...taskData,
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
            title: m.title,
            durationEstMin: m.durationEstMin,
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
    const [row] = await db
      .update(tasks)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(tasks.id, id))
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
    const [row] = await db
      .update(tasks)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(tasks.id, parsed.data.id))
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

export async function deleteTask(id: string): Promise<ActionResult<null>> {
  try {
    await db.delete(tasks).where(eq(tasks.id, id));
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
    const existing = await db.select({ id: appSettings.id }).from(appSettings).limit(1);
    const id = existing[0]?.id;
    const [row] = id
      ? await db
          .update(appSettings)
          .set({ ...parsed.data, updatedAt: new Date() })
          .where(eq(appSettings.id, id))
          .returning()
      : await db.insert(appSettings).values(parsed.data).returning();
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
  return db
    .select()
    .from(taskMilestones)
    .where(eq(taskMilestones.taskId, taskId))
    .orderBy(taskMilestones.sortOrder);
}

/** Replace all of a task's milestones with the given list (ordered). */
export async function setMilestones(
  taskId: string,
  items: { title: string; durationEstMin: number; isCompleted: boolean }[],
): Promise<ActionResult<null>> {
  try {
    // Replace-in-place must be atomic: a failed insert after the delete would
    // otherwise wipe every subtask with no way to recover them.
    await db.transaction(async (tx) => {
      await tx.delete(taskMilestones).where(eq(taskMilestones.taskId, taskId));
      if (items.length) {
        await tx.insert(taskMilestones).values(
          items.map((m, i) => ({
            taskId,
            title: m.title,
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

/** Manual trigger for the rollforward job (same logic as the nightly cron). */
export async function runRollforwardNow(): Promise<ActionResult<number>> {
  try {
    const moved = await rollforwardTasks();
    refresh();
    return { ok: true, data: moved };
  } catch (e) {
    log.error("runRollforwardNow failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not run rollforward" };
  }
}
