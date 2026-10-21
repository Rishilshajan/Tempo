"use client";

import { useTransition } from "react";
import {
  CalendarArrowUp,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

import type { DatedSubtask } from "@/server/queries";
import { moveMilestoneToTomorrow, toggleMilestoneDone } from "@/server/actions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DatedSubtaskRow({
  item,
}: {
  item: DatedSubtask;
}) {
  const [pending, startTransition] = useTransition();
  const toggle = (done: boolean, event: React.MouseEvent) => {
    event.stopPropagation();
    startTransition(async () => {
      const result = await toggleMilestoneDone(item.subtask.id, done);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success(done ? "Subtask completed" : "Subtask marked incomplete");
      }
    });
  };

  const moveToTomorrow = (event: React.MouseEvent) => {
    event.stopPropagation();
    startTransition(async () => {
      const result = await moveMilestoneToTomorrow(item.subtask.id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Subtask moved to tomorrow");
    });
  };

  const dateLabel = item.subtask.date
    ? new Date(`${item.subtask.date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;
  const timeLabel = item.subtask.scheduledTime?.slice(0, 5);

  return (
    <div className="flex items-start gap-2.5 border-l-2 border-primary/20 pl-3">
      <button
        type="button"
        disabled={pending}
        onClick={(event) => toggle(!item.subtask.isCompleted, event)}
        aria-label={
          item.subtask.isCompleted ? "Mark subtask incomplete" : "Complete subtask"
        }
        className="mt-0.5 shrink-0 disabled:opacity-50"
      >
        {item.subtask.isCompleted ? (
          <CircleCheck className="size-4 text-ontrack" />
        ) : (
          <Circle className="size-4 text-muted-foreground/50 hover:text-primary" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <ListChecks className="size-3" /> Subtask
            </span>
            {(dateLabel || timeLabel) && (
              <span className="text-[11px] text-muted-foreground">
                {dateLabel}
                {timeLabel ? ` · ${timeLabel}` : ""}
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-1 text-[13px] font-medium text-foreground",
              item.subtask.isCompleted && "text-muted-foreground line-through",
            )}
          >
            {item.subtask.title}
          </p>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={moveToTomorrow}
            aria-label="Move subtask to tomorrow"
            title="Move to tomorrow"
            className="inline-flex items-center rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            <CalendarArrowUp className="size-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={pending}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-bold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  item.subtask.isCompleted ? "bg-ontrack" : "bg-muted-foreground/50",
                )}
              />
              {item.subtask.isCompleted ? "Completed" : "Not started"}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (!item.subtask.isCompleted) return;
                  startTransition(async () => {
                    const result = await toggleMilestoneDone(
                      item.subtask.id,
                      false,
                    );
                    if (!result.ok) toast.error(result.error);
                    else toast.success("Subtask marked incomplete");
                  });
                }}
                className="gap-2 text-[13px]"
              >
                <span className="size-2 rounded-full bg-muted-foreground/50" />
                Not started
                {!item.subtask.isCompleted && (
                  <Check className="ml-auto size-3.5 text-primary" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (item.subtask.isCompleted) return;
                  startTransition(async () => {
                    const result = await toggleMilestoneDone(
                      item.subtask.id,
                      true,
                    );
                    if (!result.ok) toast.error(result.error);
                    else toast.success("Subtask completed");
                  });
                }}
                className="gap-2 text-[13px]"
              >
                <span className="size-2 rounded-full bg-ontrack" />
                Completed
                {item.subtask.isCompleted && (
                  <Check className="ml-auto size-3.5 text-primary" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
