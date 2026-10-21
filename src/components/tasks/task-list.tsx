"use client";

import type { Task, Domain } from "@/db/schema";
import type { DatedSubtask } from "@/server/queries";
import { TaskCard } from "./task-card";

export function TaskList({
  tasks,
  domainMap,
  onOpen,
  noteCounts = {},
  datedSubtasks = [],
}: {
  tasks: Task[];
  domainMap: Map<string, Domain>;
  onOpen: (task: Task) => void;
  noteCounts?: Record<string, number>;
  datedSubtasks?: DatedSubtask[];
}) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  for (const item of datedSubtasks) {
    if (!taskById.has(item.task.id)) taskById.set(item.task.id, item.task);
  }
  const subtasksByTask = new Map<string, DatedSubtask[]>();
  for (const item of datedSubtasks) {
    const items = subtasksByTask.get(item.task.id) ?? [];
    items.push(item);
    subtasksByTask.set(item.task.id, items);
  }
  const tasksWithSubtaskParents = [...taskById.values()];

  if (!tasksWithSubtaskParents.length) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No tasks here yet.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {tasksWithSubtaskParents.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          domain={t.domainId ? domainMap.get(t.domainId) : null}
          onOpen={onOpen}
          noteCount={noteCounts[t.id] ?? 0}
          datedSubtasks={subtasksByTask.get(t.id)}
        />
      ))}
    </div>
  );
}
