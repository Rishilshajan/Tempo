/**
 * TEMPO-003 - TaskDetailWorkspace: composes reused presentation and a single state hook.
 * Code map: src/components/code-map.md.
 */
"use client";
import { DomainLabel } from "@/components/domains/domain-appearance";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SheetClose,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOverlayBack } from "@/hooks/use-overlay-back";
import { taskTimestamp } from "@/lib/task-datetime";
import { formatMinutes } from "@/lib/today-model";
import { localDateKey } from "@/lib/validation/task";
import { useMutation } from "convex/react";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCheck,
  CircleDot,
  Clock3,
  Flag,
  GitBranch,
  Layers,
  ListChecks,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Repeat2,
  Trash2,
  X,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DescriptionPreview } from "./description-preview";
import { DetailActivity } from "./detail-activity";
import { DetailNotes } from "./detail-notes";
import { ConfirmDelete, detailError, DetailRow } from "./detail-shared";
import { DetailSubtasks } from "./detail-subtasks";
import { DetailThreads } from "./detail-threads";
import { EditTaskSheet } from "./edit-task-sheet";
import type {
  SetTaskCompleted,
  SetTaskProgress,
  TaskRecord,
} from "./task-list";
import { TaskRescheduleCalendar } from "./task-reschedule-calendar";
import { PriorityLabel } from "./task-select";
import { TaskPill, TaskStatusSelect } from "./task-status";

import { useTaskDetailWorkspace } from "./use-task-detail-workspace";
/**
 * TEMPO-003-F41 - TaskDetailWorkspace
 * Purpose: Provides the existing TaskDetailWorkspace behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function TaskDetailWorkspace(input: Parameters<typeof useTaskDetailWorkspace>[0]) {
 const model=useTaskDetailWorkspace(input);
 const { task, onSetCompleted, onSetProgress, onOpenTask, onBack, onDeleted, tab, setTab, mobileSectionOpen, setMobileSectionOpen, mobileSectionId, mobileBack, sections, dialog, setDialog, busy, setBusy, remove, reschedule, completedSteps, fixed, today, subtaskCount, progress, scheduleText, completeTask }=model;
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
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDialog("delete")}
                  >
                    <Trash2 />
                    Delete task
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
              <DetailRow icon={<Activity />} label="Progress">
                <div className="flex max-w-64 items-center gap-2">
                  <progress
                    aria-label="Task progress"
                    value={progress}
                    max={100}
                    className="h-2 min-w-0 flex-1 appearance-none overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
                  />
                  <span className="tabular-nums">{progress}%</span>
                </div>
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
                    : task.recurrence.weekdays?.length
                      ? task.recurrence.weekdays
                          .map(
                            (day) =>
                              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                                day
                              ],
                          )
                          .join(", ")
                      : `Every ${task.recurrence.interval} ${task.recurrence.unit}${task.recurrence.interval > 1 ? "s" : ""}`}
                </DetailRow>
              )}
              {task.recurrence && (
                <DetailRow icon={<CalendarDays />} label="Repeat ends">
                  {task.recurrence.end.type === "date"
                    ? new Intl.DateTimeFormat("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(
                        new Date(task.recurrence.end.date + "T12:00:00Z"),
                      )
                    : task.recurrence.end.type === "count"
                      ? task.recurrence.end.count +
                        " sessions (including first)"
                      : "No end date"}
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
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Button
            className="min-h-11 text-xs"
            onClick={() => void completeTask()}
            disabled={busy || task.recurrencePlanned}
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
      {dialog === "delete" && (
        <ConfirmDelete
          title="Delete task?"
          description={`“${task.title}” and its subtasks and notes will be permanently deleted.`}
          confirmLabel="Delete task"
          onClose={() => setDialog(null)}
          onDelete={async () => {
            await remove({ id: task._id });
            toast.success("Task deleted.");
            onDeleted();
          }}
        />
      )}
      {dialog === "edit" && (
        <EditTaskSheet task={task} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
