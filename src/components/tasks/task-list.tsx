"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  Infinity as InfinityIcon,
  Repeat2,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  DomainLabel,
  type DomainAppearance,
} from "@/components/domains/domain-appearance";
import { PriorityLabel } from "./task-select";
import { TaskPill, TaskStatusSelect } from "./task-status";

export type TaskRecord = Omit<Doc<"tasks">, "ownerId" | "requestId"> & {
  recurrencePlanned?: boolean;
  domain: DomainAppearance | null;
};
export type SetTaskCompleted = (
  id: Id<"tasks">,
  completed: boolean,
  subtaskId?: string,
) => Promise<unknown>;
export type SetTaskProgress = (
  id: Id<"tasks">,
  progress: "not_started" | "in_progress",
) => Promise<unknown>;

export function TaskList({
  tasks,
  isToday,
  onSetCompleted,
  onSetProgress,
}: {
  tasks: TaskRecord[];
  isToday: boolean;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
}) {
  if (isToday)
    return (
      <div className="space-y-7">
        {(["fixed", "flexible"] as const).map((type) => {
          const rows = tasks.filter((task) => task.schedule.type === type);
          if (!rows.length) return null;
          return (
            <section
              key={type}
              aria-label={
                type === "fixed" ? "Fixed-time tasks" : "Flexible tasks"
              }
            >
              <h2 className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {type === "fixed" ? (
                  <Clock3 className="size-4" aria-hidden="true" />
                ) : (
                  <InfinityIcon className="size-4" aria-hidden="true" />
                )}
                {type === "fixed" ? "Fixed time" : "Flexible"}
              </h2>
              <ul className="space-y-2">
                {rows.map((task) => (
                  <TaskRow
                    key={task._id}
                    task={task}
                    onSetCompleted={onSetCompleted}
                    onSetProgress={onSetProgress}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TaskRow
          key={task._id}
          task={task}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  onSetCompleted,
  onSetProgress,
}: {
  task: TaskRecord;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
}) {
  const [pending, setPending] = useState(false);
  async function toggle(completed: boolean, subtaskId?: string) {
    if (pending) return;
    setPending(true);
    try {
      const nextOccurrence = await onSetCompleted(
        task._id,
        completed,
        subtaskId,
      );
      if (typeof nextOccurrence === "string")
        toast.success("Next recurring task created.");
    } catch (cause) {
      toast.error(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "Couldn't update this task. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  const fixed = task.schedule.type === "fixed" ? task.schedule : null;
  const formatDateTime = (timestamp: number) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: task.timezone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(timestamp);
  return (
    <li className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <label className="flex min-h-8 min-w-6 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={task.status === "completed"}
            disabled={pending}
            onChange={(event) => void toggle(event.target.checked)}
            aria-label={`Mark ${task.title} ${task.status === "completed" ? "incomplete" : "complete"}`}
            className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </label>
        <div className="min-w-0 flex-1">
          <h3
            className={`break-words text-sm font-medium leading-6 ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}
          >
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
              {task.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            <TaskPill tone={fixed ? "fixed" : "flexible"}>
              {fixed ? "Fixed" : "Flexible"}
            </TaskPill>
            <span className="inline-flex items-center gap-1.5">
              <PriorityLabel value={task.priority} />
            </span>
            {task.domain ? (
              <span className="inline-flex min-w-0 max-w-48 items-center gap-1.5">
                <DomainLabel {...task.domain} />
              </span>
            ) : (
              <span>Uncategorized</span>
            )}
            {fixed ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {formatDateTime(fixed.startAt)} – {formatDateTime(fixed.endAt)}{" "}
                ({task.timezone})
              </span>
            ) : task.schedule.type === "flexible" && task.schedule.dueDate ? (
              <span>Due {task.schedule.dueDate}</span>
            ) : (
              <span>
                {task.recurrence
                  ? `Repeat date ${task.workDate}`
                  : "Flexible · no date"}
              </span>
            )}
            {task.estimatedMinutes && (
              <span>{task.estimatedMinutes} min estimate</span>
            )}
            {task.recurrence && (
              <span className="inline-flex items-center gap-1.5">
                <Repeat2 className="size-3.5" aria-hidden="true" />
                {task.recurrence.frequency === "weekdays"
                  ? "Weekdays (Mon–Fri)"
                  : task.recurrence.frequency === "custom"
                    ? `Every ${task.recurrence.interval} ${task.recurrence.unit}${task.recurrence.interval === 1 ? "" : "s"}`
                    : task.recurrence.frequency[0].toUpperCase() +
                      task.recurrence.frequency.slice(1)}
                {task.recurrenceOrdinal ? ` · #${task.recurrenceOrdinal}` : ""}
              </span>
            )}
            <span className="ml-auto">
              <TaskStatusSelect
                task={task}
                disabled={pending}
                onBusyChange={setPending}
                onSetCompleted={onSetCompleted}
                onSetProgress={onSetProgress}
              />
            </span>
          </div>
          {task.subtasks.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Subtasks ·{" "}
                {
                  task.subtasks.filter((step) => step.completedAt !== undefined)
                    .length
                }
                /{task.subtasks.length}
              </summary>
              <ul className="mt-2 space-y-1">
                {task.subtasks.map((step) => (
                  <li key={step.id}>
                    <label className="flex min-h-8 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={step.completedAt !== undefined}
                        disabled={pending}
                        onChange={(event) =>
                          void toggle(event.target.checked, step.id)
                        }
                        className="size-3.5 accent-primary"
                      />
                      <span
                        className={`min-w-0 break-words ${step.completedAt !== undefined ? "text-muted-foreground line-through" : ""}`}
                      >
                        {step.title}
                      </span>
                      {step.dueDate && (
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                          {step.dueDate}
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}
