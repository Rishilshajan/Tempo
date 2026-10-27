"use client";

import { useRef, useState } from "react";
import {
  GripVertical,
  Circle,
  CircleCheck,
  Plus,
  X,
  CalendarDays,
  Pencil,
} from "lucide-react";

import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

type Unit = "min" | "hr";

/** Client-side draft of a subtask (strings for inputs). */
export type SubtaskDraft = {
  id?: string;
  title: string;
  description: string;
  date: string; // "" or YYYY-MM-DD
  scheduledTime: string; // "" or HH:MM
  durationEst: string; // number, in the chosen unit
  durationUnit: Unit;
  isCompleted: boolean;
};

export function emptySubtask(): SubtaskDraft {
  return {
    title: "",
    description: "",
    date: "",
    scheduledTime: "",
    durationEst: "15",
    durationUnit: "min",
    isCompleted: false,
  };
}

/** Convert a value + unit to whole minutes (fallback 15). */
export function toMinutes(value: string, unit: Unit): number {
  const n = Number(value);
  if (!n || n <= 0) return 15;
  return unit === "hr" ? Math.round(n * 60) : Math.round(n);
}

/** Minutes -> a {value, unit} display pair (whole hours shown as hr). */
export function fromMinutes(min: number): { value: string; unit: Unit } {
  if (min >= 60 && min % 60 === 0) return { value: String(min / 60), unit: "hr" };
  return { value: String(min), unit: "min" };
}

/** Switch the displayed unit without changing the represented duration. */
export function toggleDurationUnit(
  value: string,
  unit: Unit,
): { value: string; unit: Unit } {
  const nextUnit = unit === "hr" ? "min" : "hr";
  const amount = Number(value);
  if (!value.trim() || !Number.isFinite(amount) || amount <= 0) {
    return { value, unit: nextUnit };
  }

  const converted =
    unit === "min" ? Number((amount / 60).toFixed(4)) : Math.round(amount * 60);
  return { value: String(converted), unit: nextUnit };
}

export type SubtaskPayload = {
  id?: string;
  title: string;
  description: string | null;
  date: string | null;
  scheduledTime: string | null;
  durationEstMin: number;
  isCompleted: boolean;
};

/** Map drafts -> server milestone payload (drops blank-title rows). */
export function subtasksToPayload(subtasks: SubtaskDraft[]): SubtaskPayload[] {
  return subtasks
    .filter((s) => s.title.trim())
    .map((s) => ({
      ...(s.id ? { id: s.id } : {}),
      title: s.title.trim(),
      description: s.description.trim() || null,
      date: s.date || null,
      scheduledTime: s.scheduledTime || null,
      durationEstMin: toMinutes(s.durationEst, s.durationUnit),
      isCompleted: s.isCompleted,
    }));
}

/* ----------------------------- date helpers ---------------------------- */

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
const TODAY_ISO = () => isoFromDate(new Date());
const TOMORROW_ISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoFromDate(d);
};

