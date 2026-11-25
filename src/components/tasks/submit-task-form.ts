/**
 * TEMPO-005 - Validated submission through parent-owned persistence.
 * Used by: TaskForm.onSubmit.
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
import { focusTaskIssue } from "./task-form-validation";

/**
 * TEMPO-005-F14 - submitTaskForm
 * Purpose: Validates input, reuses an idempotency key and calls the parent save callback.
 * Used by: TaskForm.onSubmit.
 * Trigger: The user submits with the create/save action or Enter.
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
    setError,
    setErrors,
    requestIdRef,
    selectedStartAt,
    selectedEndAt,
    notifyValidation,
  } = model;

  event.preventDefault();
  const form = event.currentTarget;
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
      focusTaskIssue(form, { path: ["estimatedMinutes", ...estimate.error.issues[0].path], message });
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
    focusTaskIssue(form, { path: ["schedule"], message });
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
    focusTaskIssue(form, parsed.error.issues[0]);
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
    focusTaskIssue(form, { path: ["form"], message });
  } finally {
    inFlightRef.current = false;
    setSaving(false);
  }
}
