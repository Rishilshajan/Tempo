/**
 * TEMPO-003 - TaskFormRecurrence: existing form fields sharing one state owner.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Repeat2 } from "lucide-react";
import { toast } from "sonner";
import { DateField } from "./task-form-date-field";
import { TaskSelect } from "./task-select";
import type { useTaskFormState } from "./use-task-form-state";
/**
 * TEMPO-003-F29 - TaskFormRecurrence
 * Purpose: Provides the existing TaskFormRecurrence behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function TaskFormRecurrence({
  model,
}: {
  model: ReturnType<typeof useTaskFormState>;
}) {
  const { editingTask, editScope, repeatDays, setRepeatDays, monthlyMissing, setMonthlyMissing, repeat, setRepeat, repeatInterval, setRepeatInterval, repeatUnit, setRepeatUnit, repeatEnd, setRepeatEnd, repeatEndDate, setRepeatEndDate, repeatCount, setRepeatCount, setError, setErrors, firstDate, minimumRepeatEnd, issuesForRepeat, notifyValidation, changeValue } = model;
  return (
    <>
      {editingTask?.recurrence && editScope === "this" ? (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Repeat pattern unchanged. Choose “This and future occurrences” above
          to change the series.
        </p>
      ) : (
        <>
          <div className="space-y-2 border-t border-border pt-4">
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Repeat2 className="size-4" aria-hidden="true" />
                Repeat
              </span>
              <TaskSelect
                label="Repeat"
                value={repeat}
                onChange={(value) => {
                  setErrors({});
                  setError(null);
                  setRepeat(value);
                  if (value === "weekly" && !repeatDays.length)
                    setRepeatDays([
                      new Date(firstDate + "T12:00:00Z").getUTCDay(),
                    ]);
                  const issue = issuesForRepeat(value)[0];
                  if (issue) notifyValidation(issue.message);
                  else toast.dismiss("task-validation");
                }}
                options={[
                  { value: "none", label: "Does not repeat" },
                  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
                  ...["Daily", "Weekly", "Monthly", "Custom"].map((label) => ({
                    value: label.toLowerCase(),
                    label,
                  })),
                ]}
              />
            </div>
          </div>
          {repeat !== "none" && (
            <div className="space-y-3">
              {(repeat === "weekly" ||
                (repeat === "custom" && repeatUnit === "week")) && (
                <div
                  className="flex flex-wrap gap-1"
                  role="group"
                  aria-label="Repeat weekdays"
                >
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (label, day) => (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={
                          repeatDays.includes(day) ? "default" : "outline"
                        }
                        aria-pressed={repeatDays.includes(day)}
                        onClick={() =>
                          setRepeatDays((days) =>
                            days.includes(day)
                              ? days.filter((d) => d !== day)
                              : [...days, day],
                          )
                        }
                      >
                        {label}
                      </Button>
                    ),
                  )}
                </div>
              )}
              {(repeat === "monthly" ||
                (repeat === "custom" && repeatUnit === "month")) && (
                <TaskSelect
                  label="When a month has no matching date"
                  value={monthlyMissing}
                  onChange={(value) =>
                    setMonthlyMissing(value as "last_day" | "skip")
                  }
                  options={[
                    {
                      value: "last_day",
                      label: "Use the last day of shorter months",
                    },
                    { value: "skip", label: "Skip months without this date" },
                  ]}
                />
              )}
              {repeat === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex min-w-0 flex-col gap-1.5 text-xs">
                    Every
                    <Input
                      aria-label="Repeat interval"
                      type="number"
                      min={1}
                      max={365}
                      step={1}
                      required
                      value={repeatInterval}
                      onChange={(event) =>
                        setRepeatInterval(event.target.value)
                      }
                      className="min-h-10 bg-muted/40"
                    />
                  </label>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="text-xs">Unit</p>
                    <TaskSelect
                      label="Repeat unit"
                      value={repeatUnit}
                      onChange={setRepeatUnit}
                      options={[
                        { value: "day", label: "Days" },
                        { value: "week", label: "Weeks" },
                        { value: "month", label: "Months" },
                      ]}
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                <span className="text-xs text-muted-foreground">Ends</span>
                <TaskSelect
                  label="Repeat ends"
                  value={repeatEnd}
                  onChange={changeValue(setRepeatEnd)}
                  options={[
                    { value: "never", label: "Never" },
                    { value: "date", label: "On a date" },
                    { value: "count", label: "After occurrences" },
                  ]}
                />
              </div>
              {repeatEnd === "date" && (
                <DateField
                  label="Repeat end date"
                  type="date"
                  value={repeatEndDate}
                  onChange={changeValue(setRepeatEndDate)}
                  minDate={minimumRepeatEnd}
                  required
                />
              )}
              {repeatEnd === "count" && (
                <label className="flex flex-col gap-1.5 text-xs">
                  Occurrences (including this task)
                  <Input
                    aria-label="Repeat occurrences"
                    type="number"
                    min={1}
                    max={1000}
                    step={1}
                    required
                    value={repeatCount}
                    onChange={(event) => setRepeatCount(event.target.value)}
                    className="min-h-10 bg-muted/40"
                  />
                </label>
              )}
              <p className="text-[11px] leading-5 text-muted-foreground">
                {repeat === "weekdays"
                  ? "Separate sessions Monday through Friday, prepared 30 days ahead."
                  : "Separate sessions are prepared 30 days ahead and extended automatically. Completing late does not change the schedule."}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
