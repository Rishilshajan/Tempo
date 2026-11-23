/**
 * TEMPO-003 - Existing task form validation and submit action; no new persistence path.
 * Code map: src/components/code-map.md.
 */
"use client";
import {
  createTaskSchema,
  durationInputSchema,
  editTaskSchema,
  localDateKey,
} from "@/lib/validation/task";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import type { useTaskFormState } from "./use-task-form-state";
/**
 * TEMPO-003-F25 - submitTaskForm
 * Purpose: Validates and submits the existing task form without a second mutation path.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export async function submitTaskForm(
  event: React.FormEvent<HTMLFormElement>,
  model: ReturnType<typeof useTaskFormState>,
) {
  const {
    canSubmit,
    onCreate,
    onOpenChange,
    setSaving,
    inFlightRef,
    editingTask,
    editScope,
    allowOverlap,
    repeatDays,
    monthlyMissing,
    title,
    description,
    domainId,
    priority,
    scheduleType,
    timezone,
    startDate,
    endDate,
    timeOf,
    startTime,
    endTime,
    dueDate,
    duration,
    customHours,
    customMinutes,
    repeat,
    repeatInterval,
    repeatUnit,
    repeatEnd,
    repeatEndDate,
    repeatCount,
    steps,
    stepTitle,
    error,
    setError,
    setErrors,
    requestIdRef,
    selectedStartAt,
    selectedEndAt,
    notifyValidation,
  } = model;

  event.preventDefault();
  if (!canSubmit || inFlightRef.current) return;
  if (duration !== "none") {
    const estimate = durationInputSchema.safeParse({
      hours: customHours,
      minutes: customMinutes,
    });
    if (!estimate.success) {
      const message = estimate.error.issues[0].message;
      setErrors({ estimatedMinutes: message });
      notifyValidation(message);
      return;
    }
  }
  requestIdRef.current ??= crypto.randomUUID();
  const startAt = selectedStartAt;
  const endAt = selectedEndAt;
  // Date controls use the browser timezone shown below. Reject nonexistent DST times.
  if (
    scheduleType === "fixed" &&
    [
      [startDate, startTime, startAt],
      [endDate, endTime, endAt],
    ].some(([date, time, at]) => {
      const value = new Date(Number(at));
      return (
        !Number.isFinite(Number(at)) ||
        localDateKey(value, timezone) !== date ||
        timeOf(Number(at)) !== time
      );
    })
  ) {
    const message = "Choose valid dates and times in your timezone.";
    setErrors({ schedule: message });
    notifyValidation(message);
    return;
  }
  const allSteps = [
    ...steps.map(({ title, dueDate }) => ({
      title,
      ...(dueDate ? { dueDate } : {}),
    })),
    ...(stepTitle.trim() ? [{ title: stepTitle.trim() }] : []),
  ];
  const stepKeys = [
    ...steps.map((step) => step.key),
    ...(stepTitle.trim() ? [`${requestIdRef.current}:pending`] : []),
  ];
  const schema = editingTask
    ? editTaskSchema(
        { ...editingTask, requestId: requestIdRef.current },
        stepKeys,
        editingTask.subtasks.map((step) => step.id),
        !!editingTask.recurrence && editScope === "this",
      )
    : createTaskSchema;
  const parsed = schema.safeParse({
    allowOverlap,
    title,
    description,
    ...(domainId !== "uncategorized" ? { domainId } : {}),
    priority,
    schedule:
      scheduleType === "fixed"
        ? { type: "fixed", startAt, endAt }
        : { type: "flexible", ...(dueDate ? { dueDate } : {}) },
    timezone,
    ...(duration !== "none"
      ? {
          estimatedMinutes:
            Number(customHours || 0) * 60 + Number(customMinutes || 0),
        }
      : {}),
    subtasks: allSteps,
    requestId: requestIdRef.current,
    ...(repeat !== "none"
      ? {
          recurrence:
            editingTask?.recurrence && editScope === "this"
              ? editingTask.recurrence
              : {
                  ...(repeat === "weekly" ||
                  (repeat === "custom" && repeatUnit === "week")
                    ? { weekdays: repeatDays }
                    : {}),
                  monthlyMissing,
                  frequency: repeat,
                  interval: repeat === "custom" ? Number(repeatInterval) : 1,
                  unit:
                    repeat === "daily" || repeat === "weekdays"
                      ? "day"
                      : repeat === "weekly"
                        ? "week"
                        : repeat === "monthly"
                          ? "month"
                          : repeatUnit,
                  end:
                    repeatEnd === "date"
                      ? { type: "date", date: repeatEndDate }
                      : repeatEnd === "count"
                        ? { type: "count", count: Number(repeatCount) }
                        : { type: "never" },
                },
        }
      : {}),
  });
  if (!parsed.success) {
    setErrors(
      Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      ),
    );
    notifyValidation(parsed.error.issues[0].message);
    return;
  }
  setErrors({});
  setError(null);
  inFlightRef.current = true;
  setSaving(true);
  try {
    await onCreate(parsed.data, stepKeys, editScope);
    onOpenChange(false);
  } catch (cause) {
    const message =
      cause instanceof ConvexError && typeof cause.data === "string"
        ? cause.data
        : "We couldn't save this task. Your changes are still here; please try again.";
    setError(message);
    toast.error(message, { id: "task-save-error" });
  } finally {
    inFlightRef.current = false;
    setSaving(false);
  }
}
