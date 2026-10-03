"use client";

import type { Task, Domain } from "@/db/schema";
import { cn } from "@/lib/utils";
import { BOARD_COLUMNS, STATUS_META } from "@/lib/task-ui";
import { TaskCard } from "./task-card";

export function TaskBoard({
  tasks,
  domainMap,
  onOpen,
  columns = BOARD_COLUMNS,
}: {
  tasks: Task[];
  domainMap: Map<string, Domain>;
  onOpen: (task: Task) => void;
  columns?: Task["status"][];
}) {
  const byStatus = new Map<Task["status"], Task[]>();
  for (const col of columns) byStatus.set(col, []);
  for (const t of tasks) byStatus.get(t.status)?.push(t);

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:snap-none lg:px-0">
      {columns.map((col) => {
        const meta = STATUS_META[col];
        const items = byStatus.get(col) ?? [];
        return (
          <div
            key={col}
            className="flex w-[84vw] max-w-[320px] shrink-0 snap-center flex-col gap-3 lg:w-72"
          >
            <div className="flex items-center gap-2 px-1">
              <span className={cn("size-2.5 rounded-full", meta.dot)} />
              <span className="text-sm font-bold text-foreground">
                {meta.label}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                {items.length}
              </span>
            </div>

            {items.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                domain={t.domainId ? domainMap.get(t.domainId) : null}
                onOpen={onOpen}
              />
            ))}

            {items.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                Nothing here
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
