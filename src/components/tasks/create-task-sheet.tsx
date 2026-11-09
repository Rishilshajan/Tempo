"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Clock3,
  Flag,
  Layers,
  ListPlus,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Repeat2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DomainLabel,
  type DomainSummary,
} from "@/components/domains/domain-appearance";
import {
  createTaskSchema,
  durationInputSchema,
  localDateKey,
  taskDateIssues,
  editTaskSchema,
  editTaskDateIssues,
  type CreateTaskValues,
} from "@/lib/validation/task";
import { priorities, PriorityLabel, TaskSelect } from "./task-select";
import { zonedTimestamp, shiftDate } from "@/lib/validation/recurrence";
import type { TaskRecord } from "./task-list";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: DomainSummary[] | undefined;
  initialDomainId?: string;
  initialDate?: string;
  initialStartAt?: number;
  canSubmit: boolean;
  onCreate: (
    values: CreateTaskValues,
    stepKeys?: string[],
    editScope?: "this" | "future",
  ) => Promise<unknown>;
  editingTask?: TaskRecord;
  hasMoreDomains?: boolean;
  loadingMoreDomains?: boolean;
  onLoadMoreDomains?: () => void;
};

export function CreateTaskSheet(props: Props) {
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);
  return (
    <Sheet
      open={props.open}
      onOpenChange={(open, details) => {
        if (inFlightRef.current) details.cancel();
        else props.onOpenChange(open);
      }}
    >
      <SheetContent
        data-task-detail-drawer={props.editingTask ? "" : undefined}
        showCloseButton={false}
        initialFocus={() => document.getElementById("task-title")}
        className={`!inset-y-auto !top-0 !h-dvh !w-full ${props.editingTask ? "!max-w-none !left-0 !right-auto !w-dvw sm:!left-auto sm:!right-0 sm:!w-full sm:!max-w-[540px]" : "!max-w-[460px]"} gap-0 bg-card motion-reduce:transition-none`}
      >
        <SheetHeader className="relative shrink-0 border-b border-border px-5 py-5 pr-14">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
            <ListPlus className="size-5 text-primary" aria-hidden="true" />
            {props.editingTask ? "Edit Task" : "Create New Task"}
          </SheetTitle>
          <SheetDescription className="mt-1 text-xs leading-5">
            {props.editingTask
              ? "Update the task’s details, schedule, and subtasks."
              : "Capture the task, then choose how and when to work on it."}
          </SheetDescription>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              props.editingTask ? "Close Edit Task" : "Close Create New Task"
            }
            disabled={saving}
            className="absolute right-3 top-3 size-9"
            onClick={() => props.onOpenChange(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </SheetHeader>
        {props.open && (
          <TaskForm
            {...props}
            saving={saving}
            setSaving={setSaving}
            inFlightRef={inFlightRef}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type Step = { key: string; title: string; dueDate: string };

function TaskForm({
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

  async function submit(event: FormEvent<HTMLFormElement>) {
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

  return (
    <form
      onSubmit={submit}
      noValidate
      onChangeCapture={() => {
        setErrors({});
        setError(null);
      }}
      className="flex min-h-0 flex-1 flex-col"
      aria-busy={saving}
    >
      <fieldset
        disabled={saving}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
      >
        {editingTask?.recurrence && (
          <div className="space-y-2 rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-medium">Apply changes to</p>
            <TaskSelect
              label="Edit recurring task"
              value={editScope}
              onChange={(value) => setEditScope(value as "this" | "future")}
              options={[
                { value: "this", label: "This occurrence only" },
                { value: "future", label: "This and future occurrences" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Completed sessions stay unchanged. Future open sessions are
              replaced only when you choose the second option.
            </p>
          </div>
        )}
        {editingTask?.recurrence &&
          editingTask.schedule.type === "fixed" &&
          editingTask.schedule.endAt - editingTask.schedule.startAt >
            86400000 && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
              <p className="font-medium">
                Possible series end entered as a session end
              </p>
              <p>
                Correction preview: {startTime}–{endTime} each matching day
                until{" "}
                {localDateKey(new Date(editingTask.schedule.endAt), timezone)}.
                The original stays unchanged until you save.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEndDate(
                    endTime > startTime ? startDate : shiftDate(startDate, 1),
                  );
                  setRepeatEnd("date");
                  setRepeatEndDate(
                    localDateKey(
                      new Date(
                        editingTask.schedule.type === "fixed"
                          ? editingTask.schedule.endAt
                          : 0,
                      ),
                      timezone,
                    ),
                  );
                  setAllowOverlap(false);
                  setEditScope("future");
                }}
              >
                Use this correction
              </Button>
            </div>
          )}
        <div className="space-y-1.5">
          <label htmlFor="task-title" className="text-xs font-medium">
            Task title <span className="text-primary">*</span>
          </label>
          <Input
            id="task-title"
            required
            maxLength={200}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setErrors((previous) => ({ ...previous, title: "" }));
            }}
            placeholder="e.g., Prepare the project proposal"
            className="min-h-10 bg-muted/40"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "task-title-error" : undefined}
          />
          {errors.title && (
            <p id="task-title-error" className="text-xs text-destructive">
              {errors.title}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="task-description" className="text-xs font-medium">
            Description{" "}
            <span className="font-normal text-muted-foreground">
              (Optional)
            </span>
          </label>
          <Textarea
            id="task-description"
            maxLength={5000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add context and details..."
            className="min-h-20 max-h-48 resize-y bg-muted/40"
          />
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
          <label
            id="task-domain-label"
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Layers className="size-4" aria-hidden="true" />
            Domain
          </label>
          <TaskSelect
            label="Domain"
            value={domainId}
            onChange={setDomainId}
            disabled={!domains}
            options={[
              { value: "uncategorized", label: "Uncategorized" },
              ...(domains ?? []).map((domain) => ({
                value: domain._id,
                label: <DomainLabel {...domain} />,
              })),
            ]}
          />
        </div>
        {hasMoreDomains && (
          <Button
            variant="ghost"
            type="button"
            className="min-h-8 text-xs"
            disabled={loadingMoreDomains}
            onClick={onLoadMoreDomains}
          >
            {loadingMoreDomains ? "Loading…" : "Load more domains"}
          </Button>
        )}
        {domains?.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            No domains yet. You can create one separately from the Domains menu.
          </p>
        )}
        <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flag className="size-4" aria-hidden="true" />
            Priority
          </span>
          <TaskSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={priorities.map((option) => ({
              value: option.value,
              label: <PriorityLabel value={option.value} />,
            }))}
          />
        </div>
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
                  setEndDate(
                    shiftDate(value, shift),
                  );
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
          {scheduleType === "fixed" && endDate > startDate && repeat !== "none" && (
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
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium">Subtasks ({steps.length})</h3>
            <span className="text-[11px] text-muted-foreground">
              Optional · up to 30
            </span>
          </div>
          {steps.length > 0 && (
            <ol
              aria-label="Subtasks"
              className="max-h-72 divide-y divide-border overflow-y-auto overscroll-contain rounded-lg border border-border"
            >
              {steps.map((step, index) => (
                <li
                  key={step.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 p-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                >
                  <Textarea
                    aria-label={`Subtask ${index + 1} title`}
                    rows={1}
                    required
                    maxLength={200}
                    value={step.title}
                    onChange={(event) =>
                      updateSteps((previous) =>
                        previous.map((item) =>
                          item.key === step.key
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className="col-start-1 row-start-1 !min-h-8 min-w-0 resize-none border-transparent bg-transparent px-2 py-1.5 text-sm leading-5"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        document.getElementById("new-subtask-title")?.focus();
                      }
                    }}
                  />
                  <div className="col-start-1 row-start-2 w-fit max-w-full sm:col-start-2 sm:row-start-1">
                    <DatePicker
                      minDate={today}
                      ariaLabel={`Subtask ${index + 1} date (Optional)`}
                      placeholder="Add date"
                      className="!w-auto max-w-36 justify-start border-transparent bg-muted/40 text-xs"
                      value={step.dueDate}
                      onChange={(value) =>
                        updateSteps((previous) =>
                          previous.map((item) =>
                            item.key === step.key
                              ? { ...item, dueDate: value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="col-start-2 row-start-1 sm:col-start-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Subtask ${index + 1} options`}
                          />
                        }
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={index === 0}
                          onClick={() => moveStep(index, -1)}
                        >
                          <ArrowUp aria-hidden="true" />
                          Move up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={index === steps.length - 1}
                          onClick={() => moveStep(index, 1)}
                        >
                          <ArrowDown aria-hidden="true" />
                          Move down
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            updateSteps((previous) =>
                              previous.filter((item) => item.key !== step.key),
                            )
                          }
                        >
                          <Trash2 aria-hidden="true" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="flex items-center gap-2">
            <Input
              id="new-subtask-title"
              aria-label="New subtask title"
              maxLength={200}
              value={stepTitle}
              disabled={steps.length >= 30}
              onChange={(event) => setStepTitle(event.target.value)}
              placeholder="Add a step (press Enter)…"
              className="min-h-9 min-w-0"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addStep();
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              aria-label="Add Step"
              disabled={!stepTitle.trim() || steps.length >= 30}
              onClick={addStep}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
          {errors.subtasks && (
            <p role="alert" className="text-xs text-destructive">
              {errors.subtasks}
            </p>
          )}
        </div>
        {editingTask?.recurrence && editScope === "this" ? (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            Repeat pattern unchanged. Choose “This and future occurrences” above
            to change the series.
          </p>
        ) : (
          <>
            <div className="space-y-2 border-t border-border pt-4">
              <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Repeat2 className="size-4" aria-hidden="true" />
                  Repeat
                </span>
                <TaskSelect
                  label="Repeat"
                  value={repeat}
                  onChange={(value) => {
                    setErrors({});
                    setError(null);
                    setRepeat(value);
                    if (value === "weekly" && !repeatDays.length)
                      setRepeatDays([
                        new Date(firstDate + "T12:00:00Z").getUTCDay(),
                      ]);
                    const issue = issuesForRepeat(value)[0];
                    if (issue) notifyValidation(issue.message);
                    else toast.dismiss("task-validation");
                  }}
                  options={[
                    { value: "none", label: "Does not repeat" },
                    { value: "weekdays", label: "Weekdays (Mon–Fri)" },
                    ...["Daily", "Weekly", "Monthly", "Custom"].map(
                      (label) => ({
                        value: label.toLowerCase(),
                        label,
                      }),
                    ),
                  ]}
                />
              </div>
            </div>
            {repeat !== "none" && (
              <div className="space-y-3">
                {(repeat === "weekly" ||
                  (repeat === "custom" && repeatUnit === "week")) && (
                  <div
                    className="flex flex-wrap gap-1"
                    role="group"
                    aria-label="Repeat weekdays"
                  >
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (label, day) => (
                        <Button
                          key={day}
                          type="button"
                          size="sm"
                          variant={
                            repeatDays.includes(day) ? "default" : "outline"
                          }
                          aria-pressed={repeatDays.includes(day)}
                          onClick={() =>
                            setRepeatDays((days) =>
                              days.includes(day)
                                ? days.filter((d) => d !== day)
                                : [...days, day],
                            )
                          }
                        >
                          {label}
                        </Button>
                      ),
                    )}
                  </div>
                )}
                {(repeat === "monthly" ||
                  (repeat === "custom" && repeatUnit === "month")) && (
                  <TaskSelect
                    label="When a month has no matching date"
                    value={monthlyMissing}
                    onChange={(value) =>
                      setMonthlyMissing(value as "last_day" | "skip")
                    }
                    options={[
                      {
                        value: "last_day",
                        label: "Use the last day of shorter months",
                      },
                      { value: "skip", label: "Skip months without this date" },
                    ]}
                  />
                )}
                {repeat === "custom" && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex min-w-0 flex-col gap-1.5 text-xs">
                      Every
                      <Input
                        aria-label="Repeat interval"
                        type="number"
                        min={1}
                        max={365}
                        step={1}
                        required
                        value={repeatInterval}
                        onChange={(event) =>
                          setRepeatInterval(event.target.value)
                        }
                        className="min-h-10 bg-muted/40"
                      />
                    </label>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p className="text-xs">Unit</p>
                      <TaskSelect
                        label="Repeat unit"
                        value={repeatUnit}
                        onChange={setRepeatUnit}
                        options={[
                          { value: "day", label: "Days" },
                          { value: "week", label: "Weeks" },
                          { value: "month", label: "Months" },
                        ]}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                  <span className="text-xs text-muted-foreground">Ends</span>
                  <TaskSelect
                    label="Repeat ends"
                    value={repeatEnd}
                    onChange={changeValue(setRepeatEnd)}
                    options={[
                      { value: "never", label: "Never" },
                      { value: "date", label: "On a date" },
                      { value: "count", label: "After occurrences" },
                    ]}
                  />
                </div>
                {repeatEnd === "date" && (
                  <DateField
                    label="Repeat end date"
                    type="date"
                    value={repeatEndDate}
                    onChange={changeValue(setRepeatEndDate)}
                    minDate={minimumRepeatEnd}
                    required
                  />
                )}
                {repeatEnd === "count" && (
                  <label className="flex flex-col gap-1.5 text-xs">
                    Occurrences (including this task)
                    <Input
                      aria-label="Repeat occurrences"
                      type="number"
                      min={1}
                      max={1000}
                      step={1}
                      required
                      value={repeatCount}
                      onChange={(event) => setRepeatCount(event.target.value)}
                      className="min-h-10 bg-muted/40"
                    />
                  </label>
                )}
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {repeat === "weekdays"
                    ? "Separate sessions Monday through Friday, prepared 30 days ahead."
                    : "Separate sessions are prepared 30 days ahead and extended automatically. Completing late does not change the schedule."}
                </p>
              </div>
            )}
          </>
        )}
        {dateIssues.length > 0 && (
          <ul aria-live="polite" className="space-y-1 text-xs text-destructive">
            {dateIssues.map((issue, index) => (
              <li key={index}>{issue.message}</li>
            ))}
          </ul>
        )}
        {errors.recurrence && (
          <p role="alert" className="text-xs text-destructive">
            {errors.recurrence}
          </p>
        )}
        {!canSubmit && (
          <p role="status" className="text-xs text-muted-foreground">
            Waiting for your secure workspace connection.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </fieldset>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          className="min-h-10 px-3"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || !canSubmit || saving}
          className="min-h-10 gap-2 px-4"
        >
          {saving ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          {saving ? "Saving…" : editingTask ? "Save changes" : "Create Task"}
        </Button>
      </footer>
    </form>
  );
}

function DateField({
  label,
  value,
  onChange,
  type,
  required,
  minDate,
  minTime,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: "date" | "time";
  required?: boolean;
  minDate?: string;
  minTime?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[11px] text-muted-foreground">
      {label}
      {type === "date" ? (
        <DatePicker
          value={value}
          onChange={onChange}
          ariaLabel={label}
          required={required}
          minDate={minDate}
          placeholder="Choose date"
          className="min-h-9 min-w-0 bg-muted/40 text-xs text-foreground"
        />
      ) : (
        <TimePicker
          ariaLabel={label}
          required={required}
          minTime={minTime}
          value={value}
          onChange={onChange}
          placeholder="Choose time"
          className="min-h-9 min-w-0 max-w-full bg-muted/40 text-foreground"
        />
      )}
    </label>
  );
}
