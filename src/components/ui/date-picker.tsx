"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function toDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toISO(d?: Date): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  ariaLabel,
  disabled,
  required = false,
  minDate,
  maxDate,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const date = toDate(value);
  const minimum = toDate(minDate);
  const maximum = toDate(maxDate);
  const outsideBounds =
    !!value &&
    ((!!minDate && value < minDate) || (!!maxDate && value > maxDate));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            aria-invalid={outsideBounds || undefined}
            disabled={disabled}
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !date && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {date
                ? date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : placeholder}
            </span>
          </Button>
        }
      />
      <PopoverContent
        className="w-auto max-w-[calc(100vw-2rem)] p-0"
        align="start"
        aria-label={ariaLabel ?? "Choose a date"}
      >
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={
            outsideBounds ? (minimum ?? maximum) : (date ?? minimum)
          }
          disabled={[
            ...(minimum ? [{ before: minimum }] : []),
            ...(maximum ? [{ after: maximum }] : []),
          ]}
          required={required}
          onSelect={(d: Date | undefined) => {
            const next = toISO(d);
            if (
              next &&
              ((minDate && next < minDate) || (maxDate && next > maxDate))
            )
              return;
            onChange(next);
            setOpen(false);
          }}
          autoFocus
        />
        {!required && date && (
          <Button
            type="button"
            variant="ghost"
            className="m-2"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Clear date
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
