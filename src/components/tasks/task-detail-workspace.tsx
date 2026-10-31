"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  ListChecks,
  GitBranch,
  Activity,
  NotebookPen,
  CalendarDays,
  CheckCheck,
  Clock3,
  MoreHorizontal,
  Pencil,
  Repeat2,
  X,
  CircleDot,
  Flag,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { DescriptionPreview } from "./description-preview";
import {
  SheetClose,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DomainLabel } from "@/components/domains/domain-appearance";
import { formatMinutes } from "@/lib/today-model";
import { localDateKey } from "@/lib/validation/task";
import type {
  TaskRecord,
  SetTaskCompleted,
  SetTaskProgress,
} from "./task-list";
import { TaskPill, TaskStatusSelect } from "./task-status";
import { PriorityLabel } from "./task-select";
import { DetailSubtasks } from "./detail-subtasks";
import { DetailThreads } from "./detail-threads";
import { DetailActivity } from "./detail-activity";
import { DetailNotes } from "./detail-notes";
import { EditTaskSheet } from "./edit-task-sheet";
import { taskTimestamp } from "@/lib/task-datetime";
import { TaskRescheduleCalendar } from "./task-reschedule-calendar";
import { detailError } from "./detail-shared";

export function TaskDetailWorkspace({
  task,
  onSetCompleted,
  onSetProgress,
  onOpenTask,
  onBack,
}: {
  task: TaskRecord;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
  onOpenTask: (id: Id<"tasks">) => void;
  onBack?: () => void;
}) {
  const [tab, setTab] = useState("subtasks");
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const mobileSectionId = useId();
  const mobileBack = useRef<HTMLButtonElement>(null);
  const sections = [
    {
      value: "subtasks",
      label: "Subtasks",
      icon: ListChecks,
      count: `${task.subtasks.filter((step) => step.completedAt !== undefined).length}/${task.subtasks.length}`,
    },
    {
      value: "thread",
      label: "Threads",
      icon: GitBranch,
      count: task.threadCount || undefined,
    },
    { value: "activity", label: "Activity", icon: Activity, count: undefined },
    {
      value: "notes",
      label: "Notes",
      icon: NotebookPen,
      count: task.notesCount || undefined,
    },
  ];
  const [dialog, setDialog] = useState<"edit" | null>(null);
  const [busy, setBusy] = useState(false);
  const reschedule = useMutation(api.tasks.reschedule);
  const completedSteps = task.subtasks.filter(
    (step) => step.completedAt !== undefined,
  ).length;
  const fixed = task.schedule.type === "fixed" ? task.schedule : null;
  const today = localDateKey(new Date(), task.timezone);
  const scheduleText = fixed
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: task.timezone,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatRange(fixed.startAt, fixed.endAt)
    : "Flexible schedule";
  async function completeTask() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await onSetCompleted(task._id, task.status !== "completed");
      toast.success(
        task.status === "completed" ? "Task reopened." : "Task completed.",
      );
      if (typeof next === "string")
        toast.success("Next recurring task created.");
    } catch (error) {
      detailError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div
        className={`min-h-0 flex-1 sm:contents ${mobileSectionOpen ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}
      >
        <header className="shrink-0 border-b border-border pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3 px-4 pb-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <SheetTitle
                title={task.title}
                className="line-clamp-2 break-words text-lg font-semibold leading-7 [overflow-wrap:anywhere]"
              >
                {task.title}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Task details, subtasks, thread, activity, and notes.
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center">
              {onBack && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-9"
                  onClick={onBack}
                  aria-label="Back to previous task"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-9"
                      aria-label="Task actions"
                      disabled={busy}
                    />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setDialog("edit")}>
                    <Pencil />
                    Edit task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-9"
                    aria-label="Close task details"
                  />
                }
              >
                <X className="size-4" />
              </SheetClose>
            </div>
          </div>
          <div
            className={`${mobileSectionOpen ? "hidden sm:block" : ""} space-y-3 px-4 pb-4 sm:max-h-[43dvh] sm:overflow-y-auto sm:px-5`}
          >
            <dl className="space-y-2 text-xs">
              <DetailRow icon={<CalendarDays />} label="Created time">
                <time dateTime={new Date(task._creationTime).toISOString()}>
                  {taskTimestamp(task._creationTime, task.timezone)}
                </time>
              </DetailRow>
              <DetailRow icon={<CircleDot />} label="Status">
                <TaskStatusSelect
                  task={task}
                  disabled={busy}
                  onBusyChange={setBusy}
                  onSetCompleted={onSetCompleted}
                  onSetProgress={onSetProgress}
                />
              </DetailRow>
              <DetailRow icon={<Flag />} label="Priority">
                <TaskPill
                  tone={
                    task.priority === "urgent"
                      ? "overdue"
                      : task.priority === "low"
                        ? "completed"
                        : "progress"
                  }
                >
                  <PriorityLabel value={task.priority} />
                </TaskPill>
              </DetailRow>
              <DetailRow icon={<Layers />} label="Domain">
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  {task.domain ? (
                    <DomainLabel {...task.domain} />
                  ) : (
                    "Uncategorized"
                  )}
                </span>
              </DetailRow>
              <DetailRow icon={<CalendarDays />} label="Schedule">
                {scheduleText}
              </DetailRow>
              {task.schedule.type === "flexible" && (
                <DetailRow icon={<CalendarDays />} label="Due date">
                  {task.schedule.dueDate ?? "No due date"}
                </DetailRow>
              )}
              <DetailRow icon={<Clock3 />} label="Estimate">
                {task.estimatedMinutes
                  ? formatMinutes(task.estimatedMinutes)
                  : "Not set"}
              </DetailRow>
              {task.recurrence && (
                <DetailRow icon={<Repeat2 />} label="Repeat">
                  {task.recurrence.frequency === "weekdays"
                    ? "Monday–Friday"
                    : `Every ${task.recurrence.interval} ${task.recurrence.unit}${task.recurrence.interval > 1 ? "s" : ""}`}
                </DetailRow>
              )}
            </dl>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="mb-1 text-xs font-medium">Description</p>
              {task.description ? (
                <DescriptionPreview text={task.description} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  No description added.
                </p>
              )}
            </div>
          </div>
        </header>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (typeof value === "string") setTab(value);
          }}
          className={`flex min-h-0 flex-col sm:flex-1 ${mobileSectionOpen ? "flex-1" : "flex-none"}`}
        >
          {!mobileSectionOpen ? (
            <nav
              aria-label="Task detail sections"
              className="grid grid-cols-2 gap-2 p-4 sm:hidden"
            >
              {sections.map(({ value, label, icon: Icon, count }) => (
                <button
                  key={value}
                  id={`${mobileSectionId}-${value}`}
                  type="button"
                  className="flex min-h-14 items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-medium hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => {
                    setTab(value);
                    setMobileSectionOpen(true);
                    requestAnimationFrame(() => mobileBack.current?.focus());
                  }}
                >
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <span>
                    {label}
                    {count !== undefined && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </nav>
          ) : (
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 sm:hidden">
              <Button
                ref={mobileBack}
                variant="ghost"
                size="icon"
                aria-label="Back to task details"
                className="size-10"
                onClick={() => {
                  setMobileSectionOpen(false);
                  requestAnimationFrame(() =>
                    document
                      .getElementById(`${mobileSectionId}-${tab}`)
                      ?.focus(),
                  );
                }}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <span className="ml-auto text-xs font-medium">
                {sections.find((section) => section.value === tab)?.label}
              </span>
            </div>
          )}
          <TabsList aria-label="Task details tabs" className="hidden sm:grid">
            <TabsTrigger value="subtasks">
              Subtasks{" "}
              <span className="rounded bg-primary/10 px-1 text-[9px] text-primary">
                {completedSteps}/{task.subtasks.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="thread">
              Thread
              {(task.threadCount ?? 0) > 0 && (
                <span className="text-[9px]">{task.threadCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="notes">
              Notes
              {(task.notesCount ?? 0) > 0 && (
                <span className="text-[9px]">{task.notesCount}</span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="subtasks"
            className={mobileSectionOpen ? "" : "hidden sm:block"}
          >
            {tab === "subtasks" && (
              <DetailSubtasks task={task} onSetCompleted={onSetCompleted} />
            )}
          </TabsContent>
          <TabsContent
            value="thread"
            className={mobileSectionOpen ? "" : "hidden sm:block"}
          >
            {tab === "thread" && (
              <DetailThreads
                task={task}
                onOpenTask={onOpenTask}
                onSetCompleted={onSetCompleted}
                onSetProgress={onSetProgress}
              />
            )}
          </TabsContent>
          <TabsContent
            value="activity"
            className={mobileSectionOpen ? "" : "hidden sm:block"}
          >
            {tab === "activity" && <DetailActivity task={task} />}
          </TabsContent>
          <TabsContent
            value="notes"
            className={mobileSectionOpen ? "" : "hidden sm:block"}
          >
            {tab === "notes" && <DetailNotes task={task} />}
          </TabsContent>
        </Tabs>
      </div>
      <footer className="shrink-0 space-y-2 border-t border-border bg-muted/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
          <Button
            className="min-h-11 text-xs"
            onClick={() => void completeTask()}
            disabled={busy}
          >
            <CheckCheck className="size-4" />
            {busy
              ? "Saving…"
              : task.status === "completed"
                ? "Reopen task"
                : "Mark complete"}
          </Button>
          <TaskRescheduleCalendar
            task={task}
            disabled={busy || task.status === "completed"}
            onReschedule={(schedule) => reschedule({ id: task._id, schedule })}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11"
                  aria-label="More task actions"
                  disabled={busy}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setDialog("edit")}>
                <Pencil />
                Edit task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {task.status === "open" && task.workDate && task.workDate <= today && (
          <p className="text-[10px] leading-4 text-muted-foreground">
            {task.lastRolledOn && task.originalWorkDate
              ? `Rolled forward ×${task.rollForwardCount ?? 1} from ${task.originalWorkDate}. Working date: ${task.workDate}.`
              : task.workDate < today
                ? `Carried forward from ${task.workDate}.`
                : "Roll forward tomorrow if unfinished."}{" "}
            The original deadline stays unchanged.
          </p>
        )}
      </footer>
      {dialog === "edit" && (
        <EditTaskSheet task={task} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[100px_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[120px_minmax(0,1fr)]">
      <dt className="flex items-center gap-2 text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 break-words leading-5 [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}
