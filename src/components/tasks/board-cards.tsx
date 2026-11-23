/**
 * TEMPO-003 - Existing board lane/card and responsive helpers; reused without new queries.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { type Lane } from "@/lib/kanban-model";
import { taskTimestamp } from "@/lib/task-datetime";
import { formatMinutes } from "@/lib/today-model";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  GitBranch,
  GripVertical,
  History,
  ListChecks,
  Plus,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { columns } from "./board-config";
import {
  type SetTaskCompleted,
  type SetTaskProgress,
  type TaskRecord,
} from "./task-list";
import { TaskDomainPill, TaskMetadataPills } from "./task-metadata-pills";
import { TaskRescheduleCalendar } from "./task-reschedule-calendar";
import { PriorityLabel } from "./task-select";
import { TaskPill, TaskStatusSelect } from "./task-status";
type BoardCardProps = {
  task: TaskRecord;
  lane: Lane;
  saving: boolean;
  onOpen: (task: TaskRecord) => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
  onContinue: () => void;
  onReschedule: (schedule: TaskRecord["schedule"]) => Promise<unknown>;
  compact?: boolean;
};
/**
 * TEMPO-003-F34 - LaneColumn
 * Purpose: Provides the existing LaneColumn behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function LaneColumn({
  column,
  count,
  collapsed,
  disabled,
  onToggle,
  onCreate,
  onToggleOlder,
  older,
  children,
}: {
  column: (typeof columns)[number];
  count: number;
  collapsed: boolean;
  disabled: boolean;
  onToggle: () => void;
  onCreate: () => void;
  onToggleOlder?: () => void;
  older?: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane:${column.id}`,
    data: { lane: column.id },
  });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.title} column`}
      className={`min-w-0 space-y-2 rounded-lg bg-muted/40 p-2 ${isOver ? (column.id === "carried" ? "ring-2 ring-destructive" : "ring-2 ring-primary") : ""}`}
    >
      <div className={`flex min-h-9 items-center gap-1`}>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={!collapsed}
          aria-controls={`board-lane-${column.id}`}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${column.title}`}
          className={`flex min-h-9 min-w-0 flex-1 items-center gap-1.5 rounded-lg p-1 text-left focus-visible:outline-2 focus-visible:outline-ring`}
          onClick={onToggle}
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full ${column.tone}`}
          >
            <column.icon className="size-3.5" />
          </span>
          <h2 className={`text-xs font-medium`}>{column.title}</h2>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${column.tone}`}
          >
            {count}
          </span>
          {collapsed ? (
            <ChevronRight className="ml-auto size-3.5 shrink-0" />
          ) : (
            <ChevronDown className="ml-auto size-3.5 shrink-0" />
          )}
        </button>
        {onToggleOlder && !collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7"
            aria-label="Include older completed tasks"
            aria-pressed={older}
            onClick={onToggleOlder}
          >
            <History className="size-3.5" />
          </Button>
        )}
        {column.id === "planned" && !collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7"
            aria-label="Create planned task"
            onClick={onCreate}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>
      {!collapsed && (
        <div id={`board-lane-${column.id}`} className="space-y-2">
          {children}
        </div>
      )}
    </section>
  );
}
/**
 * TEMPO-003-F35 - BoardCard
 * Purpose: Provides the existing BoardCard behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function BoardCard({
  task,
  lane,
  saving,
  onOpen,
  onSetCompleted,
  onSetProgress,
  onContinue,
  onReschedule,
  compact,
}: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, disabled: saving });
  const complete = task.subtasks.filter(
    (step) => step.completedAt !== undefined,
  ).length;
  if (compact)
    return (
      <CompactBoardRow
        task={task}
        lane={lane}
        saving={saving}
        onOpen={onOpen}
        onSetCompleted={onSetCompleted}
        onSetProgress={onSetProgress}
        onContinue={onContinue}
        onReschedule={onReschedule}
      />
    );
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      onClick={(event) => {
        if (
          !isDragging &&
          event.currentTarget.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest(
            "button, a, input, select, [role='combobox'], [role='menuitem'], [role='menuitemradio'], [role='option']",
          )
        )
          onOpen(task);
      }}
      className={`min-w-0 cursor-pointer space-y-2 rounded-lg border border-border bg-card p-2.5 shadow-sm hover:border-primary/40 motion-reduce:transition-none ${isDragging ? "opacity-35" : ""}`}
    >
      <div className="flex items-center gap-1 text-[10px]">
        <TaskDomainPill task={task} />
        <TaskPill
          tone={
            task.priority === "urgent"
              ? "overdue"
              : task.priority === "high"
                ? "progress"
                : "neutral"
          }
        >
          <PriorityLabel value={task.priority} />
        </TaskPill>
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label={`Move ${task.title}`}
          className="ml-auto flex size-7 shrink-0 touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted"
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      <button
        type="button"
        className={`w-full break-words text-left text-xs font-medium leading-5 hover:text-primary ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}
        onClick={() => onOpen(task)}
      >
        {task.title}
      </button>
      <TaskPill tone={task.schedule.type === "fixed" ? "fixed" : "flexible"}>
        {task.schedule.type === "fixed"
          ? new Intl.DateTimeFormat("en-GB", {
              timeZone: task.timezone,
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            }).formatRange(task.schedule.startAt, task.schedule.endAt)
          : task.schedule.dueDate
            ? `Due ${shortBoardDate(task.schedule.dueDate)}`
            : "Anytime"}
      </TaskPill>
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {lane === "carried" && (
          <TaskPill tone="carried">
            Carried{task.rollForwardCount ? ` ×${task.rollForwardCount}` : ""} ·{" "}
            {shortBoardDate(task.originalWorkDate ?? task.workDate)}
          </TaskPill>
        )}
        {task.estimatedMinutes !== undefined && (
          <TaskPill>
            <Clock3 className="size-3" />
            {formatMinutes(task.estimatedMinutes)}
          </TaskPill>
        )}
        {task.subtasks.length > 0 && (
          <TaskPill tone="completed">
            <ListChecks className="size-3" />
            {complete}/{task.subtasks.length} steps
          </TaskPill>
        )}
        {!!task.threadCount && (
          <button
            type="button"
            className="inline-flex min-h-6 items-center gap-1 rounded-full bg-violet-100 px-2 text-[10px] text-violet-900"
            onClick={() => onOpen(task)}
          >
            <GitBranch className="size-3" />
            Thread
          </button>
        )}
      </div>
      {task.status === "completed" && task.completedAt && (
        <time
          className="block text-[10px] text-primary"
          dateTime={new Date(task.completedAt).toISOString()}
        >
          Done {taskTimestamp(task.completedAt, task.timezone)}
        </time>
      )}
      <div className="flex flex-wrap items-center justify-end gap-1 pt-1">
        {lane === "carried" && (
          <div className="mr-auto flex flex-wrap gap-1">
            <Button
              variant="secondary"
              className="h-8 min-h-8 rounded-full px-2 text-[10px]"
              disabled={saving}
              onClick={onContinue}
            >
              Continue Today
            </Button>
            <TaskRescheduleCalendar
              compact
              task={task}
              disabled={saving}
              onReschedule={onReschedule}
            />
          </div>
        )}
        <TaskStatusSelect
          task={task}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
      </div>
    </article>
  );
}
/**
 * TEMPO-003-F36 - CompactBoardRow
 * Purpose: Provides the existing CompactBoardRow behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function CompactBoardRow({
  task,
  lane,
  saving,
  onOpen,
  onSetCompleted,
  onSetProgress,
  onContinue,
  onReschedule,
}: Omit<BoardCardProps, "compact">) {
  const [pending, setPending] = useState(false);
  const completed = task.status === "completed";
  async function toggle() {
    if (pending || saving) return;
    setPending(true);
    try {
      await onSetCompleted(task._id, !completed);
    } catch {
      toast.error("Couldn't update this task. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <article
      className="flex min-w-0 cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/40"
      onClick={(event) => {
        if (
          event.currentTarget.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest(
            "button, input, a, [role='menuitem'], [role='menuitemradio'], [role='option']",
          )
        )
          onOpen(task);
      }}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-primary"
        checked={completed}
        disabled={pending || saving || task.recurrencePlanned}
        aria-label={`${completed ? "Reopen" : "Complete"} ${task.title}`}
        onChange={() => void toggle()}
      />
      <div className="min-w-0 flex-1 basis-40">
        <button
          type="button"
          className={`w-full break-words text-left text-xs font-medium leading-5 hover:text-primary ${completed ? "line-through text-muted-foreground" : ""}`}
          onClick={() => onOpen(task)}
        >
          {task.title}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          <TaskMetadataPills
            task={task}
            carried={lane === "carried"}
            onOpen={() => onOpen(task)}
          />
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 pl-6 sm:w-auto sm:pl-0">
        <TaskPill
          tone={
            task.priority === "urgent"
              ? "overdue"
              : task.priority === "high"
                ? "progress"
                : "neutral"
          }
        >
          <PriorityLabel value={task.priority} />
        </TaskPill>
        {lane === "carried" && (
          <>
            <Button
              variant="secondary"
              className="h-8 min-h-8 rounded-full px-2 text-[10px]"
              disabled={saving}
              onClick={onContinue}
            >
              Continue Today
            </Button>
            <TaskRescheduleCalendar
              compact
              task={task}
              disabled={saving}
              onReschedule={onReschedule}
            />
          </>
        )}
        <TaskStatusSelect
          task={task}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
      </div>
    </article>
  );
}
/**
 * TEMPO-003-F37 - shortBoardDate
 * Purpose: Provides the existing shortBoardDate behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function shortBoardDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}
/**
 * TEMPO-003-F38 - mobileBoardSnapshot
 * Purpose: Provides the existing mobileBoardSnapshot behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function mobileBoardSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}
/**
 * TEMPO-003-F39 - subscribeMobileBoard
 * Purpose: Provides the existing subscribeMobileBoard behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function subscribeMobileBoard(listener: () => void) {
  const media = window.matchMedia("(max-width: 639px)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
