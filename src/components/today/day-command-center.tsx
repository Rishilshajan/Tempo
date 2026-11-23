/**
 * TEMPO-003 - DayCommandCenter: composes reused presentation and a single state hook.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { DayFocus } from "./day-focus";
import { DayHeading } from "./day-heading";
import { DayTaskPanel } from "./day-task-panel";
import { DayTimeline } from "./day-timeline";
import { useDayViewModel } from "./use-day-view-model";
/**
 * TEMPO-003-F09 - DayCommandCenter
 * Purpose: Composes existing daily sections with one view-model hook.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function DayCommandCenter(input: Parameters<typeof useDayViewModel>[0]) {
  const model = useDayViewModel(input);
  const { tasks, day, now, focus, subtasks, loadingMore, props, scopedTasks, mobileTab, setMobileTab } = model;
  return (
    <div
      className="dashboard-command min-w-0 space-y-4"
      data-mobile-tab={mobileTab}
    >
      {loadingMore && (
        <p
          role="status"
          className="dashboard-feed-progress text-xs text-muted-foreground"
        >
          Loading more tasks… Counts are partial.
        </p>
      )}
      <DayHeading model={model} />
      <div className="dashboard-columns">
        <div className="dashboard-work-column">
          <DayFocus model={model} />
          <div
            className="dashboard-mobile-tabs"
            role="tablist"
            aria-label="Daily view"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                const next = mobileTab === "tasks" ? "schedule" : "tasks";
                setMobileTab(next);
                event.currentTarget
                  .querySelector<HTMLButtonElement>(
                    next === "tasks"
                      ? "button:first-child"
                      : "button:last-child",
                  )
                  ?.focus();
              }
            }}
          >
            <Button
              role="tab"
              aria-selected={mobileTab === "tasks"}
              aria-controls="day-priorities"
              tabIndex={mobileTab === "tasks" ? 0 : -1}
              variant={mobileTab === "tasks" ? "default" : "ghost"}
              onClick={() => setMobileTab("tasks")}
            >
              Today’s tasks
            </Button>
            <Button
              role="tab"
              aria-selected={mobileTab === "schedule"}
              aria-controls="day-schedule-panel"
              tabIndex={mobileTab === "schedule" ? 0 : -1}
              variant={mobileTab === "schedule" ? "default" : "ghost"}
              onClick={() => setMobileTab("schedule")}
            >
              Schedule
            </Button>
          </div>
          <DayTaskPanel model={model} />{" "}
          {subtasks && <div className="dashboard-subtasks">{subtasks}</div>}
        </div>
        <div id="day-schedule-panel" className="dashboard-schedule min-w-0">
          <DayTimeline
            tasks={scopedTasks}
            day={day}
            now={now}
            onOpenTask={props.onOpenTask}
            onAdd={(startAt) => props.onCreateTask({ date: day.date, startAt })}
          />
        </div>
      </div>
    </div>
  );
}
