"use client";

import { useEffect, useRef } from "react";
import { Clock3, Plus } from "lucide-react";
import { timeZoneLabel } from "@/lib/timezone-label";
import type { TaskRecord } from "@/components/tasks/task-list";
import { domainColors } from "@/components/domains/domain-appearance";
import {
  formatMinutes,
  timelineLayout,
  type DayWindow,
} from "@/lib/today-model";

export function DayTimeline({
  tasks,
  day,
  now,
  onOpenTask,
  onAdd,
}: {
  tasks: TaskRecord[];
  day: DayWindow;
  now: number;
  onOpenTask: (task: TaskRecord) => void;
  onAdd: (startAt: number) => void;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const span = day.end - day.start;
  const hours = span / 3600000;
  const height = hours * 58;
  const ticks = [
    ...Array.from(
      { length: Math.ceil(hours) },
      (_, index) => day.start + index * 3600000,
    ),
    day.end,
  ];
  const blocks = timelineLayout(tasks, day);
  const time = (at: number) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: day.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(at);
  const timestamp = (at: number) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: day.timezone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(at);
  const today = day.date === day.today;
  useEffect(() => {
    const first = tasks
      .filter((task) => task.schedule.type === "fixed")
      .map((task) =>
        task.schedule.type === "fixed" ? task.schedule.startAt : day.start,
      )
      .sort((a, b) => a - b)[0];
    const at = today ? now : (first ?? day.start + 8 * 3600000);
    if (scroll.current)
      scroll.current.scrollTop = Math.max(
        0,
        ((at - day.start) / 3600000 - 1) * 58,
      );
    // Only move the viewport when the selected date changes, never during reading.
  }, [day.date]);
  return (
    <section
      aria-labelledby="timeline-heading"
      className="min-w-0 rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="timeline-heading"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Clock3 className="size-4 text-primary" aria-hidden="true" />
          Timeline
        </h2>
        <span className="text-xs text-muted-foreground">
          {blocks.length} fixed {blocks.length === 1 ? "block" : "blocks"} ·{" "}
          {hours}h
        </span>
      </div>
      <div
        ref={scroll}
        tabIndex={0}
        aria-label="Full-day timeline, scroll to explore all hours"
        className="relative max-h-[460px] overflow-y-auto overscroll-y-auto rounded-lg border border-border/60 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="relative my-2 ml-12 mr-1" style={{ height }}>
          {ticks.map((at, index) => {
            const last = index === ticks.length - 1;
            return (
              <div
                key={at}
                className="absolute left-0 right-0 border-t border-border/60"
                style={{ top: ((at - day.start) / 3600000) * 58 }}
              >
                <span className="absolute -left-12 -top-2 w-10 text-right font-mono text-[10px] text-muted-foreground">
                  {last ? "24:00" : time(at)}
                </span>
                {!last && (
                  <button
                    type="button"
                    onClick={() => onAdd(at)}
                    aria-label={`Create task at ${timestamp(at)}`}
                    style={{
                      height: (Math.min(3600000, day.end - at) / 3600000) * 58,
                    }}
                    className="group absolute inset-x-0 top-0 flex items-start justify-end rounded-sm p-1 text-primary hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Plus
                      className="size-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
            );
          })}
          {blocks.map(({ task, start, end, lane, lanes }) => {
            const schedule = task.schedule;
            if (schedule.type !== "fixed") return null;
            const color =
              domainColors.find((option) => option.id === task.domain?.color)
                ?.value ?? "var(--primary)";
            const state =
              task.status === "completed"
                ? "Completed"
                : today && schedule.endAt <= now
                  ? "Overdue"
                  : today && schedule.startAt <= now
                    ? "Now"
                    : "Scheduled";
            const continuesFromPreviousDay = schedule.startAt < day.start;
            const continuesIntoNextDay = schedule.endAt > day.end;
            const label = `${task.title}. ${timestamp(schedule.startAt)} to ${timestamp(schedule.endAt)}. ${state}.${continuesFromPreviousDay ? " Continues from the previous day." : ""}${continuesIntoNextDay ? " Continues into the next day." : ""}`;
            return (
              <button
                key={task._id}
                type="button"
                onClick={() => onOpenTask(task)}
                aria-label={label}
                title={label}
                style={{
                  top: ((start - day.start) / span) * height,
                  height: ((end - start) / span) * height,
                  left: `${(lane / lanes) * 100}%`,
                  width: `calc(${100 / lanes}% - 3px)`,
                  borderColor: `color-mix(in srgb, ${color} 40%, var(--border))`,
                  borderLeftColor: color,
                  backgroundColor: `color-mix(in srgb, ${color} 18%, var(--card))`,
                }}
                className="absolute z-10 overflow-hidden rounded-md border border-l-[3px] px-2 text-left text-[11px] leading-4 shadow-sm hover:ring-1 hover:ring-primary focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span
                  className={`block truncate font-medium ${task.status === "completed" ? "line-through" : ""}`}
                >
                  {task.title}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {continuesFromPreviousDay ? "↤ " : ""}
                  {time(start)}–{end === day.end ? "24:00" : time(end)}
                  {continuesIntoNextDay ? " ↦" : ""} · {state}
                </span>
                {end - start > 45 * 60000 && (
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {task.domain?.name ?? "Uncategorized"} ·{" "}
                    {formatMinutes((end - start) / 60000)}
                    {continuesFromPreviousDay || continuesIntoNextDay
                      ? " this day"
                      : ""}
                  </span>
                )}
              </button>
            );
          })}
          {today && now >= day.start && now < day.end && (
            <div
              aria-label={`Current time ${time(now)}`}
              className="pointer-events-none absolute inset-x-0 z-20 border-t border-destructive"
              style={{ top: ((now - day.start) / span) * height }}
            >
              <span className="absolute -left-1 -top-1 size-2 rounded-full bg-destructive" />
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        <span title={day.timezone}>
          Device timezone:{" "}
          {timeZoneLabel(day.timezone, today ? now : day.start)}.
        </span>{" "}
        Select a block for details or an empty hour to add a task.
        {hours !== 24
          ? ` This date has ${hours} hours because the clocks change.`
          : ""}
      </p>
    </section>
  );
}
