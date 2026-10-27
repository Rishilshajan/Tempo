"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";

import type { Task, TaskActivity as TaskActivityRecord } from "@/db/schema";
import { getTaskActivity } from "@/server/actions";
import { log } from "@/lib/logger";

function formatActivityDate(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function TaskActivity({ task }: { task: Task }) {
  const [events, setEvents] = useState<TaskActivityRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    getTaskActivity(task.id)
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          log.error("Could not load task activity", error);
          toast.error("Could not load task activity");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [task.id, task.completedAt, task.updatedAt]);

  const visibleEvents = events;
  const hasCreatedEvent = visibleEvents.some(
    (event) => event.eventType === "task_created",
  );
  const hasCompletionEvent = visibleEvents.some(
    (event) =>
      event.eventType === "status_changed" &&
      event.summary.toLowerCase().endsWith("to done"),
  );
  const legacyEvents = [
    ...(!hasCreatedEvent
      ? [
          {
            id: `legacy-created-${task.id}`,
            summary: "Task created",
            createdAt: task.createdAt,
          },
        ]
      : []),
    ...(task.completedAt && !hasCompletionEvent
      ? [
          {
            id: `legacy-completed-${task.id}`,
            summary: "Task marked done",
            createdAt: task.completedAt,
          },
        ]
      : []),
  ];
  const timeline = [
    ...visibleEvents.map((event) => ({
      id: event.id,
      summary: event.summary,
      createdAt: event.createdAt,
    })),
    ...legacyEvents,
  ].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <section className="space-y-3" aria-label="Task activity">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Activity className="size-4 text-primary" /> Activity
      </h3>
      {timeline.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
          No activity yet.
        </p>
      ) : (
        <ol className="space-y-2 border-l border-border pl-3">
          {timeline.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[17px] top-2 size-2 rounded-full bg-primary/60 ring-2 ring-background" />
              <article className="rounded-lg border border-border bg-card px-3 py-2">
                <time className="text-[11px] font-medium text-muted-foreground">
                  {formatActivityDate(event.createdAt)}
                </time>
                <p className="mt-1 text-sm text-foreground">{event.summary}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
