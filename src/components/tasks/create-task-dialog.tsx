"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Sparkles,
  Mic,
  Zap,
  CalendarDays,
  AlarmClock,
  ChevronsDownUp,
  Flag,
  Plus,
  X,
  ListPlus,
} from "lucide-react";
import { toast } from "sonner";

import type { Domain } from "@/db/schema";
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
import { DatePicker } from "@/components/ui/date-picker";
import { createTask } from "@/server/actions";
import { parseNaturalTask } from "@/lib/parse-task";
import { log } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-is-desktop";

const NO_DOMAIN = "__none__";

const PRIORITIES = [
  { value: "important", label: "Urgent / High", dot: "bg-urgent", ring: "ring-urgent/40 bg-urgent/10 text-urgent" },
  { value: "medium", label: "Medium", dot: "bg-medium", ring: "ring-medium/40 bg-medium/10 text-medium" },
  { value: "flexible", label: "Flexible", dot: "bg-ontrack", ring: "ring-ontrack/40 bg-ontrack/10 text-ontrack" },
] as const;

type Importance = (typeof PRIORITIES)[number]["value"];

const EMPTY = {
  title: "",
  description: "",
  domainId: NO_DOMAIN,
  importance: "flexible" as Importance,
  date: "",
  timeHint: "",
  durationMin: "",
  durationUnit: "min" as "min" | "hr",
  minDurationMin: "15",
  isElastic: true,
};

type Unit = "min" | "hr";
type Milestone = { title: string; durationEstMin: string; unit: Unit };