/** Short human label for a row's date ("Today", "Tomorrow", "Oct 18"). */
function dateLabel(iso: string): string | null {
  if (!iso) return null;
  if (iso === TODAY_ISO()) return "Today";
  if (iso === TOMORROW_ISO()) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------- component ------------------------------ */

export function SubtaskEditor({
  value,
  onChange,
  titleOnly = false,
  sectionLabel = "Steps & Subtasks",
  compactRows = false,
}: {
  value: SubtaskDraft[];
  onChange: (next: SubtaskDraft[]) => void;
  titleOnly?: boolean;
  sectionLabel?: string;
  compactRows?: boolean;
}) {
  const dragFrom = useRef<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const add = () => {
    onChange([...value, emptySubtask()]);
    if (compactRows) setEditingIndex(value.length);
  };
  const update = (i: number, patch: Partial<SubtaskDraft>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
    setEditingIndex((current) =>
      current === null || current === i
        ? null
        : current > i
          ? current - 1
          : current,
    );
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setEditingIndex((current) => {
      if (current === null) return null;
      if (current === from) return to;
      if (from < to && current > from && current <= to) return current - 1;
      if (from > to && current >= to && current < from) return current + 1;
      return current;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {sectionLabel} ({value.length})
        </Label>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="size-3.5" /> Add {titleOnly ? "subtask" : "step"}
        </button>
      </div>

      {value.length === 0 ? (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {titleOnly
            ? "Add a subtask title…"
            : "Break this into steps (optional)…"}
        </button>
      ) : (
        <div className="space-y-2">
          {value.map((s, i) => {
            const label = dateLabel(s.date);
            return (
              <div
                key={i}
                draggable
                onDragStart={() => (dragFrom.current = i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragFrom.current !== null && dragFrom.current !== i) {
                    reorder(dragFrom.current, i);
                    dragFrom.current = i;
                  }
                }}
                onDragEnd={() => (dragFrom.current = null)}
                className={cn(
                  "rounded-xl border border-border bg-card p-2.5",
                  titleOnly && "py-2",
                  compactRows && "rounded-none border-x-0 border-t-0 bg-transparent px-1 py-2 last:border-b-0",
                )}
              >
                {compactRows && !titleOnly && editingIndex !== i ? (
                  <div className="flex min-h-8 items-center gap-2">
                    <span
                      className="cursor-grab text-muted-foreground/50 active:cursor-grabbing"
                      title="Drag to reorder"
                      aria-hidden="true"
                    >
                      <GripVertical className="size-3.5" />
                    </span>
                    <button
                      type="button"
                      onClick={() => update(i, { isCompleted: !s.isCompleted })}
                      aria-label={
                        s.isCompleted ? "Mark incomplete" : "Mark complete"
                      }
                      className="shrink-0"
                    >
                      {s.isCompleted ? (
                        <CircleCheck className="size-4 text-ontrack" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        s.isCompleted && "text-muted-foreground line-through",
                      )}
                      title={s.title}
                    >
                      {s.title || "Untitled subtask"}
                    </span>
                    {label && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {label}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingIndex(i)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${s.title || "subtask"}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="rounded p-1 text-muted-foreground hover:bg-urgent/10 hover:text-urgent"
                      aria-label={`Remove ${s.title || "subtask"}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                <div className="flex items-center gap-2">
                  <span
                    className="cursor-grab text-muted-foreground/60 active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-hidden="true"
                  >
                    <GripVertical className="size-4" />
                  </span>
                  {titleOnly ? (
                    <Input
                      value={s.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (i === value.length - 1) add();
                        }
                      }}
                      placeholder="Subtask title"
                      aria-label={`Subtask ${i + 1} title`}
                      className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          update(i, { isCompleted: !s.isCompleted })
                        }
                        aria-label={
                          s.isCompleted ? "Mark incomplete" : "Mark complete"
                        }
                      >
                        {s.isCompleted ? (
                          <CircleCheck className="size-5 text-ontrack" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground" />
                        )}
                      </button>
                      <Textarea
                        value={s.title}
                        rows={1}
                        onChange={(e) => update(i, { title: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (i === value.length - 1) add();
                          }
                        }}
                        placeholder="Step title"
                        className={cn(
                          "min-h-0 flex-1 resize-none break-words border-0 bg-transparent px-0 py-0 text-sm outline-none placeholder:text-muted-foreground/60",
                          s.isCompleted &&
                            "text-muted-foreground line-through",
                        )}
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-muted-foreground hover:text-urgent"
                    aria-label="Remove step"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {!titleOnly && <div>
                {/* Details */}
                <div className="mt-2 pl-8">
                  <Textarea
                    rows={1}
                    value={s.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Add details…"
                    className="min-h-0 resize-none py-1.5 text-[13px]"
                  />
                </div>

                {/* Scheduling */}
                <div className="mt-2 space-y-1.5 pl-8">
                  {/* Quick date chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DateChip
                      label="Today"
                      active={s.date === TODAY_ISO()}
                      onClick={() =>
                        update(i, {
                          date: s.date === TODAY_ISO() ? "" : TODAY_ISO(),
                        })
                      }
                    />
                    <DateChip
                      label="Tomorrow"
                      active={s.date === TOMORROW_ISO()}
                      onClick={() =>
                        update(i, {
                          date: s.date === TOMORROW_ISO() ? "" : TOMORROW_ISO(),
                        })
                      }
                    />
                  </div>
                  {/* Date + Time, equal width side by side */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="min-w-0">
                      <DatePicker
                        value={s.date}
                        onChange={(v) => update(i, { date: v })}
                        placeholder={
                          label && label !== "Today" && label !== "Tomorrow"
                            ? label
                            : "Date"
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <TimePicker
                        value={s.scheduledTime}
                        onChange={(v) => update(i, { scheduledTime: v })}
                        ariaLabel="Subtask time"
                      />
                    </div>
                  </div>
                  {/* Estimated duration */}
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-muted-foreground">
                      Estimated duration
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={s.durationUnit === "hr" ? 1 / 60 : 1}
                        step="any"
                        placeholder="15"
                        value={s.durationEst}
                        onChange={(e) => update(i, { durationEst: e.target.value })}
                        className="h-9 flex-1"
                        aria-label="Subtask estimated duration"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = toggleDurationUnit(
                            s.durationEst,
                            s.durationUnit,
                          );
                          update(i, {
                            durationEst: next.value,
                            durationUnit: next.unit,
                          });
                        }}
                        className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg border border-input text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        aria-label="Toggle unit (min/hr)"
                      >
                        {s.durationUnit}
                      </button>
                    </div>
                  </div>
                </div>
                </div>}
                {compactRows && !titleOnly && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Done editing
                    </button>
                  </div>
                )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors",
        active
          ? "bg-primary/10 text-primary ring-primary/30"
          : "bg-card text-muted-foreground ring-border hover:bg-secondary",
      )}
    >
      <CalendarDays className="size-3" />
      {label}
    </button>
  );
}
