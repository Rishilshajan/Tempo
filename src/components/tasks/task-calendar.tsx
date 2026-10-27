"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Task, Domain } from "@/db/schema";
import type { DatedSubtask } from "@/server/queries";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const nextISO = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export function TaskCalendar({
  tasks,
  domainMap,
  onOpen,
  datedSubtasks = [],
}: {
  tasks: Task[];
  domainMap: Map<string, Domain>;
  onOpen: (task: Task) => void;
  datedSubtasks?: DatedSubtask[];
}) {
  const now = new Date();
  const todayStr = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const [cursor, setCursor] = useState({
    y: now.getFullYear(),
    m: now.getMonth(),
  });
  const [selected, setSelected] = useState(todayStr);

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.date) continue;
      const endDate =
        t.scheduledEndDate && t.scheduledEndDate >= t.date
          ? t.scheduledEndDate
          : t.date;
      for (let date = t.date; date <= endDate; date = nextISO(date)) {
        const arr = map.get(date) ?? [];
        arr.push(t);
        map.set(date, arr);
      }
    }
    return map;
  }, [tasks]);

  const subtasksByDate = useMemo(() => {
    const map = new Map<string, DatedSubtask[]>();
    for (const item of datedSubtasks) {
      if (!item.subtask.date) continue;
      const dateItems = map.get(item.subtask.date) ?? [];
      dateItems.push(item);
      map.set(item.subtask.date, dateItems);
    }
    return map;
  }, [datedSubtasks]);

  const firstWeekday = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const selectedSubtasks = subtasksByDate.get(selected) ?? [];
  const selectedTaskMap = new Map(
    (byDate.get(selected) ?? []).map((task) => [task.id, task]),
  );
  for (const item of selectedSubtasks) {
    if (!selectedTaskMap.has(item.task.id))
      selectedTaskMap.set(item.task.id, item.task);
  }
  const selectedTasks = [...selectedTaskMap.values()];

  return (
    <div className="w-full">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">{monthLabel}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => move(-1)}
              aria-label="Previous month"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => move(1)}
              aria-label="Next month"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-1 text-[11px] font-semibold uppercase text-muted-foreground"
            >
              {w}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`b${i}`} />;
            const ds = iso(cursor.y, cursor.m, day);
            const dayTasks = byDate.get(ds) ?? [];
            const daySubtasks = subtasksByDate.get(ds) ?? [];
            const isSelected = ds === selected;
            const isToday = ds === todayStr;
            return (
              <button
                key={ds}
                onClick={() => setSelected(ds)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center rounded-lg text-sm transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                  !isSelected && isToday && "font-bold text-primary",
                )}
              >
                <span>{day}</span>
                <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                  {[...dayTasks, ...daySubtasks].slice(0, 3).map((t) => (
                    <span
                      key={"subtask" in t ? t.subtask.id : t.id}
                      className="size-1 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? "var(--primary-foreground)"
                          : ("subtask" in t ? t.task.domainId : t.domainId)
                            ? domainMap.get("subtask" in t ? t.task.domainId! : t.domainId!)?.color ?? "var(--muted-foreground)"
                            : "var(--muted-foreground)",
                      }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {new Date(selected + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h4>
        {selectedTasks.length ? (
          <div className="flex flex-col gap-2.5">
            {selectedTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                domain={t.domainId ? domainMap.get(t.domainId) : null}
                onOpen={onOpen}
                datedSubtasks={selectedSubtasks.filter(
                  (item) => item.task.id === t.id,
                )}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tasks on this day.
          </p>
        )}
      </div>
    </div>
  );
}
