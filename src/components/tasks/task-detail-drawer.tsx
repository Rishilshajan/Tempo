"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Trash2,
  ChevronsDownUp,
  CircleCheck,
  CalendarArrowUp,
  Spline,
  Plus,
  ClipboardList,
  CalendarDays,
  Clock3,
  ListChecks,
  MessageSquareText,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS, IMPORTANCE } from "@/server/validation";
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
import { DomainIcon } from "@/components/domains/domain-icon";
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

const NO_DOMAIN = "__none__";

const IMPORTANCE_ITEMS: Record<string, string> = {
  important: "Important",
  medium: "Medium",
  flexible: "Flexible",
};

const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  TASK_STATUS.map((s) => [s, STATUS_META[s].label]),
);

function formatTaskDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const [activeSection, setActiveSection] = useState<"details" | "activity">(
    "details",
  );
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
  const selectedDomain = domains.find((domain) => domain.id === form.domainId);
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
          "flex flex-col gap-0",
          isDesktop
            ? "lg:data-[side=right]:w-[42vw] lg:data-[side=right]:max-w-[720px]"
            : "max-h-[90vh] rounded-t-2xl",
        )}
      >
        {/* Mobile grab handle */}
        {!isDesktop && (
          <div className="flex shrink-0 justify-center pb-1 pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
          </div>
        )}
        <SheetHeader className="shrink-0 pb-3 pr-12">
          <SheetTitle className="sr-only">Task details</SheetTitle>
          <div className="flex min-w-0 items-center gap-2">
            <ClipboardList className="size-5 shrink-0 text-primary" />
            <Input
              id="t-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              aria-label="Task name"
              className="h-9 min-w-0 border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Priority
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
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE.map((i) => (
                    <SelectItem key={i} value={i}>
                      {IMPORTANCE_ITEMS[i]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Status
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
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3" /> Created
              </Label>
              <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-2 text-xs">
                {formatTaskDate(task.createdAt)}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3" /> Due date
              </Label>
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
              />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <ListChecks className="size-3.5 text-primary" />
                Progress
                {trackedSubtasks.length > 0 && (
                  <span className="font-normal text-muted-foreground">
                    · {completedSubtasks}/{trackedSubtasks.length} subtasks
                  </span>
                )}
              </span>
              <span className="font-semibold tabular-nums">{progress}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-secondary"
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
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Clock3 className="size-3" /> Start time
              </Label>
              <TimePicker
                value={form.scheduledStart}
                onChange={(v) => setForm({ ...form, scheduledStart: v })}
                placeholder="Not set"
                ariaLabel="Scheduled start time"
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Clock3 className="size-3" /> End time
              </Label>
              <TimePicker
                value={form.scheduledEnd}
                onChange={(v) => setForm({ ...form, scheduledEnd: v })}
                placeholder="Not set"
                ariaLabel="Scheduled end time"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="t-dur" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Estimated duration
              </Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="t-dur"
                  type="number"
                  min={form.durationUnit === "hr" ? 1 / 60 : 1}
                  step="any"
                  placeholder="Not estimated"
                  value={form.durationEst}
                  onChange={(e) =>
                    setForm({ ...form, durationEst: e.target.value })
                  }
                  className="h-8 flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = toggleDurationUnit(
                      form.durationEst,
                      form.durationUnit,
                    );
                    setForm({
                      ...form,
                      durationEst: next.value,
                      durationUnit: next.unit,
                    });
                  }}
                  className="flex h-8 w-14 shrink-0 items-center justify-center rounded-lg border border-input text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Toggle duration unit (minutes or hours)"
                >
                  {form.durationUnit}
                </button>
              </div>
            </div>
            {form.scheduledEndDate !== form.date && form.scheduledEndDate && (
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Scheduled through
                </Label>
                <DatePicker
                  value={form.scheduledEndDate}
                  onChange={(v) => setForm({ ...form, scheduledEndDate: v })}
                />
              </div>
            )}
          </div>
        </SheetHeader>

        <div
          className="flex shrink-0 border-b border-border px-4"
          role="tablist"
          aria-label="Task sections"
        >
          <button
            type="button"
            onClick={() => setActiveSection("details")}
            id="task-details-tab"
            role="tab"
            aria-selected={activeSection === "details"}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              activeSection === "details"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <ListChecks className="size-4" /> Details
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("activity")}
            id="task-activity-tab"
            role="tab"
            aria-selected={activeSection === "activity"}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              activeSection === "activity"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageSquareText className="size-4" /> Thread &amp; activity
          </button>
        </div>

        <div
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
          role="tabpanel"
          aria-labelledby={
            activeSection === "details"
              ? "task-details-tab"
              : "task-activity-tab"
          }
          tabIndex={0}
        >
          {activeSection === "details" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="t-desc">Description</Label>
                <Textarea
                  id="t-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Add details about this task…"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Domain</Label>
                <Select
                  items={domainItems}
                  value={form.domainId}
                  onValueChange={(v) =>
                    setForm({ ...form, domainId: v ?? NO_DOMAIN })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DOMAIN}>Uncategorized</SelectItem>
                    {domains.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDomain && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: `${selectedDomain.color}1f`,
                      color: selectedDomain.color,
                    }}
                  >
                    <DomainIcon domain={selectedDomain} className="size-3.5" />
                    {selectedDomain.name}
                  </span>
                )}
              </div>

              <SubtaskEditor
                value={subtasks}
                onChange={setSubtasks}
                sectionLabel="Subtasks"
                compactRows
              />

              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium",
                      shrinkAllowed ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <ChevronsDownUp className="size-4 text-primary" />
                    Can shrink
                    {shrinkAllowed && form.isElastic && (
                      <span className="text-muted-foreground">
                        (min {form.minDurationMin || 15}m)
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {shrinkAllowed && form.isElastic && (
                      <Input
                        type="number"
                        min={1}
                        value={form.minDurationMin}
                        onChange={(e) =>
                          setForm({ ...form, minDurationMin: e.target.value })
                        }
                        className="h-8 w-16 text-right text-xs"
                        aria-label="Minimum minutes"
                      />
                    )}
                    <Switch
                      checked={shrinkAllowed && form.isElastic}
                      disabled={!shrinkAllowed}
                      onCheckedChange={(v) =>
                        setForm({ ...form, isElastic: v })
                      }
                    />
                  </div>
                </div>
                {!shrinkAllowed && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Enable &quot;Allow Shrinking&quot; on the selected domain to let
                    this task shrink.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 rounded-xl border border-border p-3">
                <div>
                  <h3 className="text-sm font-semibold">Thread options</h3>
                  <p className="text-xs text-muted-foreground">
                    Continue this work in a connected follow-up task.
                  </p>
                </div>
                {thread?.thread.title && (
                  <p className="text-xs text-muted-foreground">
                    Current thread: <span className="font-medium text-foreground">{thread.thread.title}</span>
                  </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={addToThread}
                    disabled={pending}
                    className="sm:flex-1"
                  >
                    <Plus className="size-4" /> Add follow-up
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
              <TaskNotes
                taskId={task.id}
                task={task}
                threadTitle={thread?.thread.title}
                threadTasks={thread?.tasks}
                onSelectTask={onSelectTask}
              />
            </>
          )}
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
            "flex-row items-center justify-between gap-2 border-t border-border",
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
