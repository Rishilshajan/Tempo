"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { createTaskSchema, localDateKey } from "@/lib/validation/task";
import { zonedTimestamp } from "@/lib/validation/recurrence";
import type { TaskRecord } from "./task-list";
import { TaskSelect } from "./task-select";
import { detailError } from "./detail-shared";

/** Shared by the real drawer and the isolated sample preview. */
export function TaskScheduleForm({
  task,
  onReschedule,
  onCancel,
  onSaved,
}: {
  task: TaskRecord;
  onReschedule: (schedule: TaskRecord["schedule"]) => Promise<unknown>;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const schedule = task.schedule;
  const today = localDateKey(new Date(), task.timezone);
  const clock = (at: number) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: task.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(at);
  const [type, setType] = useState(schedule.type);
  const [startDate, setStartDate] = useState(
    schedule.type === "fixed"
      ? localDateKey(new Date(schedule.startAt), task.timezone)
      : today,
  );
  const [endDate, setEndDate] = useState(
    schedule.type === "fixed"
      ? localDateKey(new Date(schedule.endAt), task.timezone)
      : today,
  );
  const [startTime, setStartTime] = useState(
    schedule.type === "fixed" ? clock(schedule.startAt) : "",
  );
  const [endTime, setEndTime] = useState(
    schedule.type === "fixed" ? clock(schedule.endAt) : "",
  );
  const [dueDate, setDueDate] = useState(
    schedule.type === "flexible" ? (schedule.dueDate ?? "") : "",
  );
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    try {
      if (task.status === "completed")
        throw new Error("Reopen this task before rescheduling it.");
      let next: TaskRecord["schedule"];
      if (type === "fixed") {
        if (
          !startDate ||
          !endDate ||
          !/^\d{2}:\d{2}$/.test(startTime) ||
          !/^\d{2}:\d{2}$/.test(endTime)
        )
          throw new Error("Choose a start and end date and time.");
        next = {
          type: "fixed",
          startAt: zonedTimestamp(
            startDate,
            startTime,
            task.timezone,
            schedule.type === "fixed" ? schedule.startAt : undefined,
          ),
          endAt: zonedTimestamp(
            endDate,
            endTime,
            task.timezone,
            schedule.type === "fixed" ? schedule.endAt : undefined,
          ),
        };
      } else next = { type: "flexible", ...(dueDate ? { dueDate } : {}) };
      const parsed = createTaskSchema.safeParse({
        ...task,
        schedule: next,
        subtasks: [],
        requestId: "00000000-0000-4000-8000-000000000000",
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      setBusy(true);
      await onReschedule(next);
      toast.success("Task rescheduled.");
      onSaved();
    } catch (error) {
      detailError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        <TaskSelect
          label="Task schedule type"
          value={type}
          onChange={(next) => setType(next as TaskRecord["schedule"]["type"])}
          options={[
            { value: "fixed", label: "Fixed timeblock" },
            { value: "flexible", label: "Flexible schedule" },
          ]}
        />
        {type === "fixed" ? (
          <>
            <div className="space-y-2">
              <p className="text-xs">Start</p>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  ariaLabel="Reschedule start date"
                  required
                  minDate={today}
                />
                <TimePicker
                  value={startTime}
                  onChange={setStartTime}
                  ariaLabel="Reschedule start time"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs">End</p>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  ariaLabel="Reschedule end date"
                  required
                  minDate={startDate > today ? startDate : today}
                />
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  ariaLabel="Reschedule end time"
                  required
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs">Due date (optional)</p>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              ariaLabel="Reschedule due date"
              minDate={today}
            />
          </div>
        )}
        <p className="text-[11px] leading-5 text-muted-foreground">
          Dates and times use {task.timezone}. Subtask dates stay as set.
        </p>
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save schedule"}
        </Button>
      </div>
    </form>
  );
}
