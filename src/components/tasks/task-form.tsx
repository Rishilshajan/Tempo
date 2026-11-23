/**
 * TEMPO-003 - TaskForm: composes reused presentation and a single state hook.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { Check, LoaderCircle } from "lucide-react";
import { submitTaskForm } from "./submit-task-form";
import { TaskFormBasics } from "./task-form-basics";
import { TaskFormRecurrence } from "./task-form-recurrence";
import { TaskFormSchedule } from "./task-form-schedule";
import { TaskFormSubtasks } from "./task-form-subtasks";
import { useTaskFormState } from "./use-task-form-state";
/**
 * TEMPO-003-F23 - TaskForm
 * Purpose: Composes the shared create/edit form sections with one draft-state hook.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function TaskForm(input: Parameters<typeof useTaskFormState>[0]) {
  const model = useTaskFormState(input);
  const { canSubmit, onOpenChange, saving, editingTask, title, error, setError, errors, setErrors, dateIssues } = model;
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
        {dateIssues.length > 0 && (
          <ul aria-live="polite" className="space-y-1 text-xs text-destructive">
            {dateIssues.map((issue, index) => (
              <li key={index}>{issue.message}</li>
            ))}
          </ul>
        )}
        {errors.recurrence && (
          <p role="alert" className="text-xs text-destructive">
            {errors.recurrence}
          </p>
        )}
        {!canSubmit && (
          <p role="status" className="text-xs text-muted-foreground">
            Waiting for your secure workspace connection.
          </p>
        )}
        {error && (
          <p
            role="alert"
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
