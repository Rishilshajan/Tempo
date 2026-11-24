/**
 * TEMPO-004 - Shared domain, schedule, effort, subtask and thread badges.
 * Used by: BoardCard; CompactBoardRow; DayTaskRow. Shared consumers remain supported.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Clock3, ListChecks, GitBranch } from "lucide-react";
import {
  DomainLabel,
  domainColors,
} from "@/components/domains/domain-appearance";
import { formatMinutes } from "@/lib/today-model";
import type { TaskRecord } from "./task-list";
import { TaskPill } from "./task-status";
/**
 * TEMPO-004-F20 - TaskDomainPill
 * Purpose: Renders the domain name and appearance using existing shared branding.
 * Used by: TaskMetadataPills.
 * Trigger: The metadata group renders its domain badge.
 */
export function TaskDomainPill({ task }: { task: Pick<TaskRecord, "domain"> }) {
  return (
    <span
      className="inline-flex h-6 min-w-0 max-w-full items-center gap-1 overflow-hidden rounded-full px-2 text-[10px] leading-4 [&>span]:truncate"
      style={{
        color: task.domain
          ? domainColors.find((color) => color.id === task.domain?.color)?.value
          : undefined,
        background: task.domain
          ? `color-mix(in srgb, ${domainColors.find((color) => color.id === task.domain?.color)?.value ?? "var(--primary)"} 12%, transparent)`
          : "var(--muted)",
      }}
    >
      {task.domain ? <DomainLabel {...task.domain} /> : "Uncategorized"}
    </span>
  );
}

/**
 * TEMPO-004-F21 - TaskMetadataPills
 * Purpose: Composes optional metadata badges in a consistent wrapping order.
 * Used by: BoardCard; CompactBoardRow; DayTaskRow.
 * Trigger: The caller renders, recomputes or handles its associated interaction.
 */
export function TaskMetadataPills({
  task,
  carried = false,
  overdue = false,
  onOpen,
}: {
  task: TaskRecord;
  carried?: boolean;
  overdue?: boolean;
  onOpen: () => void;
}) {
  return (
    <>
      {" "}
      <TaskDomainPill task={task} />
      <TaskPill tone={task.schedule.type === "fixed" ? "fixed" : "flexible"}>
        {task.schedule.type === "fixed"
          ? new Intl.DateTimeFormat("en-GB", {
              timeZone: task.timezone,
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            }).formatRange(task.schedule.startAt, task.schedule.endAt)
          : task.schedule.dueDate
            ? `Due ${shortBoardDate(task.schedule.dueDate)}`
            : "Anytime"}
      </TaskPill>
      {task.estimatedMinutes !== undefined && (
        <TaskPill>
          <Clock3 className="size-3" />
          {formatMinutes(task.estimatedMinutes)}
        </TaskPill>
      )}
      {task.subtasks.length > 0 && (
        <TaskPill tone="completed">
          <ListChecks className="size-3" />
          {
            task.subtasks.filter((step) => step.completedAt !== undefined)
              .length
          }
          /{task.subtasks.length} subtasks
        </TaskPill>
      )}
      {!!task.threadCount && (
        <button
          type="button"
          onClick={() => onOpen()}
          className="inline-flex min-h-6 items-center gap-1 rounded-full bg-violet-100 px-2 text-[10px] text-violet-900"
        >
          <GitBranch className="size-3" />
          {task.threadCount} {task.threadCount === 1 ? "thread" : "threads"}
        </button>
      )}
      {overdue && <TaskPill tone="overdue">Overdue</TaskPill>}
      {carried && (
        <TaskPill tone="carried">
          Carried{task.rollForwardCount ? ` ×${task.rollForwardCount}` : ""} ·{" "}
          {shortBoardDate(task.originalWorkDate ?? task.workDate)}
        </TaskPill>
      )}
    </>
  );
}
/**
 * TEMPO-004-F22 - shortBoardDate
 * Purpose: Formats a stored calendar date for a badge or filter label.
 * Used by: TaskMetadataPills.
 * Trigger: Flexible due-date or carried-date metadata renders.
 */
function shortBoardDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value + "T12:00:00"));
}
