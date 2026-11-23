/**
 * TEMPO-003 - DayFocus: existing view markup; no data subscriptions.
 * Code map: src/components/code-map.md.
 */
"use client";
import { TaskSelect } from "@/components/tasks/task-select";
import { Button } from "@/components/ui/button";
import { formatMinutes } from "@/lib/today-model";
import { ChevronDown, Target, X } from "lucide-react";
import type { useDayViewModel } from "./use-day-view-model";
/**
 * TEMPO-003-F20 - DayFocus
 * Purpose: Displays the shared collapsible focus selection and its actions.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function DayFocus({
  model,
}: {
  model: ReturnType<typeof useDayViewModel>;
}) {
  const { tasks, day, name, focus, focusSaving, onFocus, props, summary, focusExpanded, setFocusExpanded, today, options, activeFocus } = model;
  return (
    <details
      aria-labelledby="focus-heading"
      className="dashboard-focus rounded-xl border border-border bg-card p-4 sm:p-5"
      aria-busy={focusSaving}
      open={focusExpanded}
      onToggle={(event) => setFocusExpanded(event.currentTarget.open)}
    >
      <summary className="dashboard-focus-toggle flex cursor-pointer list-none items-center justify-between gap-2">
        <h2
          id="focus-heading"
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary"
        >
          <Target className="size-4" aria-hidden="true" />
          Main focus
        </h2>
        <ChevronDown
          className={
            "size-4 shrink-0 text-primary " +
            (focusExpanded ? "rotate-180" : "")
          }
          aria-hidden="true"
        />
        {!focusExpanded && (
          <span className="col-span-2 block truncate text-sm font-medium">
            {activeFocus?.title ?? "Choose your main focus"}
          </span>
        )}
      </summary>
      <p
        className={
          "mt-2 break-words text-base font-semibold " +
          (activeFocus?.status === "completed" ? "text-muted-foreground" : "")
        }
      >
        {activeFocus ? activeFocus.title : "What matters most today?"}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {activeFocus
          ? [
              activeFocus.domain?.name ?? "Uncategorized",
              activeFocus.estimatedMinutes
                ? formatMinutes(activeFocus.estimatedMinutes)
                : activeFocus.schedule.type === "fixed"
                  ? formatMinutes(
                      (activeFocus.schedule.endAt -
                        activeFocus.schedule.startAt) /
                        60000,
                    )
                  : null,
              activeFocus.status === "completed" ? "Completed" : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : "Choose one task to give your attention to."}
      </p>
      <div className="dashboard-focus-actions mt-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <TaskSelect
            label={activeFocus ? "Change main focus" : "Choose main focus"}
            value={activeFocus?._id ?? "none"}
            onChange={(id) => {
              if (id !== activeFocus?._id) onFocus(id);
            }}
            disabled={
              day.date < day.today ||
              focusSaving ||
              (!summary.active.length && !activeFocus)
            }
            options={[
              {
                value: "none",
                label: summary.active.length
                  ? "Choose a task"
                  : "No open tasks for this day",
              },
              ...(activeFocus?.status === "completed"
                ? [
                    {
                      value: activeFocus._id,
                      label: "Completed - choose another focus",
                    },
                  ]
                : []),
              ...summary.active.map((task) => ({
                value: task._id,
                label: <span className="truncate">{task.title}</span>,
              })),
            ]}
          />
        </div>
        {activeFocus && (
          <>
            <Button
              className="min-h-10"
              onClick={() => props.onOpenTask(activeFocus)}
            >
              Open task
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              aria-label="Clear main focus"
              disabled={focusSaving || day.date < day.today}
              onClick={() => onFocus("none")}
            >
              <X aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
      {focusSaving && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          Saving focus…
        </p>
      )}
    </details>
  );
}
