"use client";

import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

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
      <SelectContent align="end">
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

export function PriorityLabel({ value }: { value: string }) {
  const priority =
    priorities.find((option) => option.value === value) ?? priorities[1];
  return (
    <>
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: priority.color }}
        aria-hidden="true"
      />
      <span>{priority.label}</span>
    </>
  );
}
