"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Sparkles,
  Mic,
  Zap,
  CalendarDays,
  Flag,
  ListPlus,
  Spline,
  Layers,
  AlignLeft,
  Clock3,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  SubtaskEditor,
  subtasksToPayload,
  toggleDurationUnit,
  type SubtaskDraft,
} from "@/components/tasks/subtask-editor";
import { createTask, type FollowUpContext } from "@/server/actions";
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
  scheduleMode: "flexible" as "flexible" | "fixed",
  date: "",
  scheduledEndDate: "",
  timeHint: "",
  scheduledStart: "",
  scheduledEnd: "",
  durationMin: "",
  durationUnit: "min" as "min" | "hr",
  minDurationMin: "15",
  isElastic: true,
};

type Unit = "min" | "hr";

const toMinutes = (value: string, unit: Unit, fallback: number) => {
  const n = Number(value);
  if (!n || n <= 0) return fallback;
  return unit === "hr" ? Math.round(n * 60) : Math.round(n);
};

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  domains,
  initialTitle = "",
  threadContext = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: Domain[];
  initialTitle?: string;
  threadContext?: FollowUpContext | null;
}) {
  const isDesktop = useIsDesktop();
  const [pending, startTransition] = useTransition();
  const [nl, setNl] = useState("");
  const [form, setForm] = useState({ ...EMPTY, title: initialTitle });
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([]);
  const scheduleError =
    form.scheduleMode === "fixed"
      ? !form.date ||
        !form.scheduledStart ||
        !form.scheduledEndDate ||
        !form.scheduledEnd
        ? ""
        : `${form.scheduledEndDate}T${form.scheduledEnd}` <=
            `${form.date}T${form.scheduledStart}`
          ? "End date and time must be after the start."
          : null
      : null;

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

  // When opened as a thread follow-up, prefill the carried context.
  useEffect(() => {
    if (!open || !threadContext) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill on open from thread context
    setForm({
      ...EMPTY,
      title: threadContext.prefill.title,
      description: threadContext.prefill.description ?? "",
      domainId: threadContext.prefill.domainId ?? NO_DOMAIN,
      importance: threadContext.prefill.importance,
      date: tomorrowISO(),
    });
    setSubtasks([]);
    setNl("");
  }, [open, threadContext]);

  const reset = () => {
    setForm({ ...EMPTY, title: "" });
    setSubtasks([]);
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

  const submit = () => {
    if (scheduleError) {
      toast.error(scheduleError);
      return;
    }
    startTransition(async () => {
      const milestones = subtasksToPayload(subtasks);
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
        scheduleMode: form.scheduleMode,
        scheduledEndDate:
          form.scheduleMode === "fixed" ? form.scheduledEndDate : null,
        scheduledStart:
          form.scheduleMode === "fixed" ? form.scheduledStart : null,
        scheduledEnd:
          form.scheduleMode === "fixed" ? form.scheduledEnd : null,
        durationMin,
        minDurationMin:
          shrinkAllowed && form.isElastic && form.minDurationMin
            ? Number(form.minDurationMin)
            : null,
        isElastic: shrinkAllowed && form.isElastic,
        threadId: threadContext?.threadId ?? null,
        parentTaskId: threadContext?.parentTaskId ?? null,
        milestones: milestones.length ? milestones : undefined,
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
        <SheetHeader className="gap-1 border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-xl">
            {threadContext ? (
              <Spline className="size-5 text-rolledforward" />
            ) : (
              <ListPlus className="size-5 text-primary" />
            )}
            {threadContext ? "Add to thread" : "Create New Task"}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {threadContext
              ? "Continue the thread — context is carried over."
              : "Describe the task, then choose details one by one."}
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* Thread context banner */}
          {threadContext && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rolledforward/10 px-3 py-2.5 ring-1 ring-rolledforward/25">
              <Spline className="mt-0.5 size-4 shrink-0 text-rolledforward" />
              <div className="min-w-0 text-sm">
                <div className="font-semibold text-foreground">
                  {threadContext.threadTitle}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  ↳ continues “{threadContext.prefill.title}”
                </div>
              </div>
            </div>
          )}
          {/* Natural Language Ingestion */}
          <details className="group rounded-lg border border-border">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground">
              <Sparkles className="size-4 text-brand" />
              Draft task from a sentence
            </summary>
            <div className="flex items-center gap-2 border-t border-border px-2 py-2">
              <input
                value={nl}
                onChange={(e) => setNl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && autoFill()}
                placeholder="Draft investor memo before 11am for @alpha 90m"
                className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={() => log.event("Create: voice (Phase 4)")}
                className="shrink-0 text-muted-foreground hover:text-primary"
                aria-label="Voice"
              >
                <Mic className="size-4" />
              </button>
              <Button size="sm" variant="secondary" onClick={autoFill}>
                <Zap className="size-3.5" />
                Parse
              </Button>
            </div>
          </details>

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

          {/* Description as a highlighted box matching task detail drawer */}
          <div className="space-y-1.5 rounded-xl border border-primary/25 bg-primary/[0.03] p-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Label htmlFor="c-desc" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <AlignLeft className="size-3.5" /> Description
            </Label>
            <Textarea
              id="c-desc"
              rows={2}
              placeholder="Add context and details…"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="min-h-16 resize-y border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0"
            />
          </div>

          {/* Metadata rows without separating lines, consistent with task detail drawer */}
          <div className="space-y-1">
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

            {/* Priority */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Flag className="size-3.5" /> Priority
              </Label>
              <Select
                items={Object.fromEntries(
                  PRIORITIES.map((priority) => [
                    priority.value,
                    priority.label,
                  ]),
                )}
                value={form.importance}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    importance: (v ?? "flexible") as Importance,
                  })
                }
              >
                <SelectTrigger className="w-full justify-between border-0 bg-transparent px-1 shadow-none hover:bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem
                      key={priority.value}
                      value={priority.value}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn("size-2 shrink-0 rounded-full", priority.dot)}
                        />
                        <span className="leading-none">{priority.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Mode */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" /> Schedule
              </Label>
              <Select
                value={form.scheduleMode}
                onValueChange={(v) => {
                  const mode = v as "flexible" | "fixed";
                  if (mode === "fixed") {
                    const startDate = form.date || todayISO();
                    setForm({
                      ...form,
                      scheduleMode: mode,
                      date: startDate,
                      scheduledEndDate: form.scheduledEndDate || startDate,
                    });
                  } else {
                    setForm({
                      ...form,
                      scheduleMode: mode,
                      scheduledStart: "",
                      scheduledEnd: "",
                      scheduledEndDate: "",
                    });
                  }
                }}
              >
                <SelectTrigger className="w-full justify-between border-0 bg-transparent px-1 shadow-none hover:bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="fixed">Fixed time window</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.scheduleMode === "fixed" ? (
              <>
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
                      placeholder="Choose date"
                      className="flex-1 border-0 bg-transparent px-1 shadow-none hover:bg-muted/40"
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
                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" /> End date
                  </Label>
                  <div className="flex items-center gap-2">
                    <DatePicker
                      value={form.scheduledEndDate}
                      onChange={(v) =>
                        setForm({ ...form, scheduledEndDate: v })
                      }
                      placeholder="Choose date"
                      className="flex-1 border-0 bg-transparent px-1 shadow-none hover:bg-muted/40"
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
              </>
            ) : (
              <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" /> Due date
                </Label>
                <DatePicker
                  value={form.date}
                  onChange={(v) => setForm({ ...form, date: v })}
                  placeholder="No target day"
                  className="w-full border-0 bg-transparent px-1 shadow-none hover:bg-muted/40"
                />
              </div>
            )}

            {/* Estimated duration */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2 py-1">
              <Label htmlFor="c-duration" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" /> Duration
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="c-duration"
                  type="number"
                  min={form.durationUnit === "hr" ? 1 / 60 : 1}
                  step="any"
                  placeholder="45"
                  value={form.durationMin}
                  onChange={(e) =>
                    setForm({ ...form, durationMin: e.target.value })
                  }
                  className="h-8 w-20 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none hover:bg-muted/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = toggleDurationUnit(form.durationMin, form.durationUnit);
                    setForm({
                      ...form,
                      durationMin: next.value,
                      durationUnit: next.unit,
                    });
                  }}
                  className="inline-flex h-7 items-center justify-center rounded-md border border-input bg-card px-2.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted active:scale-95"
                  aria-label="Toggle duration unit (min/hr)"
                >
                  {form.durationUnit}
                </button>
              </div>
            </div>
          </div>

          {scheduleError && (
            <p role="alert" className="text-xs text-destructive">
              {scheduleError}
            </p>
          )}

          {/* Steps & subtasks */}
          <SubtaskEditor
            value={subtasks}
            onChange={setSubtasks}
            sectionLabel="Subtasks"
          />
        </div>

        <SheetFooter
          className={cn(
            "flex-row items-center justify-between gap-2 border-t border-border px-4 py-3",
            !isDesktop && "pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
          )}
        >
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !form.title.trim() || Boolean(scheduleError)}
          >
            {threadContext ? "Add to thread" : "Create Task"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
