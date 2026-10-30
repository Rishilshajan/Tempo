"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const STEP_MIN = 15;

/** All quarter-hour slots as 24h "HH:MM" (00:00 … 23:45). */
const OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += STEP_MIN) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return out;
})();

/** "13:30" -> "1:30 PM". */
function label12(v: string): string {
  const [h, m] = v.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Time-of-day picker that mirrors the DatePicker pattern: a styled trigger
 * button + a popover list of quarter-hour slots. Value is "" or 24h "HH:MM".
 */
export function TimePicker({
  value,
  onChange,
  placeholder = "Time",
  className,
  ariaLabel,
  required = false,
  minTime,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  required?: boolean;
  minTime?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "center" });
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            aria-invalid={
              (!!value && !!minTime && value < minTime) || undefined
            }
            className={cn(
              "w-full min-w-0 justify-start gap-2 font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <Clock className="size-4 shrink-0" />
            <span className="truncate">
              {value ? label12(value) : placeholder}
            </span>
          </Button>
        }
      />
      <PopoverContent
        className="w-44 p-1"
        align="start"
        aria-label={ariaLabel ?? "Choose a time"}
        initialFocus={() =>
          selectedRef.current?.disabled ? null : selectedRef.current
        }
      >
        <div className="max-h-56 overflow-y-auto">
          {value && !required && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mb-1 flex w-full items-center rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              Clear
            </button>
          )}
          {OPTIONS.map((t) => {
            const active = t === value;
            return (
              <button
                key={t}
                type="button"
                ref={active ? selectedRef : undefined}
                aria-pressed={active}
                disabled={!!minTime && t < minTime}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "hover:bg-secondary",
                )}
              >
                {label12(t)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
