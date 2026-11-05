"use client";
import { Clock3, ListChecks, GitBranch } from "lucide-react";
import {
  DomainLabel,
  domainColors,
} from "@/components/domains/domain-appearance";
import { formatMinutes } from "@/lib/today-model";
import type { TaskRecord } from "./task-list";
import { TaskPill } from "./task-status";
export function TaskDomainPill({ task }: { task: Pick<TaskRecord, "domain"> }) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1 overflow-hidden rounded-full px-2 py-1 [&>span]:truncate"
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

export function TaskMetadataPills({
  task,
  carried = false,
  onOpen,
}: {
  task: TaskRecord;
  carried?: boolean;
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
          /{task.subtasks.length} steps
        </TaskPill>
      )}
      {!!task.threadCount && (
        <button
          type="button"
          onClick={() => onOpen()}
          className="inline-flex min-h-6 items-center gap-1 rounded-full bg-violet-100 px-2 text-[10px] text-violet-900"
        >
          <GitBranch className="size-3" />
          Thread
        </button>
      )}
      {carried && (
        <TaskPill tone="carried">
          Carried{task.rollForwardCount ? ` ×${task.rollForwardCount}` : ""} ·{" "}
          {shortBoardDate(task.originalWorkDate ?? task.workDate)}
        </TaskPill>
      )}
    </>
  );
}
function shortBoardDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value + "T12:00:00"));
}
