/**
 * TEMPO-004 - Shared status controls and badge tone definitions.
 * Used by: BoardCard; CompactBoardRow; DayTaskRow; TaskList. Shared consumers remain supported.
 * Code map: src/components/code-map.md.
 */
"use client";
import { ChevronDown } from "lucide-react";

import { ActionTooltip } from "@/components/ui/tooltip";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuRadioGroup,
DropdownMenuRadioItem,
DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConvexError } from "convex/values";
import { Circle,CircleCheck,CircleDot } from "lucide-react";
import { useState,type ReactNode } from "react";
import { toast } from "sonner";
import type {
SetTaskCompleted,
SetTaskProgress,
TaskRecord,
} from "./task-list";

export const taskTones = {
  neutral: "bg-muted text-foreground",
  fixed: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  flexible: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  carried:
    "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  progress: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  completed:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  overdue: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
} as const;

export const allocationTones = {
  fixed: "bg-sky-700 text-white",
  flexible: "bg-teal-700 text-white",
  carried: "bg-violet-700 text-white",
} as const;

/**
 * TEMPO-004-F23 - TaskPill
 * Purpose: Applies the shared badge component and semantic tone.
 * Used by: BoardCard; CompactBoardRow; DayTaskRow; TaskList.
 * Trigger: The caller renders, recomputes or handles its associated interaction.
 */
export function TaskPill({
  tone = "neutral",
  children,
  solid = false,
}: {
  tone?: keyof typeof taskTones;
  children: ReactNode;
  solid?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={`h-auto min-h-6 border-transparent text-[10px] ${solid && tone in allocationTones ? allocationTones[tone as keyof typeof allocationTones] : taskTones[tone]}`}
    >
      {children}
    </Badge>
  );
}

const statuses = [
  { value: "not_started", label: "Not started", icon: Circle, tone: "neutral" },
  {
    value: "in_progress",
    label: "In progress",
    icon: CircleDot,
    tone: "progress",
  },
  {
    value: "completed",
    label: "Completed",
    icon: CircleCheck,
    tone: "completed",
  },
] as const;

const statusInk = {
  not_started: "text-muted-foreground",
  in_progress: "text-amber-800 dark:text-amber-200",
  completed: "text-emerald-800 dark:text-emerald-200",
};

/**
 * TEMPO-004-F24 - TaskStatusSelect
 * Purpose: Provides the single Not started/In progress/Completed dropdown.
 * Used by: BoardCard; CompactBoardRow; DayTaskRow; TaskList.
 * Trigger: The caller renders, recomputes or handles its associated interaction.
 */
export function TaskStatusSelect({
  task,
  disabled,
  onSetCompleted,
  onSetProgress,
  onBusyChange,
  compact = false,
}: {
  task: TaskRecord;
  disabled?: boolean;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
  onBusyChange?: (busy: boolean) => void;
  compact?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const value =
    task.status === "completed"
      ? "completed"
      : (task.progress ?? "not_started");
  const selected = statuses.find((item) => item.value === value)!;
  /**
 * TEMPO-004-F25 - change
 * Purpose: Persists the selected task status with busy, error and recurrence handling.
 * Used by: TaskStatusSelect.
 * Trigger: The status dropdown selects a different value.
 */
async function change(next: string | null) {
    if (saving || disabled || !next || next === value) return;
    if (
      next !== "completed" &&
      next !== "not_started" &&
      next !== "in_progress"
    )
      return;
    setSaving(true);
    onBusyChange?.(true);
    try {
      if (next === "completed") {
        const occurrence = await onSetCompleted(task._id, true);
        if (typeof occurrence === "string")
          toast.success("Next recurring task created.");
      } else {
        await onSetProgress(task._id, next);
      }
    } catch (cause) {
      toast.error(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "Couldn't update this task. Please try again.",
      );
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  }
  if (task.recurrencePlanned)
    return <TaskPill tone="neutral">Planned</TaskPill>;
  return (
    <DropdownMenu>
      <ActionTooltip
        content={
          "Status: " +
          selected.label +
          ". Choose Not started, In progress, or Completed."
        }
      >
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              disabled={saving || disabled}
              aria-label={`Status for ${task.title}: ${selected.label}`}
              className={
                compact
                  ? "size-9 min-h-9 rounded-lg border border-border p-0"
                  : "min-h-9 gap-1.5 rounded-full border border-border bg-transparent px-2.5 text-[11px] text-foreground"
              }
            />
          }
        >
          <span className="inline-flex items-center gap-1.5">

            {!compact && selected.label}
          </span>

          {!compact && <ChevronDown className="size-3" aria-hidden="true" />}
        </DropdownMenuTrigger>
      </ActionTooltip>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={value} onValueChange={change}>
          {statuses.map((item) => {
            const StatusIcon = item.icon;
            return (
              <DropdownMenuRadioItem
                key={item.value}
                value={item.value}
                closeOnClick
                className="min-h-9 text-xs"
                disabled={saving || disabled}
              >
                <span className="inline-flex items-center gap-1.5 py-1">
                  <StatusIcon
                    className={`size-3 ${statusInk[item.value]}`}
                    aria-hidden="true"
                  />
                  {item.label}
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
