/**
 * TEMPO-003 - TaskFormSchedule: existing form fields sharing one state owner.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shiftDate } from "@/lib/validation/recurrence";
import { CalendarDays, Clock3 } from "lucide-react";
import { DateField } from "./task-form-date-field";
import { TaskSelect } from "./task-select";
import type { useTaskFormState } from "./use-task-form-state";
/**
 * TEMPO-003-F27 - TaskFormSchedule
 * Purpose: Provides the existing TaskFormSchedule behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function TaskFormSchedule({
  model,
}: {
  model: ReturnType<typeof useTaskFormState>;
}) {
  const { allowOverlap, setAllowOverlap, scheduleType, setScheduleType, timezone, startDate, setStartDate, endDate, setEndDate, startTime, setStartTime, endTime, setEndTime, dueDate, setDueDate, duration, setDuration, customHours, setCustomHours, customMinutes, setCustomMinutes, repeat, setError, errors, setErrors, today, currentTime, changeValue, changeDuration } = model;
  return (
    <>
      <div className="space-y-3 border-t border-border pt-4">
        <p className="flex items-center gap-2 text-xs font-medium">
          <CalendarDays className="size-4 text-primary" aria-hidden="true" />
          Schedule
        </p>
        <div
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          role="group"
          aria-label="Schedule type"
        >
          {(
            [
              ["flexible", "Flexible"],
              ["fixed", "Fixed Time"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={scheduleType === value ? "default" : "ghost"}
              aria-pressed={scheduleType === value}
              className="min-h-9"
              onClick={() => {
                setErrors({});
                setError(null);
                setScheduleType(value);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        {scheduleType === "fixed" ? (
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="Start date"
              type="date"
              value={startDate}
              onChange={(value) => {
                const shift =
                  endDate === startDate
                    ? 0
                    : Math.max(
                        0,
                        Math.round(
                          (Date.parse(endDate) - Date.parse(startDate)) /
                            86400000,
                        ),
                      );
                setStartDate(value);
                setEndDate(shiftDate(value, shift));
              }}
              minDate={today}
              required
            />
            <DateField
              label="Start time"
              type="time"
              value={startTime}
              onChange={changeValue(setStartTime)}
              minTime={
                repeat !== "none" && startDate === today
                  ? currentTime
                  : undefined
              }
              required
            />
            <DateField
              label="End date"
              type="date"
              value={endDate}
              onChange={changeValue(setEndDate)}
              minDate={today > startDate ? today : startDate || undefined}
              required
            />
            <DateField
              label="End time"
              type="time"
              value={endTime}
              onChange={changeValue(setEndTime)}

              required
            />
          </div>
        ) : (
          <DateField
            label="Due date (Optional)"
            type="date"
            value={dueDate}
            onChange={changeValue(setDueDate)}
            minDate={today}
          />
        )}
        {scheduleType === "fixed" &&
          endDate === startDate &&
          endTime <= startTime && (
            <div className="rounded-lg border border-border p-3 text-xs">
              <p>Ends the next day?</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setEndDate(shiftDate(startDate, 1))}
              >
                Yes, end on {shiftDate(startDate, 1)}
              </Button>
            </div>
          )}
        {scheduleType === "fixed" &&
          endDate > startDate &&
          repeat !== "none" && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={allowOverlap}
                onChange={(e) => setAllowOverlap(e.target.checked)}
              />
              Allow overlapping recurring sessions (these may reserve the same
              hours).
            </label>
          )}
        <p className="text-[11px] text-muted-foreground">
          Timezone: {timezone}.{" "}
          {scheduleType === "flexible"
            ? "No fixed time slot is reserved."
            : "Your chosen time window is saved as entered."}
        </p>
        {errors.schedule && (
          <p role="alert" className="text-xs text-destructive">
            {errors.schedule}
          </p>
        )}
      </div>
      <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-4" aria-hidden="true" />
          Estimate
        </span>
        <TaskSelect
          label="Estimated duration"
          value={duration}
          onChange={changeDuration}
          options={[
            { value: "none", label: "No estimate" },
            ...[15, 30, 45, 60, 120].map((minutes) => ({
              value: String(minutes),
              label:
                minutes >= 60
                  ? `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`
                  : `${minutes} minutes`,
            })),
            { value: "custom", label: "Custom" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs">
          Hours
          <Input
            aria-label="Estimated hours"
            type="number"
            min={0}
            max={24}
            step={1}
            placeholder="0"
            value={customHours}
            onChange={(event) => {
              setDuration("custom");
              setCustomHours(event.target.value);
            }}
            className="min-h-9 min-w-0 bg-muted/40"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs">
          Minutes
          <Input
            aria-label="Estimated minutes"
            type="number"
            min={0}
            max={59}
            step={1}
            placeholder="0"
            value={customMinutes}
            onChange={(event) => {
              setDuration("custom");
              setCustomMinutes(event.target.value);
            }}
            className="min-h-9 min-w-0 bg-muted/40"
          />
        </label>
      </div>
      {errors.estimatedMinutes && (
        <p role="alert" className="text-xs text-destructive">
          {errors.estimatedMinutes}
        </p>
      )}
    </>
  );
}
