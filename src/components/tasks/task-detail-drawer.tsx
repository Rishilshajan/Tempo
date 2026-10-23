"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Trash2,
  ChevronsDownUp,
  CircleCheck,
  CalendarArrowUp,
  Spline,
  Circle,
  Plus,
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

/** "2026-10-16" -> "16 Oct 26". */
function fmtDate(iso: string | null): string {
  if (!iso) return "No date";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function TaskDetailDrawer({
  task,
  domains,
  open,
  onOpenChange,
  onFollowUp,
  onSelectTask,
}: {
  task: Task | null;
  domains: Domain[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFollowUp?: (ctx: FollowUpContext) => void;
  onSelectTask?: (task: Task) => void;
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
  const [form, setForm] = useState({
    title: "",
    description: "",
    domainId: NO_DOMAIN,
    status: "not_started" as Task["status"],
    importance: "flexible" as Task["importance"],
    date: "",
    scheduledStart: "",
    scheduledEnd: "",
    durationEst: "",
    durationUnit: "min" as "min" | "hr",
    minDurationMin: "15",
    isElastic: true,
  });
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([]);

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
    });
    // Load the thread chain (if any).
    setThread(null);
    if (task.threadId) {
      getThread(task.threadId).then((t) => {
        if (!cancelled) setThread(t);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [task, open]);

  if (!task) return null;

  const isDone = form.status === "done";
  const currentId = task.id;

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
      await setMilestones(task.id, subtasksToPayload(subtasks));
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
          isDesktop ? "w-full sm:max-w-none" : "max-h-[90vh] rounded-t-2xl",
        )}
      >
        {/* Mobile grab handle */}
        {!isDesktop && (
          <div className="flex shrink-0 justify-center pb-1 pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
          </div>
        )}
        <SheetHeader>
          <SheetTitle>Task details</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          {/* Thread timeline */}
          {thread && thread.tasks.length > 1 && (
            <div className="rounded-xl bg-rolledforward/5 p-3 ring-1 ring-rolledforward/20">
              <div className="mb-2 flex items-center gap-2">
                <Spline className="size-4 shrink-0 text-rolledforward" />
                <span className="flex-1 truncate text-sm font-semibold text-foreground">
                  {thread.thread.title}
                </span>
                <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                  {thread.tasks.length} tasks
                </span>
              </div>
              <ol className="space-y-0.5">
                {thread.tasks.map((t) => {
                  const done = t.status === "done";
                  const isCurrent = t.id === currentId;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => onSelectTask?.(t)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                          isCurrent ? "bg-rolledforward/10" : "hover:bg-secondary",
                        )}
                      >
                        {done ? (
                          <CircleCheck className="mt-0.5 size-4 shrink-0 text-ontrack" />
                        ) : (
                          <Circle
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              isCurrent ? "text-rolledforward" : "text-muted-foreground",
                            )}
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[13px]",
                              done
                                ? "text-muted-foreground line-through"
                                : "font-medium text-foreground",
                            )}
                          >
                            {t.title}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {fmtDate(t.date)}
                            {isCurrent ? " · current" : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <button
                type="button"
                onClick={addToThread}
                disabled={pending}
                className="mt-1 flex items-center gap-1 px-2 text-xs font-semibold text-rolledforward hover:underline disabled:opacity-50"
              >
                <Plus className="size-3.5" /> Add task to thread
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input
              id="t-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea
              id="t-desc"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                items={STATUS_ITEMS}
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: (v ?? "not_started") as Task["status"] })
                }
              >
                <SelectTrigger className="w-full">
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

            <div className="space-y-1.5">
              <Label>Importance</Label>
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
                <SelectTrigger className="w-full">
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

            <div className="space-y-1.5">
              <Label>Date</Label>
              <DatePicker
                value={form.date}
                onChange={(v) => setForm({ ...form, date: v })}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Time window</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-1">
                  <span className="block text-xs font-medium text-muted-foreground">
                    Start
                  </span>
                  <TimePicker
                    value={form.scheduledStart}
                    onChange={(v) => setForm({ ...form, scheduledStart: v })}
                    placeholder="Start time"
                    ariaLabel="Start time"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="block text-xs font-medium text-muted-foreground">
                    Finish by
                  </span>
                  <TimePicker
                    value={form.scheduledEnd}
                    onChange={(v) => setForm({ ...form, scheduledEnd: v })}
                    placeholder="Finish time"
                    ariaLabel="Finish by"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="t-dur">Estimated duration</Label>
              <div className="flex items-center gap-1.5">
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
                  className="flex-1"
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
                  className="flex h-8 w-14 shrink-0 items-center justify-center rounded-lg border border-input text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Toggle unit (min/hr)"
                >
                  {form.durationUnit}
                </button>
              </div>
            </div>
          </div>

          {/* Can shrink */}
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
                  onCheckedChange={(v) => setForm({ ...form, isElastic: v })}
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

          {/* Subtasks */}
          <SubtaskEditor value={subtasks} onChange={setSubtasks} />

          {/* Notes & Output */}
          <TaskNotes taskId={task.id} />
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              onClick={addToThread}
              disabled={pending}
              className="sm:flex-1"
            >
              <Plus className="size-4" /> Add follow-up
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={completeAndFollowUp}
              disabled={pending}
              className="sm:flex-1"
            >
              <Spline className="size-4" /> Complete &amp; follow-up
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