const toMinutes = (value: string, unit: Unit, fallback: number) => {
  const n = Number(value);
  if (!n || n <= 0) return fallback;
  return unit === "hr" ? Math.round(n * 60) : Math.round(n);
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  domains,
  initialTitle = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: Domain[];
  initialTitle?: string;
}) {
  const isDesktop = useIsDesktop();
  const [pending, startTransition] = useTransition();
  const [nl, setNl] = useState("");
  const [form, setForm] = useState({ ...EMPTY, title: initialTitle });
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const domainItems = useMemo(() => {
    const m: Record<string, string> = { [NO_DOMAIN]: "Uncategorized" };
    for (const d of domains) m[d.id] = d.name;
    return m;
  }, [domains]);

  // A task can only shrink if its assigned domain allows shrinking.
  const shrinkAllowed = useMemo(() => {
    const d = domains.find((x) => x.id === form.domainId);
    return d ? d.allowElastic : false;
  }, [domains, form.domainId]);

  // Default the toggle to the domain's policy whenever the domain changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing a derived default on domain change
    setForm((f) => ({ ...f, isElastic: shrinkAllowed }));
  }, [shrinkAllowed]);

  const reset = () => {
    setForm({ ...EMPTY, title: "" });
    setMilestones([]);
    setNl("");
  };

  const autoFill = () => {
    if (!nl.trim()) {
      toast.error("Type an intent to parse");
      return;
    }
    const p = parseNaturalTask(nl, domains);
    setForm((f) => ({
      ...f,
      title: p.title,
      domainId: p.domainId ?? f.domainId,
      durationMin: p.durationMin ? String(p.durationMin) : f.durationMin,
      timeHint: p.timeHint ?? f.timeHint,
    }));
    log.event("Create: Auto-Fill parsed", p);
    toast.success("Parsed - review the details below");
  };

  const addStep = () =>
    setMilestones((m) => [
      ...m,
      { title: "", durationEstMin: "15", unit: "min" as Unit },
    ]);
  const updateStep = (i: number, patch: Partial<Milestone>) =>
    setMilestones((m) => m.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeStep = (i: number) =>
    setMilestones((m) => m.filter((_, idx) => idx !== i));

  const submit = () => {
    startTransition(async () => {
      const cleanMilestones = milestones
        .filter((m) => m.title.trim())
        .map((m) => ({
          title: m.title.trim(),
          durationEstMin: toMinutes(m.durationEstMin, m.unit, 15),
        }));
      const durationMin = form.durationMin
        ? toMinutes(form.durationMin, form.durationUnit, 0) || null
        : null;
      const res = await createTask({
        title: form.title,
        description: form.description || null,
        domainId: form.domainId === NO_DOMAIN ? null : form.domainId,
        importance: form.importance,
        date: form.date || null,
        timeHint: form.timeHint || null,
        durationMin,
        minDurationMin:
          shrinkAllowed && form.isElastic && form.minDurationMin
            ? Number(form.minDurationMin)
            : null,
        isElastic: shrinkAllowed && form.isElastic,
        milestones: cleanMilestones.length ? cleanMilestones : undefined,
      });
      if (!res.ok) {
        log.error("Create task failed", res.error);
        toast.error(res.error);
        return;
      }
      toast.success("Task created");
      reset();
      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isDesktop ? "w-full sm:max-w-xl" : "max-h-[92vh] rounded-t-2xl",
        )}
      >
        <SheetHeader className="gap-1 border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <ListPlus className="size-5 text-primary" />
            Create New Task
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Describe your intent naturally or refine scheduling details below.
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Natural Language Ingestion */}
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="size-4 text-brand" />
                Natural Language Ingestion
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Basic Parser
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border">
              <input
                value={nl}
                onChange={(e) => setNl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && autoFill()}
                placeholder="Draft investor memo before 11am for @alpha 90m"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                onClick={() => log.event("Create: voice (Phase 4)")}
                className="text-muted-foreground hover:text-primary"
                aria-label="Voice"
              >
                <Mic className="size-4" />
              </button>
              <Button size="sm" variant="secondary" onClick={autoFill}>
                <Zap className="size-3.5" />
                Auto-Fill
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="c-title" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Task title
            </Label>
            <Input
              id="c-title"
              className="h-11 text-base font-semibold"
              placeholder="e.g. Draft pitch memo"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="c-desc" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="c-desc"
              rows={2}
              placeholder="Context, links…"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          {/* Domain */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Domain / Category
            </Label>
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

          {/* Schedule + Time boundary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <CalendarDays className="size-3.5" /> Scheduled execution
              </Label>
              <DatePicker
                value={form.date}
                onChange={(v) => setForm({ ...form, date: v })}
                placeholder="Pick a date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-hint" className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <AlarmClock className="size-3.5" /> Time boundary
              </Label>
              <Input
                id="c-hint"
                placeholder="before 11am"
                value={form.timeHint}
                onChange={(e) => setForm({ ...form, timeHint: e.target.value })}
              />
            </div>
          </div>

          {/* Duration + elastic */}
          <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Estimated Duration
                </div>
                <div className="text-xs text-muted-foreground">
                  How long you expect this to take
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  placeholder="45"
                  value={form.durationMin}
                  onChange={(e) =>
                    setForm({ ...form, durationMin: e.target.value })
                  }
                  className="h-9 w-16 text-right font-semibold"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      durationUnit: form.durationUnit === "hr" ? "min" : "hr",
                    })
                  }
                  className="flex h-9 w-14 items-center justify-center rounded-lg border border-input text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Toggle unit (min/hr)"
                >
                  {form.durationUnit}
                </button>
              </div>
            </div>
            <div className="border-t border-border pt-3">
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
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Flag className="size-3.5" /> Priority calibration
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => {
                const active = form.importance === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setForm({ ...form, importance: p.value })}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold ring-1 transition-all",
                      active
                        ? p.ring
                        : "bg-card text-muted-foreground ring-border hover:bg-secondary",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", p.dot)} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Key Steps &amp; Subtasks ({milestones.length})
              </Label>
              <button
                onClick={addStep}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="size-3.5" /> Add Step
              </button>
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <input
                    value={m.title}
                    onChange={(e) => updateStep(i, { title: e.target.value })}
                    placeholder="Describe this step"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
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
                      aria-label="Step duration"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateStep(i, { unit: m.unit === "hr" ? "min" : "hr" })
                      }
                      className="w-6 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      aria-label="Toggle unit (min/hr)"
                    >
                      {m.unit}
                    </button>
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
              {milestones.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Break the task into steps (optional).
                </p>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !form.title.trim()}>
            Create Task
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
