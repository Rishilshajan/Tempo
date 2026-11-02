"use client";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createTaskSchema, localDateKey } from "@/lib/validation/task";
import { shiftDate, zonedTimestamp } from "@/lib/validation/recurrence";
import type { TaskRecord } from "./task-list";
import { detailError } from "./detail-shared";

export function TaskRescheduleCalendar({
  task,
  disabled,
  compact = false,
  onReschedule,
}: {
  task: TaskRecord;
  disabled?: boolean;
  compact?: boolean;
  onReschedule: (schedule: TaskRecord["schedule"]) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const current =
    task.schedule.type === "fixed"
      ? localDateKey(new Date(task.schedule.startAt), task.timezone)
      : task.schedule.dueDate;
  const today = localDateKey(new Date(), task.timezone);
  const asDate = (day: string) => new Date(`${day}T00:00:00`);
  async function select(date: Date | undefined) {
    if (!date || saving) return;
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      if (day < localDateKey(new Date(), task.timezone))
        throw new Error("Choose today or a future date.");
      if (day === current) {
        setOpen(false);
        return;
      }
      let schedule: TaskRecord["schedule"];
      if (task.schedule.type === "fixed") {
        const previous = task.schedule;
        const endDay = localDateKey(new Date(previous.endAt), task.timezone);
        const days = Math.round(
          (Date.parse(`${endDay}T00:00:00Z`) -
            Date.parse(`${current}T00:00:00Z`)) /
            86400000,
        );
        const clock = (at: number) =>
          new Intl.DateTimeFormat("en-GB", {
            timeZone: task.timezone,
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }).format(at);
        schedule = {
          type: "fixed",
          startAt: zonedTimestamp(day, clock(previous.startAt), task.timezone),
          endAt: zonedTimestamp(
            shiftDate(day, days),
            clock(previous.endAt),
            task.timezone,
          ),
        };
      } else schedule = { type: "flexible", dueDate: day };
      const parsed = createTaskSchema.safeParse({
        ...task,
        schedule,
        recurrence: undefined,
        subtasks: [],
        requestId: "00000000-0000-4000-8000-000000000000",
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      setSaving(true);
      await onReschedule(schedule);
      setOpen(false);
      toast.success("Task rescheduled.");
    } catch (error) {
      detailError(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        if (!saving) setOpen(value);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={
              compact
                ? "h-8 min-h-8 gap-1 rounded-full px-2 text-[10px]"
                : "min-h-11 px-3 text-xs"
            }
            disabled={disabled || saving}
          >
            <CalendarDays className="size-3.5" />
            {saving ? "Saving…" : "Reschedule"}
          </Button>
        }
      />
      <PopoverContent
        align="end"
        className="w-auto max-w-[calc(100vw-2rem)] p-0"
        aria-label="Reschedule task date"
      >
        <Calendar
          mode="single"
          selected={current ? asDate(current) : undefined}
          defaultMonth={asDate(current && current >= today ? current : today)}
          disabled={saving ? true : { before: asDate(today) }}
          required
          onSelect={(date) => void select(date)}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
