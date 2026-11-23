/**
 * TEMPO-003 - Existing shared create/edit date field.
 * Code map: src/components/code-map.md.
 */
"use client";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

/**
 * TEMPO-003-F30 - DateField
 * Purpose: Provides the existing DateField behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function DateField({
  label,
  value,
  onChange,
  type,
  required,
  minDate,
  minTime,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: "date" | "time";
  required?: boolean;
  minDate?: string;
  minTime?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[11px] text-muted-foreground">
      {label}
      {type === "date" ? (
        <DatePicker
          value={value}
          onChange={onChange}
          ariaLabel={label}
          required={required}
          minDate={minDate}
          placeholder="Choose date"
          className="min-h-9 min-w-0 bg-muted/40 text-xs text-foreground"
        />
      ) : (
        <TimePicker
          ariaLabel={label}
          required={required}
          minTime={minTime}
          value={value}
          onChange={onChange}
          placeholder="Choose time"
          className="min-h-9 min-w-0 max-w-full bg-muted/40 text-foreground"
        />
      )}
    </label>
  );
}
