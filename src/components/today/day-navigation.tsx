/**
 * TEMPO-003 - TEMPO-003-F07: selected-day navigation.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { shiftDate } from "@/lib/validation/recurrence";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TaskPrefill } from "./today-types";

/**
 * TEMPO-003-F07 - DayNavigation
 * Purpose: Provides the existing DayNavigation behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function DayNavigation({
  date,
  onDateChange,
}: {
  date: string;
  today: string;
  onDateChange: (date: string | null) => void;
  onCreateTask: (prefill: TaskPrefill) => void;
}) {
  return (
    <div className="flex w-full max-w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
      <div className="grid w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 lg:flex lg:w-auto">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-10 w-7 lg:size-10"
          aria-label="Previous day"
          disabled={!date || date === "0001-01-01"}
          onClick={() => onDateChange(shiftDate(date, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div className="min-w-0 flex-1 lg:max-w-[200px] lg:flex-none">
          <DatePicker
            value={date}
            onChange={(value) => {
              if (value) onDateChange(value);
            }}
            ariaLabel="Dashboard date"
            minDate="0001-01-01"
            maxDate="9999-12-31"
            required
            showTodayAction
            className="min-h-10 w-full !justify-center text-xs"
          />
        </div>
        <div className="flex min-w-0 items-center justify-end gap-0.5 lg:gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-10 w-7 lg:size-10"
            aria-label="Next day"
            disabled={!date || date === "9999-12-31"}
            onClick={() => onDateChange(shiftDate(date, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

    </div>
  );
}
