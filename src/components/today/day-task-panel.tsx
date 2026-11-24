/**
 * TEMPO-003 - DayTaskPanel: existing view markup; no data subscriptions.
 * Code map: src/components/code-map.md.
 */
"use client";
import { TaskSelect } from "@/components/tasks/task-select";
import { taskTones } from "@/components/tasks/task-status";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { DayTaskRow } from "./day-task-row";
import type { useDayViewModel } from "./use-day-view-model";
/**
 * TEMPO-003-F21 - DayTaskPanel
 * Purpose: Displays filtered daily work, review backlog and completed sections.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function DayTaskPanel({
  model,
}: {
  model: ReturnType<typeof useDayViewModel>;
}) {
  const { day, now, focusSaving, onFocus, loadingMore, props, setDomainFilter, summary, group, setGroup, prioritiesHeading, pending, today, options, effectiveDomainFilter, listedTasks, hasTaskFilters, noMatches, filtered, activeFocus, complete } = model;
  return (
    <section
      id="day-priorities"
      aria-labelledby="priorities-heading"
      className="dashboard-task-panel min-w-0 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          ref={prioritiesHeading}
          tabIndex={-1}
          id="priorities-heading"
          className="scroll-mt-6 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary"
        >
          {today ? "Today’s" : "Day"}{" "}
          {group === "fixed"
            ? "fixed tasks"
            : group === "in_progress"
              ? "tasks in progress"
              : "tasks"}{" "}
          <span className="font-normal text-muted-foreground">
            ({filtered.length}
            {filtered.length !== listedTasks.length
              ? ` of ${listedTasks.length}`
              : ""}
            )
          </span>
        </h2>
        <Button size="sm" className="min-h-9 lg:hidden" disabled={day.date < day.today} onClick={() => props.onCreateTask({ date: day.date })}>Create task</Button>
        {hasTaskFilters && (
          <div className="w-full min-w-0 sm:w-44">
            <TaskSelect
              label="Filter priorities by domain"
              value={effectiveDomainFilter}
              onChange={setDomainFilter}
              options={options}
            />
          </div>
        )}
      </div>
      {hasTaskFilters && (
        <div
          className="my-3 flex max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible"
          aria-label="Priority task filters"
        >
          {[
            { id: "all", label: "All", tone: "neutral" },
            {
              id: "in_progress",
              label: `In progress (${summary.active.filter((task) => task.progress === "in_progress").length})`,
              tone: "progress",
            },
            {
              id: "fixed",
              label: `Fixed (${summary.fixed.length})`,
              tone: "fixed",
            },
            { id: "flexible", label: "Flexible", tone: "flexible" },
            {
              id: "carried",
              label: `Needs review (${summary.carried.length})`,
              tone: "carried",
            },
          ].map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={`min-h-9 rounded-full px-3 text-xs ${group === item.id ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : taskTones[item.tone as keyof typeof taskTones]}`}
              aria-pressed={group === item.id}
              onClick={() => setGroup(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
      <div
        className="dashboard-task-scroll"
        role="region"
        aria-label="Daily tasks, review and completed work"
        tabIndex={0}
      >
        {!filtered.length ? (
          <div className="dashboard-task-empty flex min-h-48 flex-col items-center justify-center px-3 py-7 text-center">
            <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
              <CheckCheck className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium">
              {noMatches
                ? "No matching tasks"
                : summary.completed.length
                  ? "All clear for this day"
                  : loadingMore
                    ? "Loading this day’s tasks…"
                    : "No tasks planned for this day"}
            </p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
              {noMatches
                ? "Try another domain or task filter."
                : summary.completed.length
                  ? "You’ve completed your priorities. Add a task when you’re ready."
                  : "Add your first task to start shaping your day."}
            </p>
            {!noMatches && (
              <Button
                variant="secondary"
                className="mt-4 hidden min-h-10 gap-2 text-xs lg:inline-flex"
                onClick={() => props.onCreateTask({ date: day.date })}
              >

                Create Task
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((task) => (
              <DayTaskRow
                key={task._id}
                task={task}
                day={day}
                now={now}
                pending={pending.has(task._id)}
                onFocus={() =>
                  onFocus(task._id === activeFocus?._id ? "none" : task._id)
                }
                focused={task._id === activeFocus?._id}
                focusSaving={focusSaving || day.date < day.today}
                onComplete={() => complete(task)}
                onOpen={() => props.onOpenTask(task)}
                onSetCompleted={props.onSetCompleted}
                onSetProgress={props.onSetProgress}
                onReschedule={
                  props.onRescheduleTask
                    ? (schedule) => props.onRescheduleTask!(task, schedule)
                    : undefined
                }
              />
            ))}
          </ul>
        )}
        {!!summary.completed.length && group === "all" && (
          <details className="mt-5 border-t border-border pt-3">
            <summary className="min-h-9 cursor-pointer py-2 text-xs font-medium text-muted-foreground">
              Completed on this day ({summary.completed.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {summary.completed.map((task) => (
                <DayTaskRow
                  key={task._id}
                  task={task}
                  day={day}
                  now={now}
                  pending={pending.has(task._id)}
                  onComplete={() => complete(task)}
                  onOpen={() => props.onOpenTask(task)}
                  onSetCompleted={props.onSetCompleted}
                  onSetProgress={props.onSetProgress}
                />
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
