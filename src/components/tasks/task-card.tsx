"use client";

import { useTransition } from "react";
import { Clock, Flag, Minimize2, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";

import type { Task, Domain } from "@/db/schema";
import { cn } from "@/lib/utils";
import { formatDuration, STATUS_META, BOARD_COLUMNS } from "@/lib/task-ui";
import { moveTaskStatus } from "@/server/actions";
import { log } from "@/lib/logger";
import { DomainIcon } from "@/components/domains/domain-icon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function TaskCard({
  task,
  domain,
  onOpen,
}: {
  task: Task;
  domain?: Domain | null;
  onOpen: (task: Task) => void;
}) {
  const [pending, startTransition] = useTransition();
  const duration = formatDuration(task.durationMin);
  const isDone = task.status === "done";

  const changeStatus = (s: Task["status"]) => {
    if (s === task.status) return;
    startTransition(async () => {
      const res = await moveTaskStatus(task.id, s);
      if (!res.ok) {
        log.error("Status change failed", res.error);
        toast.error(res.error);
      } else {
        toast.success("Status updated");
      }
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open task: ${task.title}`}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task);
        }
      }}
      className={cn(
        "group cursor-pointer rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md",
        pending && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={
            domain
              ? { backgroundColor: `${domain.color}1f`, color: domain.color }
              : undefined
          }
        >
          {domain ? (
            <>
              <DomainIcon domain={domain} className="size-3" />
              {domain.name}
            </>
          ) : (
            <span className="rounded-full bg-muted px-1 text-muted-foreground">
              Uncategorized
            </span>
          )}
        </span>
        {task.importance === "important" && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-urgent/10 px-2 py-0.5 text-[11px] font-bold text-urgent">
            <Flag className="size-3" /> Important
          </span>
        )}
        {task.importance === "medium" && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-medium/15 px-2 py-0.5 text-[11px] font-bold text-medium">
            <Flag className="size-3" /> Medium
          </span>
        )}
        {task.isElastic && task.minDurationMin && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <Minimize2 className="size-3" /> Shrink {task.minDurationMin}m
          </span>
        )}
        {task.rollforwardCount > 0 && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-bold",
              task.rollforwardCount >= 3
                ? "bg-urgent/15 text-urgent"
                : "bg-rolledforward/15 text-rolledforward",
            )}
          >
            {task.rollforwardCount >= 3
              ? `Pushed ${task.rollforwardCount}x - still real?`
              : `Rolled ${task.rollforwardCount}x`}
          </span>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        <h4
          className={cn(
            "text-sm font-bold leading-snug text-foreground",
            isDone && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </h4>
        {task.description && (
          <p className="line-clamp-2 text-[13px] text-muted-foreground">
            {task.description}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          {task.timeHint && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 text-primary" />
              {task.timeHint}
            </span>
          )}
          {duration && (
            <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5">
              {duration}
            </span>
          )}
        </div>

        {/* Status dropdown (replaces Start / Complete) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            disabled={pending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[12px] font-bold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <span
              className={cn("size-2 rounded-full", STATUS_META[task.status].dot)}
            />
            {STATUS_META[task.status].label}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {BOARD_COLUMNS.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  changeStatus(s);
                }}
                className="gap-2 text-[13px]"
              >
                <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />
                {STATUS_META[s].label}
                {s === task.status && (
                  <Check className="ml-auto size-3.5 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
