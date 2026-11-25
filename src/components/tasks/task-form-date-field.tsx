/**
 * TEMPO-005 - Shared date/time field adapter.
 * Used by: TaskFormSchedule.
 * Code map: src/components/code-map.md.
 */
"use client";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { useId } from "react";


/**
 * TEMPO-005-F19 - DateField
 * Purpose: Adapts DatePicker or TimePicker with the current value and validity state.
 * Used by: TaskFormSchedule.
 * Trigger: A schedule date/time field renders.
 */
export function DateField({
  label,
  value,
  onChange,
  type,
  required,
  minDate,
  minTime,
  error,
  field,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: "date" | "time";
  required?: boolean;
  minDate?: string;
  minTime?: string;
  error?: string;
  field?: string;
}) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-invalid={!!error || undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      data-validation-field={field ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}
      className="flex min-w-0 flex-col gap-1.5 text-[11px] text-muted-foreground"
    >
      <span id={`${id}-label`}>{label}</span>
      {type === "date" ? (
        <DatePicker
          value={value}
          onChange={onChange}
          ariaLabel={label}
          ariaInvalid={!!error}
          ariaDescribedBy={error ? `${id}-error` : undefined}
          required={required}
          minDate={minDate}
          placeholder="Choose date"
          className="min-h-9 min-w-0 bg-muted/40 text-xs text-foreground"
        />
      ) : (
        <TimePicker
          ariaLabel={label}
          ariaInvalid={!!error}
          ariaDescribedBy={error ? `${id}-error` : undefined}
          required={required}
          minTime={minTime}
          value={value}
          onChange={onChange}
          placeholder="Choose time"
          className="min-h-9 min-w-0 max-w-full bg-muted/40 text-foreground"
        />
      )}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
