"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Trash2,
  CircleCheck,
  CalendarArrowUp,
  Spline,
  Plus,
  ClipboardList,
  CalendarDays,
  Clock3,
  ListChecks,
  Flag,
  Activity,
  Layers,
  Sparkles,
  GitBranch,
  StickyNote,
  FileOutput,
} from "lucide-react";
import { toast } from "sonner";

import type { Task, Domain, Thread } from "@/db/schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS } from "@/server/validation";
import { STATUS_META } from "@/lib/task-ui";
import {
  updateTask,
  deleteTask,
  getMilestones,
  setMilestones,
  toggleTaskDone,
  moveTaskToTomorrow,
  startThreadFollowUp,
  getThread,
  type FollowUpContext,
} from "@/server/actions";
import { log } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  SubtaskEditor,
  subtasksToPayload,
  fromMinutes,
  toMinutes,
  toggleDurationUnit,
  type SubtaskDraft,
} from "@/components/tasks/subtask-editor";
import { TaskNotes } from "@/components/tasks/task-notes";
import { TaskOutputs } from "@/components/tasks/task-outputs";
import { TaskActivity } from "@/components/tasks/task-activity";

const NO_DOMAIN = "__none__";

const PRIORITIES = [
  { value: "important", label: "Urgent / High", dot: "bg-urgent", color: "text-urgent", bg: "bg-urgent/10" },
  { value: "medium", label: "Medium", dot: "bg-medium", color: "text-medium", bg: "bg-medium/10" },
  { value: "flexible", label: "Flexible", dot: "bg-ontrack", color: "text-ontrack", bg: "bg-ontrack/10" },
] as const;

const IMPORTANCE_ITEMS: Record<string, string> = {
  important: "Urgent / High",
  medium: "Medium",
  flexible: "Flexible",
};

const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  TASK_STATUS.map((s) => [s, STATUS_META[s].label]),
);

function format12HrTime(timeStr?: string | null): string {
  if (!timeStr) return "";
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(timeStr);
  if (!match) return timeStr;
  const h = Number(match[1]);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

function formatTaskDate(value: Date | string, withTime = false, timeStr?: string | null): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  const dateFormatted = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }); // e.g. "18 Jan 2026"
  if (withTime) {
    if (timeStr) {
      const formattedTime = format12HrTime(timeStr);
      return `${dateFormatted} ${formattedTime}`;
    }
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
    return `${dateFormatted} ${timeFormatted}`;
  }
  return dateFormatted;
}

