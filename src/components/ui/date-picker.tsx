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
  showTodayAction = false,
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
  showTodayAction?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [today, setToday] = React.useState<string | null>(null);
  React.useEffect(() => {
    const refresh = () => setToday(toISO(new Date()));
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const earliestDate = today && (!minDate || minDate < today) ? today : minDate;
  const date = toDate(value);
  const minimum = toDate(earliestDate);
  const maximum = toDate(maxDate);
  const outsideBounds =
    !!value &&
    ((!!earliestDate && value < earliestDate) ||
      (!!maxDate && value > maxDate));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setToday(toISO(new Date()));
        setOpen(next);
      }}
    >
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
            const currentDay = toISO(new Date());
            const liveMinimum =
              minDate && minDate > currentDay ? minDate : currentDay;
            if (next && (next < liveMinimum || (maxDate && next > maxDate)))
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
        {showTodayAction && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-10 w-full text-xs"
              disabled={
                !today ||
                !!(minDate && today < minDate) ||
                !!(maxDate && today > maxDate)
              }
              onClick={() => {
                const current = toISO(new Date());
                if (
                  (minDate && current < minDate) ||
                  (maxDate && current > maxDate)
                )
                  return;
                onChange(current);
                setOpen(false);
              }}
            >
              Today
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
