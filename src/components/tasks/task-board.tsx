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
  noteCounts = {},
}: {
  tasks: Task[];
  domainMap: Map<string, Domain>;
  onOpen: (task: Task) => void;
  columns?: Task["status"][];
  noteCounts?: Record<string, number>;
}) {
  const byStatus = new Map<Task["status"], Task[]>();
  for (const col of columns) byStatus.set(col, []);
  for (const t of tasks) byStatus.get(t.status)?.push(t);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-4 lg:overflow-x-auto lg:pb-4">
      {columns.map((col) => {
        const meta = STATUS_META[col];
        const items = byStatus.get(col) ?? [];
        return (
          <div
            key={col}
            className="flex w-full shrink-0 flex-col gap-3 lg:w-[22rem]"
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
                noteCount={noteCounts[t.id] ?? 0}
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
