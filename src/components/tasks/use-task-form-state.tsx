/**
 * TEMPO-003 - useTaskFormState: state and actions owned once per mounted view.
 * Code map: src/components/code-map.md.
 */
"use client";
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
 * TEMPO-003-F24 - useTaskFormState
 * Purpose: Owns create/edit form fields, date checks and subtask draft state.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
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
  const [repeatDays, setRepeatDays] = useState<number[]>(
    editingTask?.recurrence?.weekdays ?? [
      new Date(
        (editingTask?.schedule.type === "fixed"
          ? localDateKey(
              new Date(editingTask.schedule.startAt),
              editingTask.timezone,
            )
          : (initialDate ?? localDateKey())) + "T12:00:00Z",
      ).getUTCDay(),
    ],
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
  const [startDate, setStartDate] = useState(() =>
    editingTask?.schedule.type === "fixed"
      ? localDateKey(new Date(editingTask.schedule.startAt), timezone)
      : initialStartAt === undefined
        ? (initialDate ?? localDateKey())
        : localDateKey(new Date(initialStartAt)),
  );
  const [endDate, setEndDate] = useState(() =>
    editingTask?.schedule.type === "fixed"
      ? localDateKey(new Date(editingTask.schedule.endAt), timezone)
      : initialStartAt === undefined
        ? (initialDate ?? localDateKey())
        : localDateKey(new Date(initialStartAt + 3600000)),
  );
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
      : initialStartAt === undefined
        ? "09:00"
        : timeOf(initialStartAt),
  );
  const [endTime, setEndTime] = useState(() =>
    editingTask?.schedule.type === "fixed"
      ? timeOf(editingTask.schedule.endAt)
      : initialStartAt === undefined
        ? "10:00"
        : timeOf(initialStartAt + 3600000),
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
      : initialStartAt,
  );
  const selectedEndAt = timestamp(
    endDate,
    endTime,
    editingTask?.schedule.type === "fixed"
      ? editingTask.schedule.endAt
      : initialStartAt === undefined
        ? undefined
        : initialStartAt + 3600000,
  );
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
                ...(repeatValue === "weekly" && repeatDays.length
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

  function notifyValidation(message: string) {
    toast.error(message, { id: "task-validation" });
  }
  function changeValue(setter: (value: string) => void) {
    return (value: string) => {
      setErrors({});
      setError(null);
      setter(value);
    };
  }

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

  function addStep() {
    if (!stepTitle.trim() || steps.length >= 30) return;
    updateSteps((previous) => [
      ...previous,
      { key: crypto.randomUUID(), title: stepTitle.trim(), dueDate: "" },
    ]);
    setStepTitle("");
  }
  function updateSteps(update: (previous: Step[]) => Step[]) {
    setErrors({});
    setError(null);
    setSteps(update);
  }
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
