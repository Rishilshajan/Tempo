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
import { TaskMetadataPills } from "@/components/tasks/task-metadata-pills";
import { TaskRescheduleCalendar } from "@/components/tasks/task-reschedule-calendar";
import { PriorityLabel } from "@/components/tasks/task-select";
import { TaskPill, TaskStatusSelect } from "@/components/tasks/task-status";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";
import { isCarried,type DayWindow } from "@/lib/today-model";
import { Target } from "lucide-react";
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
        <div className="task-metadata-strip mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
          <TaskMetadataPills task={task} carried={carried && !completed} overdue={overdue} onOpen={onOpen} />
          <TaskPill tone={task.priority === "urgent" ? "overdue" : task.priority === "high" ? "progress" : "neutral"}><PriorityLabel value={task.priority} /></TaskPill>
        </div>
      </div>
      <div className="dashboard-row-actions flex flex-wrap items-center gap-1">
        <TaskStatusSelect
          task={task}
          disabled={pending || actionSaving}
          onBusyChange={setActionSaving}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
        {!completed && onPlanToday && (
          <ActionTooltip content={"Plan today - keep the original deadline"}>
            <Button
              variant="ghost"
              size="sm"
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
              Plan today
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
              size="sm"
              className="size-9 rounded-lg border border-border"
              aria-label={
                (focused ? "Clear main focus: " : "Make main focus: ") +
                task.title
              }
              aria-pressed={!!focused}
              data-icon-action
              disabled={pending || actionSaving || focusSaving}
              onClick={onFocus}
            >
              <Target size={16} className={focused ? "text-primary" : "text-muted-foreground"} aria-hidden="true" />
            </Button>
          </ActionTooltip>
        )}
      </div>
    </li>
  );
}
