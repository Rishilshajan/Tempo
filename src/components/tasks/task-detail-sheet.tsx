"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { CalendarDays, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TaskList,
  type TaskRecord,
  type SetTaskCompleted,
  type SetTaskProgress,
} from "./task-list";
import { TaskDetailWorkspace } from "./task-detail-workspace";
import { TaskScheduleForm } from "./task-schedule-form";

type Actions = {
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
};
export function TaskDetailSheet({
  id,
  onClose,
  ...actions
}: Actions & { id: Id<"tasks"> | null; onClose: () => void }) {
  return (
    <Sheet
      open={id !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        data-task-detail-drawer=""
        showCloseButton={false}
        className="!inset-y-auto !top-0 !left-0 !right-auto !h-dvh !w-dvw !max-w-none gap-0 overflow-hidden bg-card sm:!left-auto sm:!right-0 sm:!w-full sm:!max-w-[540px]"
      >
        {id && <DetailSession key={id} initialId={id} {...actions} />}
      </SheetContent>
    </Sheet>
  );
}
function DetailSession({
  initialId,
  ...actions
}: Actions & { initialId: Id<"tasks"> }) {
  const [history, setHistory] = useState<Id<"tasks">[]>([initialId]);
  const id = history[history.length - 1];
  const task = useQuery(api.tasks.get, { id });
  if (!task)
    return (
      <>
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle>Task details</SheetTitle>
          <SheetDescription>
            {task === undefined
              ? "Loading your task…"
              : "This task is no longer available."}
          </SheetDescription>
        </SheetHeader>
        <SheetClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3"
              aria-label="Close task details"
            />
          }
        >
          <X className="size-4" />
        </SheetClose>
        <p
          role={task === undefined ? "status" : "alert"}
          className="p-5 text-sm text-muted-foreground"
        >
          {task === undefined
            ? "Loading task…"
            : "It may have been removed or you may no longer have access."}
        </p>
        {history.length > 1 && (
          <Button
            variant="outline"
            className="mx-5"
            onClick={() => setHistory((previous) => previous.slice(0, -1))}
          >
            Back to previous task
          </Button>
        )}
      </>
    );
  return (
    <TaskDetailWorkspace
      key={id}
      task={task}
      {...actions}
      onOpenTask={(next) => setHistory((previous) => [...previous, next])}
      onBack={
        history.length > 1
          ? () => setHistory((previous) => previous.slice(0, -1))
          : undefined
      }
    />
  );
}

/** The isolated sample dashboard uses the same task actions and scheduling form. */
export function TaskDetailContent({
  task,
  onSetCompleted,
  onSetProgress,
  onReschedule,
}: Actions & {
  task: TaskRecord;
  onReschedule: (schedule: TaskRecord["schedule"]) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-5">
      <TaskList
        tasks={[task]}
        isToday={false}
        onSetCompleted={onSetCompleted}
        onSetProgress={onSetProgress}
      />
      {task.status === "open" &&
        (editing ? (
          <TaskScheduleForm
            task={task}
            onReschedule={onReschedule}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        ) : (
          <Button
            variant="secondary"
            className="min-h-10 w-full"
            onClick={() => setEditing(true)}
          >
            <CalendarDays />
            Reschedule task
          </Button>
        ))}
    </div>
  );
}
