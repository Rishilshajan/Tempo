/**
 * TEMPO-005 - Shared form composition, scrolling body and action footer.
 * Used by: CreateTaskSheet.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { submitTaskForm } from "./submit-task-form";
import { TaskFormBasics } from "./task-form-basics";
import { TaskFormRecurrence } from "./task-form-recurrence";
import { TaskFormSchedule } from "./task-form-schedule";
import { TaskFormSubtasks } from "./task-form-subtasks";
import { useTaskFormState } from "./use-task-form-state";

/**
 * TEMPO-005-F02 - TaskForm
 * Purpose: Composes one draft model and delegates submission.
 * Used by: CreateTaskSheet.
 * Trigger: The sheet opens; remains mounted until close.
 */
export function TaskForm(input: Parameters<typeof useTaskFormState>[0]) {
  const model = useTaskFormState(input);
  const { canSubmit, onOpenChange, saving, editingTask, title, error, setError, setErrors } = model;
  const snapshot = JSON.stringify([
    model.title, model.description, model.domainId, model.priority, model.scheduleType,
    model.startDate, model.endDate, model.startTime, model.endTime, model.dueDate,
    model.duration, model.customHours, model.customMinutes, model.repeat,
    model.repeatInterval, model.repeatUnit, model.repeatDays, model.repeatEnd,
    model.repeatEndDate, model.repeatCount, model.monthlyMissing, model.allowOverlap,
    model.editScope, model.steps, model.stepTitle,
  ]);
  const initialSnapshot = useRef(snapshot);
  const onDirtyChange = input.onDirtyChange;
  useEffect(() => {
    onDirtyChange?.(snapshot !== initialSnapshot.current);
  }, [snapshot, onDirtyChange]);
  return (
    <form
      onSubmit={(event) => submitTaskForm(event, model)}
      noValidate
      onChangeCapture={() => {
        setErrors({});
        setError(null);
      }}
      className="flex min-h-0 flex-1 flex-col"
      aria-busy={saving}
    >
      <fieldset
        disabled={saving}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
      >
        <TaskFormBasics model={model} />
        <TaskFormSchedule model={model} />
        <TaskFormSubtasks model={model} />
        <TaskFormRecurrence model={model} />
        {!canSubmit && (
          <p role="status" className="text-xs text-muted-foreground">
            Waiting for your secure workspace connection.
          </p>
        )}
        {error && (
          <p
            role="alert"
            data-validation-summary
            tabIndex={-1}
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </fieldset>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          className="min-h-10 px-3"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || !canSubmit || saving}
          className="min-h-10 gap-2 px-4"
        >
          {saving ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          {saving ? "Saving…" : editingTask ? "Save changes" : "Create Task"}
        </Button>
      </footer>
    </form>
  );
}
