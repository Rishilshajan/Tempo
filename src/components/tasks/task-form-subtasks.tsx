/**
 * TEMPO-003 - TaskFormSubtasks: existing form fields sharing one state owner.
 * Code map: src/components/code-map.md.
 */
"use client";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, ArrowUp, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type { useTaskFormState } from "./use-task-form-state";
/**
 * TEMPO-003-F28 - TaskFormSubtasks
 * Purpose: Provides the existing TaskFormSubtasks behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function TaskFormSubtasks({
  model,
}: {
  model: ReturnType<typeof useTaskFormState>;
}) {
  const { steps, stepTitle, setStepTitle, errors, today, addStep, updateSteps, moveStep } = model;
  return (
    <>
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium">Subtasks ({steps.length})</h3>
          <span className="text-[11px] text-muted-foreground">
            Optional · up to 30
          </span>
        </div>
        {steps.length > 0 && (
          <ol
            aria-label="Subtasks"
            className="max-h-72 divide-y divide-border overflow-y-auto overscroll-contain rounded-lg border border-border"
          >
            {steps.map((step, index) => (
              <li
                key={step.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 p-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              >
                <Textarea
                  aria-label={`Subtask ${index + 1} title`}
                  rows={1}
                  required
                  maxLength={200}
                  value={step.title}
                  onChange={(event) =>
                    updateSteps((previous) =>
                      previous.map((item) =>
                        item.key === step.key
                          ? { ...item, title: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className="col-start-1 row-start-1 !min-h-8 min-w-0 resize-none border-transparent bg-transparent px-2 py-1.5 text-sm leading-5"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      document.getElementById("new-subtask-title")?.focus();
                    }
                  }}
                />
                <div className="col-start-1 row-start-2 w-fit max-w-full sm:col-start-2 sm:row-start-1">
                  <DatePicker
                    minDate={today}
                    ariaLabel={`Subtask ${index + 1} date (Optional)`}
                    placeholder="Add date"
                    className="!w-auto max-w-36 justify-start border-transparent bg-muted/40 text-xs"
                    value={step.dueDate}
                    onChange={(value) =>
                      updateSteps((previous) =>
                        previous.map((item) =>
                          item.key === step.key
                            ? { ...item, dueDate: value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="col-start-2 row-start-1 sm:col-start-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Subtask ${index + 1} options`}
                        />
                      }
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={index === 0}
                        onClick={() => moveStep(index, -1)}
                      >
                        <ArrowUp aria-hidden="true" />
                        Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={index === steps.length - 1}
                        onClick={() => moveStep(index, 1)}
                      >
                        <ArrowDown aria-hidden="true" />
                        Move down
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          updateSteps((previous) =>
                            previous.filter((item) => item.key !== step.key),
                          )
                        }
                      >
                        <Trash2 aria-hidden="true" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="flex items-center gap-2">
          <Input
            id="new-subtask-title"
            aria-label="New subtask title"
            maxLength={200}
            value={stepTitle}
            disabled={steps.length >= 30}
            onChange={(event) => setStepTitle(event.target.value)}
            placeholder="Add a step (press Enter)…"
            className="min-h-9 min-w-0"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addStep();
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            aria-label="Add Step"
            disabled={!stepTitle.trim() || steps.length >= 30}
            onClick={addStep}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
        {errors.subtasks && (
          <p role="alert" className="text-xs text-destructive">
            {errors.subtasks}
          </p>
        )}
      </div>
    </>
  );
}
