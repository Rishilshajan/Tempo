"use client";
import { usePaginatedQuery } from "convex/react";
import { Activity } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { taskTimestamp } from "@/lib/task-datetime";
import type { TaskRecord } from "./task-list";

export function DetailActivity({ task }: { task: TaskRecord }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.taskDetails.listActivity,
    { taskId: task._id },
    { initialNumItems: 20 },
  );
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Activity className="size-4 text-primary" aria-hidden="true" />
        Activity
      </h3>
      {status === "LoadingFirstPage" && (
        <p role="status" className="text-xs text-muted-foreground">
          Loading activity…
        </p>
      )}
      <ol className="ml-1 border-l border-border pl-3">
        {results.map((event) => (
          <li key={event._id} className="relative mb-3">
            <span
              className="absolute -left-[17px] top-4 size-2 rounded-full bg-primary/60 ring-2 ring-card"
              aria-hidden="true"
            />
            <article className="space-y-1 rounded-lg border border-border bg-card p-3">
              <time
                dateTime={new Date(event.timestamp).toISOString()}
                className="block text-xs text-muted-foreground"
              >
                {taskTimestamp(event.timestamp, task.timezone)}
              </time>
              <p className="break-words text-sm leading-5 [overflow-wrap:anywhere]">
                {event.description}
              </p>
              {event.actorName && (
                <p className="text-[10px] text-muted-foreground">
                  {event.actorName}
                </p>
              )}
            </article>
          </li>
        ))}
      </ol>
      {status !== "LoadingFirstPage" && !results.length && (
        <article className="space-y-1 rounded-lg border border-border p-3">
          <time
            dateTime={new Date(task._creationTime).toISOString()}
            className="block text-xs text-muted-foreground"
          >
            {taskTimestamp(task._creationTime, task.timezone)}
          </time>
          <p className="text-sm">Task created</p>
        </article>
      )}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          variant="outline"
          className="w-full"
          disabled={status === "LoadingMore"}
          onClick={() => loadMore(20)}
        >
          {status === "LoadingMore" ? "Loading…" : "Load older activity"}
        </Button>
      )}
    </div>
  );
}
