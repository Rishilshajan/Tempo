/**
 * TEMPO-003 - TEMPO-003-F11: shared daily/review/completed row actions.
 * Code map: src/components/code-map.md.
 */
"use client";
import type {
  SetTaskCompleted,
  SetTaskProgress,
  TaskRecord,
} from "@/components/tasks/task-list";
import { TaskRescheduleCalendar } from "@/components/tasks/task-reschedule-calendar";
import { TaskStatusSelect } from "@/components/tasks/task-status";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";
import { formatMinutes, isCarried, type DayWindow } from "@/lib/today-model";
import { CalendarPlus, Check, RotateCcw, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "./day-errors";
/**
 * TEMPO-003-F11 - DayTaskRow
 * Purpose: Displays one shared task row with completion, status, focus and rescheduling.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function DayTaskRow({
  task,
  day,
  now,
  pending,
  onComplete,
  onOpen,
  onSetCompleted,
  onSetProgress,
  onFocus,
  focused,
  focusSaving,
  onPlanToday,
  onReschedule,
}: {
  task: TaskRecord;
  day: DayWindow;
  now: number;
  pending: boolean;
  onFocus?: () => void;
  focused?: boolean;
  focusSaving?: boolean;
  onPlanToday?: () => Promise<unknown>;
  onReschedule?: (schedule: TaskRecord["schedule"]) => Promise<unknown>;
  onComplete: () => void;
  onOpen: () => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
}) {
  const [actionSaving, setActionSaving] = useState(false);
  const carried = isCarried(task, day);
  const schedule = task.schedule;
  const completed = task.status === "completed";
  const overdue =
    !completed &&
    (carried ||
      (schedule.type === "fixed" &&
        schedule.endAt <= now &&
        day.date === day.today));
  return (
    <li
      data-task-state={
        completed ? "completed" : (task.progress ?? "not_started")
      }
      className={
        "dashboard-task-row flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/40 " +
        (focused ? "lg:border-primary/40 lg:bg-secondary/40" : "")
      }
      onClick={(event) => {
        if (
          !(event.target as HTMLElement).closest(
            "button, input, label, a, [role='menuitemradio'], [role='option']",
          )
        )
          onOpen();
      }}
    >
      <ActionTooltip content={completed ? "Reopen task" : "Mark completed"}>
        <Button
          variant="ghost"
          size="icon"
          className="dashboard-row-complete size-9 rounded-lg border border-border"
          aria-label={(completed ? "Reopen " : "Complete ") + task.title}
          disabled={pending || actionSaving}
          onClick={onComplete}
        >
          {completed ? (
            <RotateCcw size={16} aria-hidden="true" />
          ) : (
            <Check size={16} aria-hidden="true" />
          )}
        </Button>
      </ActionTooltip>
      <div className="dashboard-task-copy min-w-0 flex-1 basis-40">
        <button
          type="button"
          onClick={onOpen}
          className={
            "w-full break-words text-left text-xs font-medium leading-5 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring " +
            (completed ? "line-through text-muted-foreground" : "")
          }
        >
          {task.title}
        </button>
        <div className="dashboard-task-meta mt-1 text-[11px] leading-5 text-muted-foreground">
          {[
            task.domain?.name ?? "Uncategorized",
            (schedule.type === "fixed"
              ? new Intl.DateTimeFormat(undefined, {
                  timeZone: day.timezone,
                  hour: "numeric",
                  minute: "2-digit",
                }).format(schedule.startAt) +
                "-" +
                new Intl.DateTimeFormat(undefined, {
                  timeZone: day.timezone,
                  hour: "numeric",
                  minute: "2-digit",
                }).format(schedule.endAt)
              : task.estimatedMinutes
                ? formatMinutes(task.estimatedMinutes)
                : "Flexible") +
              (overdue
                ? " · Overdue"
                : schedule.type === "flexible" && schedule.dueDate === day.date
                  ? " · Due today"
                  : ""),
            completed
              ? "Completed"
              : task.progress === "in_progress"
                ? "In progress"
                : "Not started",
            task.subtasks.length
              ? task.subtasks.filter((step) => step.completedAt !== undefined)
                  .length +
                "/" +
                task.subtasks.length +
                " subtasks"
              : "No subtasks",
          ].map((item, index) => (
            <span
              key={index}
              className={
                index === 1 && overdue
                  ? "dashboard-meta-overdue"
                  : index === 2 && task.progress === "in_progress" && !completed
                    ? "dashboard-meta-progress"
                    : ""
              }
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="dashboard-row-actions flex flex-wrap items-center gap-1">
        <TaskStatusSelect
          task={task}
          compact
          disabled={pending || actionSaving}
          onBusyChange={setActionSaving}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
        {!completed && onPlanToday && (
          <ActionTooltip content={"Plan today - keep the original deadline"}>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg border border-border"
              aria-label={"Plan today: " + task.title}
              disabled={pending || actionSaving}
              onClick={async () => {
                setActionSaving(true);
                try {
                  await onPlanToday();
                  toast.success(
                    "Planned for today. Original deadline preserved.",
                  );
                } catch (cause) {
                  toast.error(errorMessage(cause, "Could not plan this task."));
                } finally {
                  setActionSaving(false);
                }
              }}
            >
              <CalendarPlus size={16} aria-hidden="true" />
            </Button>
          </ActionTooltip>
        )}
        {!completed && onReschedule && (
          <TaskRescheduleCalendar
            task={task}
            iconOnly
            disabled={pending || actionSaving}
            onReschedule={onReschedule}
          />
        )}
        {!completed && onFocus && (
          <ActionTooltip
            content={
              focused ? "Remove main focus" : "Make this your main focus"
            }
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg border border-border"
              aria-label={
                (focused ? "Clear main focus: " : "Make main focus: ") +
                task.title
              }
              aria-pressed={!!focused}
              disabled={pending || actionSaving || focusSaving}
              onClick={onFocus}
            >
              <Star
                size={16}
                className={
                  focused
                    ? "fill-primary text-primary"
                    : "text-muted-foreground"
                }
                aria-hidden="true"
              />
            </Button>
          </ActionTooltip>
        )}
      </div>
    </li>
  );
}