export function TaskDetailsPanel({
  task,
  domains,
  open,
  onOpenChange,
  onFollowUp,
  onSelectTask,
  onTaskUpdated,
}: {
  task: Task | null;
  domains: Domain[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFollowUp?: (ctx: FollowUpContext) => void;
  onSelectTask?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
}) {
  const isDesktop = useIsDesktop();
  const domainItems = useMemo(() => {
    const m: Record<string, string> = { [NO_DOMAIN]: "Uncategorized" };
    for (const d of domains) m[d.id] = d.name;
    return m;
  }, [domains]);
  const [pending, startTransition] = useTransition();
  const [thread, setThread] = useState<{ thread: Thread; tasks: Task[] } | null>(
    null,
  );
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([]);
  const [activeSection, setActiveSection] = useState<
    "subtasks" | "notes" | "outputs" | "activity" | "thread"
  >("subtasks");
  const [form, setForm] = useState({
    title: "",
    description: "",
    domainId: NO_DOMAIN,
    status: "not_started" as Task["status"],
    importance: "flexible" as Task["importance"],
    date: "",
    scheduledEndDate: "",
    scheduledStart: "",
    scheduledEnd: "",
    durationEst: "",
    durationUnit: "min" as "min" | "hr",
    minDurationMin: "15",
    isElastic: true,
  });
  const shrinkAllowed = useMemo(() => {
    const d = domains.find((x) => x.id === form.domainId);
    return d ? d.allowElastic : false;
  }, [domains, form.domainId]);

  useEffect(() => {
    if (!shrinkAllowed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear elastic when the domain forbids it
      setForm((f) => (f.isElastic ? { ...f, isElastic: false } : f));
    }
  }, [shrinkAllowed]);

  // Hydrate the form + load milestones each time the drawer opens for a task.
  useEffect(() => {
    if (!task || !open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form on open
    setForm({
      title: task.title,
      description: task.description ?? "",
      domainId: task.domainId ?? NO_DOMAIN,
      status: task.status,
      importance: task.importance,
      date: task.date ?? "",
      scheduledEndDate: task.scheduledEndDate ?? task.date ?? "",
      scheduledStart: task.scheduledStart?.slice(0, 5) ?? "",
      scheduledEnd: task.scheduledEnd?.slice(0, 5) ?? "",
      durationEst: task.durationMin ? fromMinutes(task.durationMin).value : "",
      durationUnit: task.durationMin ? fromMinutes(task.durationMin).unit : "min",
      minDurationMin: task.minDurationMin ? String(task.minDurationMin) : "15",
      isElastic: task.isElastic,
    });
    let cancelled = false;
    getMilestones(task.id).then((ms) => {
      if (cancelled) return;
      setSubtasks(
        ms.map((m) => {
          const d = fromMinutes(m.durationEstMin);
          return {
            id: m.id,
            title: m.title,
            description: m.description ?? "",
            date: m.date ?? "",
            scheduledTime: m.scheduledTime?.slice(0, 5) ?? "",
            durationEst: d.value,
            durationUnit: d.unit,
            isCompleted: m.isCompleted,
            createdAt: m.createdAt,
          };
        }),
      );
    }).catch((error) => {
      if (!cancelled) {
        log.error("Could not load task subtasks", error);
        toast.error("Could not load task subtasks");
      }
    });
    // Load the thread chain (if any).
    setThread(null);
    if (task.threadId) {
      getThread(task.threadId).then((t) => {
        if (!cancelled) setThread(t);
      }).catch((error) => {
        if (!cancelled) {
          log.error("Could not load task thread", error);
          toast.error("Could not load task thread");
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [task, open]);

  if (!task) return null;

  const isDone = form.status === "done";
  const trackedSubtasks = subtasks.filter((subtask) => subtask.title.trim());
  const completedSubtasks = trackedSubtasks.filter(
    (subtask) => subtask.isCompleted,
  ).length;
  const progress = trackedSubtasks.length
    ? isDone
      ? 100
      : Math.round(
          (form.status === "in_progress" ? 10 : 0) +
            (completedSubtasks / trackedSubtasks.length) * 90,
        )
    : isDone
      ? 100
      : form.status === "in_progress"
        ? 10
        : 0;

  const completeAndFollowUp = () => {
    startTransition(async () => {
      const res = await startThreadFollowUp(task.id, { complete: true });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Completed — add the follow-up");
      onFollowUp?.(res.data);
    });
  };

  const addToThread = () => {
    startTransition(async () => {
      const res = await startThreadFollowUp(task.id, { complete: false });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onFollowUp?.(res.data);
    });
  };

  const save = () => {
    startTransition(async () => {
      const res = await updateTask({
        id: task.id,
        title: form.title,
        description: form.description || null,
        domainId: form.domainId === NO_DOMAIN ? null : form.domainId,
        status: form.status,
        importance: form.importance,
        date: form.date || null,
        scheduledEndDate: form.scheduledEndDate || null,
        scheduledStart: form.scheduledStart || null,
        scheduledEnd: form.scheduledEnd || null,
        durationMin: form.durationEst
          ? toMinutes(form.durationEst, form.durationUnit)
          : null,
        isElastic: shrinkAllowed && form.isElastic,
        minDurationMin:
          shrinkAllowed && form.isElastic && form.minDurationMin
            ? Number(form.minDurationMin)
            : null,
      });
      if (!res.ok) {
        log.error("Drawer save failed", res.error);
        toast.error(res.error);
        return;
      }
      const milestonesRes = await setMilestones(
        task.id,
        subtasksToPayload(subtasks),
      );
      if (!milestonesRes.ok) {
        log.error("Subtask save failed", milestonesRes.error);
        toast.error(milestonesRes.error);
        return;
      }
      onTaskUpdated?.(res.data);
      toast.success("Task saved");
      onOpenChange(false);
    });
  };

  const complete = () => {
    startTransition(async () => {
      const res = await toggleTaskDone(task.id, !isDone);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onTaskUpdated?.(res.data);
      setForm((f) => ({ ...f, status: isDone ? "not_started" : "done" }));
      toast.success(isDone ? "Marked not started" : "Task completed");
    });
  };

  const pushTomorrow = () => {
    startTransition(async () => {
      const res = await moveTaskToTomorrow(task.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onTaskUpdated?.(res.data);
      toast.success("Moved to tomorrow");
      onOpenChange(false);
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Task deleted");
        onOpenChange(false);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isDesktop
            ? "lg:data-[side=right]:w-[30vw] lg:data-[side=right]:max-w-none"
            : "max-h-[92vh] rounded-t-2xl",
        )}
      >
        {/* Mobile grab handle */}
        {!isDesktop && (
          <div className="flex shrink-0 justify-center pb-1 pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
          </div>
        )}

        <SheetHeader className="shrink-0 gap-1 border-b border-border px-4 py-3 pr-12">
          <SheetTitle className="sr-only">Task details</SheetTitle>
          <div className="flex min-w-0 items-center gap-2">
            <ClipboardList className="size-5 shrink-0 text-primary" />
            <Input
              id="t-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              aria-label="Task name"
              className="h-9 min-w-0 border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
              placeholder="Task name"
            />
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* Metadata rows without separating lines, cleanly aligned */}
          <div className="space-y-1">
            {/* Priority */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Flag className="size-3.5" /> Priority
              </Label>
              <Select
                items={IMPORTANCE_ITEMS}
                value={form.importance}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    importance: (v ?? "flexible") as Task["importance"],
                  })
                }
              >
                <SelectTrigger className="w-full justify-between border-0 bg-transparent px-1 shadow-none hover:bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn("size-2 shrink-0 rounded-full", p.dot)}
                        />
                        <span className="leading-none">{p.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Domain */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Layers className="size-3.5" /> Domain
              </Label>
              <Select
                items={domainItems}
                value={form.domainId}
                onValueChange={(v) =>
                  setForm({ ...form, domainId: v ?? NO_DOMAIN })
                }
              >
                <SelectTrigger className="w-full justify-between border-0 bg-transparent px-1 shadow-none hover:bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DOMAIN}>Uncategorized</SelectItem>
                  {domains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        {d.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" /> Status
              </Label>
              <Select
                items={STATUS_ITEMS}
                value={form.status}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    status: (v ?? "not_started") as Task["status"],
                  })
                }
              >
                <SelectTrigger className="w-full justify-between border-0 bg-transparent px-1 shadow-none hover:bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS.map((s) => (
                    <SelectItem key={s} value={s} className="items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn("block size-2 shrink-0 rounded-full", STATUS_META[s].dot)}
                      />
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Created date */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" /> Created
              </Label>
              <div className="flex h-8 items-center px-1 text-sm font-medium text-foreground">
                {formatTaskDate(task.createdAt, true, task.scheduledStart)}
              </div>
            </div>

            {/* Start date & time */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" /> Start date
              </Label>
              <div className="flex items-center gap-2">
                <DatePicker
                  value={form.date}
                  onChange={(v) =>
                    setForm((current) => ({
                      ...current,
                      date: v,
                      scheduledEndDate:
                        !current.scheduledEndDate ||
                        current.scheduledEndDate < v
                          ? v
                          : current.scheduledEndDate,
                    }))
                  }
                  className="flex-1 border-0 bg-transparent px-1 shadow-none hover:bg-muted/40"
                  placeholder="Choose start date"
                />
                <TimePicker
                  value={form.scheduledStart}
                  onChange={(v) => setForm({ ...form, scheduledStart: v })}
                  placeholder="Time"
                  ariaLabel="Start time"
                  className="w-28 shrink-0 border-0 bg-transparent px-1 shadow-none hover:bg-muted/40"
                />
              </div>
            </div>

            {/* End date & time */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" /> End date
              </Label>
              <div className="flex items-center gap-2">
                <DatePicker
                  value={form.scheduledEndDate || form.date}
                  onChange={(v) => setForm({ ...form, scheduledEndDate: v })}
                  className="flex-1 border-0 bg-transparent px-1 shadow-none hover:bg-muted/40"
                  placeholder="Choose end date"
                />
                <TimePicker
                  value={form.scheduledEnd}
                  onChange={(v) => setForm({ ...form, scheduledEnd: v })}
                  placeholder="Time"
                  ariaLabel="End time"
                  className="w-28 shrink-0 border-0 bg-transparent px-1 shadow-none hover:bg-muted/40"
                />
              </div>
            </div>

            {/* Progress */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ListChecks className="size-3.5" /> Progress
              </Label>
              <div className="flex items-center gap-3 px-1">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-label="Task progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Estimated duration */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label htmlFor="t-dur" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" /> Duration
              </Label>
              <div className="flex items-center">
                <div className="inline-flex h-8 w-fit items-center overflow-hidden rounded-md border border-input bg-background/50 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                  <Input
                    id="t-dur"
                    type="number"
                    min={form.durationUnit === "hr" ? 1 / 60 : 1}
                    step="any"
                    placeholder="45"
                    value={form.durationEst}
                    onChange={(e) =>
                      setForm({ ...form, durationEst: e.target.value })
                    }
                    className="h-full w-20 border-0 bg-transparent px-2.5 text-sm font-medium shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (form.durationUnit !== "min") {
                          const next = toggleDurationUnit(form.durationEst, form.durationUnit);
                          setForm({ ...form, durationEst: next.value, durationUnit: next.unit });
                        }
                      }}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
                        form.durationUnit === "min"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-label="Set minutes"
                    >
                      min
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (form.durationUnit !== "hr") {
                          const next = toggleDurationUnit(form.durationEst, form.durationUnit);
                          setForm({ ...form, durationEst: next.value, durationUnit: next.unit });
                        }
                      }}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
                        form.durationUnit === "hr"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-label="Set hours"
                    >
                      hr
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description as a highlighted box */}
          <div className="space-y-1.5 rounded-xl border border-primary/25 bg-primary/[0.03] p-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Label htmlFor="t-desc" className="text-xs font-semibold uppercase tracking-wider text-primary">
              Description
            </Label>
            <Textarea
              id="t-desc"
              rows={2}
              placeholder="Add details and context about this task…"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="min-h-16 resize-y border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="-mx-4 overflow-x-auto border-b border-border px-4">
            <div className="flex min-w-max" role="tablist" aria-label="Task sections">
              {(
                [
                  {
                    id: "subtasks",
                    label: `Subtasks (${trackedSubtasks.length})`,
                    icon: ListChecks,
                  },
                  { id: "notes", label: "Notes", icon: StickyNote },
                  { id: "outputs", label: "Outputs", icon: FileOutput },
                  { id: "activity", label: "Activity", icon: Activity },
                  { id: "thread", label: "Threads", icon: GitBranch },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  id={`task-${id}-tab`}
                  role="tab"
                  aria-selected={activeSection === id}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    activeSection === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div
            role="tabpanel"
            aria-labelledby={`task-${activeSection}-tab`}
            tabIndex={0}
            className="space-y-4 pt-1"
          >
            {activeSection === "subtasks" && (
              <div className="space-y-4">
                <SubtaskEditor
                  value={subtasks}
                  onChange={setSubtasks}
                  sectionLabel="Subtasks"
                  compactRows
                />
              </div>
            )}

            {activeSection === "notes" && <TaskNotes taskId={task.id} />}

            {activeSection === "outputs" && <TaskOutputs taskId={task.id} />}

            {activeSection === "activity" && <TaskActivity task={task} />}

            {activeSection === "thread" && (
              <div className="space-y-4">
                <div className="space-y-2 rounded-xl border border-border p-3">
                  <div>
                    <h3 className="text-sm font-semibold">Thread options</h3>
                    <p className="text-xs text-muted-foreground">
                      Continue this work in a connected follow-up task. You can keep this task open or mark it complete.
                    </p>
                  </div>
                  {thread?.thread.title && (
                    <p className="text-xs text-muted-foreground">
                      Current thread:{" "}
                      <span className="font-medium text-foreground">{thread.thread.title}</span>
                    </p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      onClick={addToThread}
                      disabled={pending}
                      className="sm:flex-1"
                    >
                      <Plus className="size-4" /> Move forward (open)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={completeAndFollowUp}
                      disabled={pending}
                      className="sm:flex-1"
                    >
                      <Spline className="size-4" /> Complete &amp; follow-up
                    </Button>
                  </div>
                </div>

                {thread && thread.tasks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Thread Timeline ({thread.tasks.length} tasks)
                    </h4>
                    <div className="space-y-1.5">
                      {thread.tasks.map((threadTask) => (
                        <button
                          key={threadTask.id}
                          type="button"
                          disabled={threadTask.id === task.id || !onSelectTask}
                          onClick={() => onSelectTask?.(threadTask)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-colors",
                            threadTask.id === task.id
                              ? "border-primary bg-primary/5 font-semibold text-primary"
                              : "border-border bg-card hover:bg-muted text-foreground",
                          )}
                        >
                          <span className="truncate">{threadTask.title}</span>
                          <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                            {threadTask.status === "done" ? "Done" : "Active"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick lifecycle actions */}
        <div className="flex flex-col gap-2 border-t border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Button
              variant={isDone ? "secondary" : "default"}
              size="lg"
              onClick={complete}
              disabled={pending}
              className="flex-1"
            >
              <CircleCheck className="size-4" />
              {isDone ? "Completed" : "Mark complete"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={pushTomorrow}
              disabled={pending}
            >
              <CalendarArrowUp className="size-4" /> Tomorrow
            </Button>
          </div>
        </div>

        <SheetFooter
          className={cn(
            "flex-row items-center justify-between gap-2 border-t border-border px-4 py-3",
            !isDesktop && "pb-[calc(env(safe-area-inset-bottom)+1rem)]",
          )}
        >
          <Button
            variant="ghost"
            size="lg"
            onClick={remove}
            disabled={pending}
            className="text-urgent hover:text-urgent"
          >
            <Trash2 className="size-4" /> Delete
          </Button>
          <Button size="lg" onClick={save} disabled={pending || !form.title.trim()}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
