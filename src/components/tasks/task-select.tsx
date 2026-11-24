/**
 * TEMPO-004 - Shared select input, priority options and priority label.
 * Used by: MyTasksBoard; DayTaskPanel; task forms. Shared consumers remain supported.
 * Code map: src/components/code-map.md.
 */
"use client";

import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

/**
 * TEMPO-004-F26 - TaskSelect
 * Purpose: Renders the shared accessible select control and options.
 * Used by: MyTasksBoard; DayTaskPanel; task forms.
 * Trigger: The caller renders, recomputes or handles its associated interaction.
 */
export function TaskSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: ReactNode; disabled?: boolean }[];
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={label}
        className="min-h-10 w-full min-w-0 border-transparent bg-muted/40 text-sm"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {options.find((option) => option.value === value)?.label}
        </span>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[var(--anchor-width)] max-w-[calc(100vw-24px)]">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="min-h-8 data-selected:bg-soft-lime data-selected:text-foreground"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export const priorities = [
  { value: "low", label: "Low", color: "var(--ontrack)" },
  { value: "medium", label: "Medium", color: "var(--medium)" },
  { value: "high", label: "High", color: "#c4772d" },
  { value: "urgent", label: "Urgent", color: "var(--urgent)" },
] as const;

/**
 * TEMPO-004-F27 - PriorityLabel
 * Purpose: Resolves the stored priority to its text label.
 * Used by: BoardCard; CompactBoardRow; DayTaskRow; TaskDetailWorkspace; task forms.
 * Trigger: A priority label renders.
 */
export function PriorityLabel({ value }: { value: string }) {
  const priority =
    priorities.find((option) => option.value === value) ?? priorities[1];
  return (
    <>
<span>{priority.label}</span>
    </>
  );
}
