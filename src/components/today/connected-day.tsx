/**
 * TEMPO-003 - ConnectedDay: composes reused presentation and a single state hook.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { DayCommandCenter } from "./day-command-center";
import { DayNavigation } from "./day-navigation";
import { useDayData } from "./use-day-data";
/**
 * TEMPO-003-F06 - ConnectedDay
 * Purpose: Composes the live day using useDayData, with a loading fallback.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function ConnectedDay(input: Parameters<typeof useDayData>[0]) {
  const model = useDayData(input);
  const { props, user, clock, setSelected, today, date, backlog, scheduledSteps, dueSteps, steps, dated, fixed, completed, focus, planTask, rescheduleTask, focusSaving, ready, day, chooseFocus } = model;
  return (
    <div className="min-w-0">
      {!ready || !day || !clock ? (
        <>
          <div className="mb-5 flex justify-end">
            <DayNavigation
              date={date}
              today={today}
              onDateChange={(value) =>
                setSelected(value === today ? null : value)
              }
              onCreateTask={props.onCreateTask}
            />
          </div>
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-border bg-card px-5 py-14 text-center text-sm text-muted-foreground"
          >
            Loading the complete day…
          </div>
        </>
      ) : (
        <DayCommandCenter
          navigation={
            <DayNavigation
              date={date}
              today={today}
              onDateChange={setSelected}
              onCreateTask={props.onCreateTask}
            />
          }
          key={date}
          subtasks={
            (steps.length > 0 ||
              scheduledSteps.status === "CanLoadMore" ||
              dueSteps.status === "CanLoadMore" ||
              scheduledSteps.status === "LoadingMore" ||
              dueSteps.status === "LoadingMore") && (
              <section
                aria-labelledby="day-subtasks-heading"
                className="rounded-xl border border-border bg-card p-4"
              >
                <h2 id="day-subtasks-heading" className="font-medium">
                  Subtasks for this day · all domains
                </h2>
                <ul className="mt-2 divide-y divide-border">
                  {steps.map((step) => (
                    <li key={step.id}>
                      <Button
                        variant="ghost"
                        className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-2 text-left"
                        onClick={() => props.onOpenTask(step.parent)}
                      >
                        <span className="break-words">{step.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {step.parent.title}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
                {(scheduledSteps.status === "CanLoadMore" ||
                  dueSteps.status === "CanLoadMore") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (scheduledSteps.status === "CanLoadMore")
                        scheduledSteps.loadMore(50);
                      if (dueSteps.status === "CanLoadMore")
                        dueSteps.loadMore(50);
                    }}
                  >
                    Load more subtasks
                  </Button>
                )}
              </section>
            )
          }
          {...props}
          tasks={[
            ...backlog.results,
            ...dated.results,
            ...fixed.results,
            ...completed.results,
          ]}
          day={day}
          now={clock.now}
          name={user?.firstName ?? undefined}
          focus={focus ?? null}
          loadingMore={
            (date === today && backlog.status !== "Exhausted") ||
            [dated, fixed, completed].some(
              (feed) => feed.status !== "Exhausted",
            )
          }
          focusSaving={focusSaving}
          onRescheduleTask={(task, schedule) =>
            rescheduleTask({ id: task._id, schedule })
          }
          onPlanTask={(task) =>
            planTask({
              id: task._id,
              from: "carried",
              to: "planned",
              continueToday: true,
            })
          }
          onFocus={chooseFocus}
        />
      )}
    </div>
  );
}
