"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CalendarDays, Clock3, Repeat2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createTaskSchema, localDateKey } from "@/lib/validation/task";
import { zonedTimestamp } from "@/lib/validation/recurrence";
import { formatMinutes } from "@/lib/today-model";
import { errorMessage } from "@/components/today/today-dashboard";
import {
  TaskList,
  type TaskRecord,
  type SetTaskCompleted,
  type SetTaskProgress,
} from "./task-list";

export function TaskDetailSheet({
  id,
  onClose,
  onSetCompleted,
  onSetProgress,
}: {
  id: Id<"tasks"> | null;
  onClose: () => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
}) {
  const task = useQuery(api.tasks.get, id ? { id } : "skip");
  const reschedule = useMutation(api.tasks.reschedule);
  return (
    <Sheet
      open={id !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="!inset-y-auto !top-0 !h-dvh !w-full !max-w-[480px] gap-0 bg-card">
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle className="break-words text-lg">Task details</SheetTitle>
          <SheetDescription>
            Review your task, update its schedule, or mark it complete.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {task === undefined ? (
            <p role="status" className="py-8 text-sm text-muted-foreground">
              Loading task…
            </p>
          ) : task === null ? (
            <p role="alert" className="py-8 text-sm">
              This task is no longer available.
            </p>
          ) : (
            <TaskDetailContent
              key={task._id}
              task={task}
              onSetCompleted={onSetCompleted}
              onSetProgress={onSetProgress}
              onReschedule={(schedule) =>
                reschedule({ id: task._id, schedule })
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TaskDetailContent({
  task,
  onSetCompleted,
  onSetProgress,
  onReschedule,
}: {
  task: TaskRecord;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
  onReschedule: (schedule: TaskRecord["schedule"]) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [dueDate, setDueDate] = useState("");
  const dateTime = (at: number) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: task.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(at);
  function begin() {
    setError(null);
    if (task.schedule.type === "fixed") {
      setStartDate(
        localDateKey(new Date(task.schedule.startAt), task.timezone),
      );
      setEndDate(localDateKey(new Date(task.schedule.endAt), task.timezone));
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: task.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
      setStartTime(formatter.format(task.schedule.startAt));
      setEndTime(formatter.format(task.schedule.endAt));
    } else setDueDate(task.schedule.dueDate ?? "");
    setEditing(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    try {
      let schedule: TaskRecord["schedule"];
      if (task.schedule.type === "fixed") {
        if (
          !startDate ||
          !endDate ||
          !/^\d{2}:\d{2}$/.test(startTime) ||
          !/^\d{2}:\d{2}$/.test(endTime)
        )
          throw new Error("Choose a start and end date and time.");
        schedule = {
          type: "fixed",
          startAt: zonedTimestamp(
            startDate,
            startTime,
            task.timezone,
            task.schedule.startAt,
          ),
          endAt: zonedTimestamp(
            endDate,
            endTime,
            task.timezone,
            task.schedule.endAt,
          ),
        };
      } else schedule = { type: "flexible", ...(dueDate ? { dueDate } : {}) };
      const parsed = createTaskSchema.safeParse({
        ...task,
        schedule,
        subtasks: [],
        requestId: "00000000-0000-4000-8000-000000000000",
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      setSaving(true);
      await onReschedule(schedule);
      setEditing(false);
      toast.success("Task rescheduled.");
    } catch (cause) {
      const message =
        cause instanceof Error && !("data" in cause)
          ? cause.message
          : errorMessage(
              cause,
              "Couldn’t reschedule this task. Please try again.",
            );
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-6">
      <TaskList
        tasks={[task]}
        isToday={false}
        onSetCompleted={onSetCompleted}
        onSetProgress={onSetProgress}
      />
      <section aria-label="Task schedule" className="space-y-3 text-xs">
        <p className="flex items-center gap-2 font-medium">
          <CalendarDays className="size-4 text-primary" aria-hidden="true" />
          {task.schedule.type === "fixed" ? "Fixed time" : "Flexible schedule"}
        </p>
        <p className="leading-6 text-muted-foreground">
          {task.schedule.type === "fixed"
            ? `${dateTime(task.schedule.startAt)} – ${dateTime(task.schedule.endAt)}`
            : task.schedule.dueDate
              ? `Due ${task.schedule.dueDate}`
              : "No due date. Work on this task anytime."}
        </p>
        <p className="text-muted-foreground">Timezone: {task.timezone}</p>
        {!!task.estimatedMinutes && (
          <p className="flex items-center gap-2">
            <Clock3 className="size-4 text-primary" aria-hidden="true" />
            {formatMinutes(task.estimatedMinutes)} estimated
          </p>
        )}
        {task.recurrence && (
          <p className="flex items-center gap-2">
            <Repeat2 className="size-4 text-primary" aria-hidden="true" />
            Repeats every {task.recurrence.interval} {task.recurrence.unit}
            {task.recurrence.interval > 1 ? "s" : ""}
            {task.recurrence.end.type === "date"
              ? `, until ${task.recurrence.end.date}`
              : task.recurrence.end.type === "count"
                ? `, up to ${task.recurrence.end.count} occurrences`
                : ""}
          </p>
        )}
      </section>
      {task.status === "open" && !editing && (
        <Button variant="secondary" className="min-h-10 w-full" onClick={begin}>
          <CalendarDays aria-hidden="true" />
          Reschedule task
        </Button>
      )}
      {task.status === "open" && editing && (
        <form
          onSubmit={save}
          noValidate
          className="space-y-4 rounded-xl border border-border p-4"
        >
          <h3 className="text-sm font-medium">Reschedule task</h3>
          <fieldset disabled={saving} className="space-y-4">
            {task.schedule.type === "fixed" ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs">Start</label>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    ariaLabel="Reschedule start date"
                    required
                    className="w-full"
                  />
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                    ariaLabel="Reschedule start time"
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs">End</label>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    ariaLabel="Reschedule end date"
                    required
                    minDate={startDate}
                    className="w-full"
                  />
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    ariaLabel="Reschedule end time"
                    required
                    className="w-full"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-xs">Due date (optional)</label>
                <DatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  ariaLabel="Reschedule due date"
                  className="w-full"
                />
              </div>
            )}
            <p className="text-[11px] leading-5 text-muted-foreground">
              Dates and times use {task.timezone}. Subtask dates stay as set.
            </p>
          </fieldset>
          {error && (
            <p role="alert" className="text-xs leading-5 text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-10"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-10" disabled={saving}>
              {saving ? "Saving…" : "Save schedule"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
