/**
 * TEMPO-003 - DayHeading: existing view markup; no data subscriptions.
 * Code map: src/components/code-map.md.
 */
"use client";
import { formatMinutes } from "@/lib/today-model";
import type { useDayViewModel } from "./use-day-view-model";
/**
 * TEMPO-003-F19 - DayHeading
 * Purpose: Displays the selected date, personalized greeting and summary pills.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function DayHeading({
  model,
}: {
  model: ReturnType<typeof useDayViewModel>;
}) {
  const { navigation, summary, dateLabel, total, greeting } = model;
  return (
    <section
      aria-labelledby="day-heading"
      className="dashboard-day-heading border-b border-border"
    >
      <div className="dashboard-greeting-row flex min-w-0 flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="dashboard-greeting min-w-0">
          <h1
            id="day-heading"
            className="break-words text-xl font-semibold tracking-tight sm:text-2xl"
          >
            {greeting}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="dashboard-stat-pills" aria-label="Day summary">
          <span className="dashboard-stat-pill dashboard-stat-scheduled">
            <strong>{summary.fixed.length}</strong> scheduled
          </span>
          <span className="dashboard-stat-pill dashboard-stat-remaining">
            <strong>{summary.active.length}</strong> remaining
          </span>
          <span className="dashboard-stat-pill dashboard-stat-completed">
            <strong>{summary.completed.length}</strong> completed
          </span>
          <span className="dashboard-stat-pill dashboard-stat-planned">
            <strong>{formatMinutes(total)}</strong> planned
          </span>
        </div>
        {navigation && (
          <div className="dashboard-date-controls w-full min-w-0 lg:w-auto">
            {navigation}
          </div>
        )}
      </div>
    </section>
  );
}
