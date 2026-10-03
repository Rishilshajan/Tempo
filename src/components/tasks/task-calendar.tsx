"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Task, Domain } from "@/db/schema";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function TaskCalendar({
  tasks,
  domainMap,
  onOpen,
}: {
  tasks: Task[];
  domainMap: Map<string, Domain>;
  onOpen: (task: Task) => void;
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
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return map;
  }, [tasks]);

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

  const selectedTasks = byDate.get(selected) ?? [];

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
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className="size-1 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? "var(--primary-foreground)"
                          : t.domainId
                            ? domainMap.get(t.domainId)?.color ?? "var(--muted-foreground)"
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
