/**
 * TEMPO-004 - Shared Kanban lanes, cards, list and calendar-agenda rows.
 * Used by: MyTasksBoard; MyTasksCalendar. Shared consumers remain supported.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { type Lane } from "@/lib/kanban-model";
import { taskTimestamp } from "@/lib/task-datetime";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  History,
  Plus,
} from "lucide-react";
import { type ReactNode } from "react";
import { columns } from "./board-config";
import {
  type SetTaskCompleted,
  type SetTaskProgress,
  type TaskRecord,
} from "./task-list";
import { TaskMetadataPills } from "./task-metadata-pills";
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
 * TEMPO-004-F08 - LaneColumn
 * Purpose: Renders a collapsible drop target with lane count and empty state.
 * Used by: MyTasksBoard.
 * Trigger: Each visible Kanban/List lane renders.
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
 * TEMPO-004-F09 - BoardCard
 * Purpose: Renders a draggable Kanban card or delegates to the compact row.
 * Used by: MyTasksBoard; DragOverlay.
 * Trigger: A lane task or drag preview renders.
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
      <div className="flex items-start gap-2">
        <button type="button" className={`min-w-0 flex-1 break-words text-left text-xs font-medium leading-5 hover:text-primary ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`} onClick={() => onOpen(task)}>{task.title}</button>
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
      <div className="task-metadata-strip flex flex-wrap items-center gap-1.5 text-[10px]">
        <TaskMetadataPills task={task} carried={lane === "carried"} onOpen={() => onOpen(task)} />
        <TaskPill tone={task.priority === "urgent" ? "overdue" : task.priority === "high" ? "progress" : "neutral"}><PriorityLabel value={task.priority} /></TaskPill>
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

        <TaskStatusSelect
          task={task}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
        {lane === "carried" && (
          <TaskRescheduleCalendar iconOnly task={task} disabled={saving} onReschedule={onReschedule} />
        )}
      </div>
    </article>
  );
}

/**
 * TEMPO-004-F10 - CompactBoardRow
 * Purpose: Renders the shared List and Calendar-agenda task row.
 * Used by: BoardCard; MyTasksBoard calendar renderTask.
 * Trigger: A List row or selected-day calendar card renders.
 */
export function CompactBoardRow({
  task,
  lane,
  saving,
  onOpen,
  onSetCompleted,
  onSetProgress,
  onReschedule,
}: Omit<BoardCardProps, "compact">) {
  const completed = task.status === "completed";
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
      <div className="min-w-0 flex-1 basis-40">
        <button
          type="button"
          className={`w-full break-words text-left text-xs font-medium leading-5 hover:text-primary ${completed ? "line-through text-muted-foreground" : ""}`}
          onClick={() => onOpen(task)}
        >
          {task.title}
        </button>
        <div className="task-metadata-strip mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
          <TaskMetadataPills
            task={task}
            carried={lane === "carried"}
            onOpen={() => onOpen(task)}
          />
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
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto">


        <TaskStatusSelect
          disabled={saving}
          task={task}
          onSetCompleted={onSetCompleted}
          onSetProgress={onSetProgress}
        />
        {lane === "carried" && (
          <TaskRescheduleCalendar iconOnly task={task} disabled={saving} onReschedule={onReschedule} />
        )}
      </div>
    </article>
  );
}

/**
 * TEMPO-004-F11 - shortBoardDate
 * Purpose: Formats a stored calendar date for a badge or filter label.
 * Used by: useMyTasksBoard active-filter labels.
 * Trigger: A custom or range filter label is computed.
 */
export function shortBoardDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

/**
 * TEMPO-004-F12 - mobileBoardSnapshot
 * Purpose: Reads the mobile breakpoint for useSyncExternalStore.
 * Used by: useMyTasksBoard/useSyncExternalStore.
 * Trigger: React reads the responsive snapshot.
 */
export function mobileBoardSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}

/**
 * TEMPO-004-F13 - subscribeMobileBoard
 * Purpose: Subscribes to responsive breakpoint changes and returns cleanup.
 * Used by: useMyTasksBoard/useSyncExternalStore.
 * Trigger: Subscription setup and breakpoint changes; returns cleanup.
 */
export function subscribeMobileBoard(listener: () => void) {
  const media = window.matchMedia("(max-width: 639px)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
