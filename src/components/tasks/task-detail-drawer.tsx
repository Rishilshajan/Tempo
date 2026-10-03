"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Trash2,
  ChevronsDownUp,
  Plus,
  X,
  Circle,
  CircleCheck,
} from "lucide-react";
import { toast } from "sonner";

import type { Task, Domain } from "@/db/schema";
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
} from "@/server/actions";
import { log } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { DatePicker } from "@/components/ui/date-picker";

const NO_DOMAIN = "__none__";

const IMPORTANCE_ITEMS: Record<string, string> = {
  important: "Important",
  medium: "Medium",
  flexible: "Flexible",
};

const STATUS_ITEMS: Record<string, string> = Object.fromEntries(
  TASK_STATUS.map((s) => [s, STATUS_META[s].label]),
);

type Step = { title: string; durationEstMin: string; isCompleted: boolean };

export function TaskDetailDrawer({
  task,
  domains,
  open,
  onOpenChange,
}: {
  task: Task | null;
  domains: Domain[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isDesktop = useIsDesktop();
  const domainItems = useMemo(() => {
    const m: Record<string, string> = { [NO_DOMAIN]: "Uncategorized" };
    for (const d of domains) m[d.id] = d.name;
    return m;
  }, [domains]);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    description: "",
    domainId: NO_DOMAIN,
    status: "not_started" as Task["status"],
    importance: "flexible" as Task["importance"],
    date: "",
    timeHint: "",
    durationMin: "",
    minDurationMin: "15",
    isElastic: true,
  });
  const [steps, setSteps] = useState<Step[]>([]);

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
      timeHint: task.timeHint ?? "",
      durationMin: task.durationMin ? String(task.durationMin) : "",
      minDurationMin: task.minDurationMin ? String(task.minDurationMin) : "15",
      isElastic: task.isElastic,
    });
    let cancelled = false;
    getMilestones(task.id).then((ms) => {
      if (cancelled) return;
      setSteps(
        ms.map((m) => ({
          title: m.title,
          durationEstMin: String(m.durationEstMin),
          isCompleted: m.isCompleted,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [task, open]);

  if (!task) return null;

  const addStep = () =>
    setSteps((s) => [...s, { title: "", durationEstMin: "15", isCompleted: false }]);
  const updateStep = (i: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeStep = (i: number) =>
    setSteps((s) => s.filter((_, idx) => idx !== i));

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
        timeHint: form.timeHint || null,
        durationMin: form.durationMin ? Number(form.durationMin) : null,
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
      const clean = steps
        .filter((m) => m.title.trim())
        .map((m) => ({
          title: m.title.trim(),
          durationEstMin: Number(m.durationEstMin) || 15,
          isCompleted: m.isCompleted,
        }));
      await setMilestones(task.id, clean);
      toast.success("Task saved");
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
          isDesktop ? "w-full sm:max-w-md" : "max-h-[90vh] rounded-t-2xl",
        )}
      >
        <SheetHeader>
          <SheetTitle>Task details</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
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

            <div className="space-y-1.5">
              <Label htmlFor="t-hint">Time hint</Label>
              <Input
                id="t-hint"
                placeholder="before noon"
                value={form.timeHint}
                onChange={(e) => setForm({ ...form, timeHint: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-dur">Duration (min)</Label>
              <Input
                id="t-dur"
                type="number"
                min={1}
                value={form.durationMin}
                onChange={(e) =>
                  setForm({ ...form, durationMin: e.target.value })
                }
              />
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Subtasks ({steps.length})
              </Label>
              <button
                onClick={addStep}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="size-3.5" /> Add Step
              </button>
            </div>
            {steps.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                No subtasks yet.
              </p>
            ) : (
              <div className="space-y-2">
                {steps.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateStep(i, { isCompleted: !m.isCompleted })
                      }
                      aria-label="Toggle complete"
                    >
                      {m.isCompleted ? (
                        <CircleCheck className="size-4 text-ontrack" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                    </button>
                    <input
                      value={m.title}
                      onChange={(e) => updateStep(i, { title: e.target.value })}
                      placeholder="Describe this step"
                      className={cn(
                        "flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60",
                        m.isCompleted && "text-muted-foreground line-through",
                      )}
                    />
                    <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                      <input
                        type="number"
                        min={1}
                        value={m.durationEstMin}
                        onChange={(e) =>
                          updateStep(i, { durationEstMin: e.target.value })
                        }
                        className="w-8 bg-transparent text-right text-xs outline-none"
                        aria-label="Step minutes"
                      />
                      <span className="text-[11px] text-muted-foreground">
                        min
                      </span>
                    </div>
                    <button
                      onClick={() => removeStep(i)}
                      className="text-muted-foreground hover:text-urgent"
                      aria-label="Remove step"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={pending}
            className="text-urgent hover:text-urgent"
          >
            <Trash2 className="size-4" /> Delete
          </Button>
          <Button onClick={save} disabled={pending || !form.title.trim()}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
