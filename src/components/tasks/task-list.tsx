"use client";

import type { Task, Domain } from "@/db/schema";
import { TaskCard } from "./task-card";

export function TaskList({
  tasks,
  domainMap,
  onOpen,
}: {
  tasks: Task[];
  domainMap: Map<string, Domain>;
  onOpen: (task: Task) => void;
}) {
  if (!tasks.length) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No tasks here yet.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          domain={t.domainId ? domainMap.get(t.domainId) : null}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
