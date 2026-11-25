/**
 * TEMPO-005 - Single draft-state owner and derived validation.
 * Used by: TaskForm.
 * Code map: src/components/code-map.md.
 */
"use client";
import { taskTimeDefaults } from "@/lib/task-time-defaults";
import { zonedTimestamp } from "@/lib/validation/recurrence";
import {
  editTaskDateIssues,
  localDateKey,
  taskDateIssues,
} from "@/lib/validation/task";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Props, Step } from "./task-form-types";

/**
 * TEMPO-005-F03 - useTaskFormState
 * Purpose: Owns draft fields, prefills, clock, errors and subtask actions.
 * Used by: TaskForm.
 * Trigger: The form mounts, a field changes or its clock refreshes.
 */
export function useTaskFormState({
  domains,
  initialDomainId,
  initialDate,
  initialStartAt,
  canSubmit,
  onCreate,
  onOpenChange,
  saving,
  setSaving,
  inFlightRef,
  hasMoreDomains,
  loadingMoreDomains,
  onLoadMoreDomains,
  editingTask,
}: Props & {
  saving: boolean;
  setSaving: (saving: boolean) => void;
  inFlightRef: React.RefObject<boolean>;
}) {
  const [editScope, setEditScope] = useState<"this" | "future">("this");
  const [allowOverlap, setAllowOverlap] = useState(
    editingTask?.allowOverlap ?? false,
  );
  const [monthlyMissing, setMonthlyMissing] = useState(
    editingTask?.recurrence?.monthlyMissing ?? "last_day",
  );
  const [title, setTitle] = useState(editingTask?.title ?? "");
  const [description, setDescription] = useState(
    editingTask?.description ?? "",
  );
  const [domainId, setDomainId] = useState(
    editingTask?.domainId ?? initialDomainId ?? "uncategorized",
  );
  const [priority, setPriority] = useState<string>(
    editingTask?.priority ?? "medium",
  );
  const [scheduleType, setScheduleType] = useState<"fixed" | "flexible">(
    editingTask?.schedule.type ??
      (initialStartAt === undefined ? "flexible" : "fixed"),
  );
  const [timezone] = useState(
    () =>
      editingTask?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [fixedDefaults] = useState(() =>
    taskTimeDefaults(Date.now(), timezone, initialDate, initialStartAt),
  );
  // Weekly selection derives its first weekday from the current schedule.
  const [repeatDays, setRepeatDays] = useState<number[]>(
    editingTask?.recurrence?.weekdays ?? [],
  );
  const [startDate, setStartDate] = useState(() =>
    editingTask?.schedule.type === "fixed"
      ? localDateKey(new Date(editingTask.schedule.startAt), timezone)
      : localDateKey(new Date(fixedDefaults.startAt), timezone),
  );
  const [endDate, setEndDate] = useState(() =>
    editingTask?.schedule.type === "fixed"
      ? localDateKey(new Date(editingTask.schedule.endAt), timezone)
      : localDateKey(new Date(fixedDefaults.endAt), timezone),
  );
  /**
 * TEMPO-005-F04 - timeOf
 * Purpose: Formats a timestamp in the selected task timezone.
 * Used by: useTaskFormState; submitTaskForm.
 * Trigger: Time prefills or DST consistency checks run.
 */
const timeOf = (at: number) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(at);
  const [startTime, setStartTime] = useState(() =>
    editingTask?.schedule.type === "fixed"
      ? timeOf(editingTask.schedule.startAt)
      : timeOf(fixedDefaults.startAt),
  );
  const [endTime, setEndTime] = useState(() =>
    editingTask?.schedule.type === "fixed"
      ? timeOf(editingTask.schedule.endAt)
      : timeOf(fixedDefaults.endAt),
  );
  const [dueDate, setDueDate] = useState(
    editingTask?.schedule.type === "flexible"
      ? (editingTask.schedule.dueDate ?? "")
      : (initialDate ?? ""),
  );
  const [duration, setDuration] = useState(
    editingTask?.estimatedMinutes ? "custom" : "none",
  );
  const [customHours, setCustomHours] = useState(
    editingTask?.estimatedMinutes
      ? String(Math.floor(editingTask.estimatedMinutes / 60))
      : "",
  );
  const [customMinutes, setCustomMinutes] = useState(
    editingTask?.estimatedMinutes
      ? String(editingTask.estimatedMinutes % 60)
      : "",
  );
  const [repeat, setRepeat] = useState<string>(
    editingTask?.recurrence?.frequency ?? "none",
  );
  const [repeatInterval, setRepeatInterval] = useState(
    String(editingTask?.recurrence?.interval ?? 1),
  );
  const [repeatUnit, setRepeatUnit] = useState<string>(
    editingTask?.recurrence?.unit ?? "day",
  );
  const [repeatEnd, setRepeatEnd] = useState<string>(
    editingTask?.recurrence?.end.type ?? "never",
  );
  const [repeatEndDate, setRepeatEndDate] = useState(
    editingTask?.recurrence?.end.type === "date"
      ? editingTask.recurrence.end.date
      : "",
  );
  const [repeatCount, setRepeatCount] = useState(
    String(
      editingTask?.recurrence?.end.type === "count"
        ? editingTask.recurrence.end.count
        : 10,
    ),
  );
  const [steps, setSteps] = useState<Step[]>(
    editingTask?.subtasks.map((step) => ({
      key: step.id,
      title: step.title,
      dueDate: step.dueDate ?? "",
    })) ?? [],
  );
  const [stepTitle, setStepTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const requestIdRef = useRef<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    /**
 * TEMPO-005-F05 - refresh
 * Purpose: Refreshes the validation clock.
 * Used by: useTaskFormState effect.
 * Trigger: Every 30 seconds or window focus; effect cleans up.
 */
const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const today = localDateKey(new Date(now), timezone);
  const currentTime = timeOf(now);
  const firstDate = (scheduleType === "fixed" ? startDate : dueDate) || today;
  const minimumRepeatEnd = firstDate > today ? firstDate : today;
  /**
 * TEMPO-005-F06 - timestamp
 * Purpose: Validates date/time syntax and resolves timezone timestamps.
 * Used by: useTaskFormState.
 * Trigger: Draft schedule values are recomputed.
 */
function timestamp(date: string, time: string, preferred?: number) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
      return NaN;
    return zonedTimestamp(date, time, timezone, preferred);
  }
  const selectedStartAt = timestamp(
    startDate,
    startTime,
    editingTask?.schedule.type === "fixed"
      ? editingTask.schedule.startAt
      : (initialStartAt ?? fixedDefaults.startAt),
  );
  const selectedEndAt = timestamp(
    endDate,
    endTime,
    editingTask?.schedule.type === "fixed"
      ? editingTask.schedule.endAt
      : fixedDefaults.endAt,
  );
  /**
 * TEMPO-005-F07 - issuesForRepeat
 * Purpose: Builds a candidate schedule and computes create/edit date issues.
 * Used by: useTaskFormState; TaskFormRecurrence.
 * Trigger: Date, recurrence, subtask or edit-scope state changes.
 */
function issuesForRepeat(repeatValue = repeat) {
    const candidate: Parameters<typeof taskDateIssues>[0] = {
      timezone,
      schedule:
        scheduleType === "fixed"
          ? {
              type: "fixed",
              startAt: selectedStartAt,
              endAt: selectedEndAt,
            }
          : { type: "flexible", ...(dueDate ? { dueDate } : {}) },
      recurrence:
        editingTask?.recurrence && editScope === "this"
          ? editingTask.recurrence
          : repeatValue === "none"
            ? undefined
            : {
                ...((repeatValue === "weekly" || (repeatValue === "custom" && repeatUnit === "week")) && repeatDays.length
                  ? { weekdays: repeatDays }
                  : {}),
                frequency: repeatValue,
                interval: repeatValue === "custom" ? Number(repeatInterval) : 1,
                unit:
                  repeatValue === "daily" || repeatValue === "weekdays"
                    ? "day"
                    : repeatValue === "weekly"
                      ? "week"
                      : repeatValue === "monthly"
                        ? "month"
                        : repeatUnit,
                end:
                  repeatEnd === "date"
                    ? { type: "date", date: repeatEndDate }
                    : repeatEnd === "count"
                      ? { type: "count", count: Number(repeatCount) }
                      : { type: "never" },
              },
      subtasks: steps.map((step) => ({
        ...(step.dueDate ? { dueDate: step.dueDate } : {}),
      })),
    };
    return editingTask
      ? editTaskDateIssues(
          candidate,
          editingTask,
          steps.map((step) => step.key),
          editingTask.subtasks.map((step) => step.id),
          new Date(now),
          !!editingTask.recurrence && editScope === "this",
        )
      : taskDateIssues(candidate, new Date(now));
  }
  const dateIssues = issuesForRepeat();

  /**
 * TEMPO-005-F08 - notifyValidation
 * Purpose: Shows the existing validation toast.
 * Used by: submitTaskForm; TaskFormRecurrence.
 * Trigger: Validation rejects input.
 */
function notifyValidation(message: string) {
    toast.error(message, { id: "task-validation" });
  }
  /**
 * TEMPO-005-F09 - changeValue
 * Purpose: Builds a field setter that clears prior errors.
 * Used by: TaskFormSchedule; TaskFormRecurrence.
 * Trigger: A bound field changes.
 */
function changeValue(setter: (value: string) => void) {
    return (value: string) => {
      setErrors({});
      setError(null);
      setter(value);
    };
  }

  /**
 * TEMPO-005-F10 - changeDuration
 * Purpose: Selects a preset/custom estimate and synchronizes duration fields.
 * Used by: TaskFormSchedule.
 * Trigger: The estimated-duration dropdown changes.
 */
function changeDuration(value: string) {
    setErrors({});
    setError(null);
    setDuration(value);
    if (value === "none") {
      setCustomHours("");
      setCustomMinutes("");
    } else if (value !== "custom") {
      setCustomHours(String(Math.floor(Number(value) / 60)));
      setCustomMinutes(String(Number(value) % 60));
    }
  }

  /**
 * TEMPO-005-F11 - addStep
 * Purpose: Appends a nonempty subtask draft up to the limit.
 * Used by: TaskFormSubtasks.
 * Trigger: Add or Enter is used on the subtask input.
 */
function addStep() {
    if (!stepTitle.trim() || steps.length >= 30) return;
    updateSteps((previous) => [
      ...previous,
      { key: crypto.randomUUID(), title: stepTitle.trim(), dueDate: "" },
    ]);
    setStepTitle("");
  }
  /**
 * TEMPO-005-F12 - updateSteps
 * Purpose: Updates subtask draft state and clears prior errors.
 * Used by: TaskFormSubtasks; addStep; moveStep.
 * Trigger: Subtask text, date, order or membership changes.
 */
function updateSteps(update: (previous: Step[]) => Step[]) {
    setErrors({});
    setError(null);
    setSteps(update);
  }
  /**
 * TEMPO-005-F13 - moveStep
 * Purpose: Reorders neighboring draft subtasks without persistence.
 * Used by: TaskFormSubtasks.
 * Trigger: A subtask move-up or move-down action is clicked.
 */
function moveStep(index: number, direction: number) {
    updateSteps((previous) => {
      const next = [...previous];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  }

  return {
    domains,
    initialDomainId,
    initialDate,
    initialStartAt,
    canSubmit,
    onCreate,
    onOpenChange,
    saving,
    setSaving,
    inFlightRef,
    hasMoreDomains,
    loadingMoreDomains,
    onLoadMoreDomains,
    editingTask,
    editScope,
    setEditScope,
    allowOverlap,
    setAllowOverlap,
    repeatDays,
    setRepeatDays,
    monthlyMissing,
    setMonthlyMissing,
    title,
    setTitle,
    description,
    setDescription,
    domainId,
    setDomainId,
    priority,
    setPriority,
    scheduleType,
    setScheduleType,
    timezone,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    timeOf,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    dueDate,
    setDueDate,
    duration,
    setDuration,
    customHours,
    setCustomHours,
    customMinutes,
    setCustomMinutes,
    repeat,
    setRepeat,
    repeatInterval,
    setRepeatInterval,
    repeatUnit,
    setRepeatUnit,
    repeatEnd,
    setRepeatEnd,
    repeatEndDate,
    setRepeatEndDate,
    repeatCount,
    setRepeatCount,
    steps,
    setSteps,
    stepTitle,
    setStepTitle,
    error,
    setError,
    errors,
    setErrors,
    requestIdRef,
    now,
    setNow,
    today,
    currentTime,
    firstDate,
    minimumRepeatEnd,
    timestamp,
    selectedStartAt,
    selectedEndAt,
    issuesForRepeat,
    dateIssues,
    notifyValidation,
    changeValue,
    changeDuration,
    addStep,
    updateSteps,
    moveStep,
  };
}
