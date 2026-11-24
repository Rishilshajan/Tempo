/**
 * TEMPO-003 - TaskFormBasics: existing form fields sharing one state owner.
 * Code map: src/components/code-map.md.
 */
"use client";
import { DomainLabel } from "@/components/domains/domain-appearance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { shiftDate } from "@/lib/validation/recurrence";
import { localDateKey } from "@/lib/validation/task";
import { Flag, Layers } from "lucide-react";
import { priorities, PriorityLabel, TaskSelect } from "./task-select";
import type { useTaskFormState } from "./use-task-form-state";
/**
 * TEMPO-003-F26 - TaskFormBasics
 * Purpose: Provides the existing TaskFormBasics behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function TaskFormBasics({
  model,
}: {
  model: ReturnType<typeof useTaskFormState>;
}) {
  const { domains, hasMoreDomains, loadingMoreDomains, onLoadMoreDomains, editingTask, editScope, setEditScope, setAllowOverlap, title, setTitle, description, setDescription, domainId, setDomainId, priority, setPriority, timezone, startDate, setEndDate, startTime, endTime, setRepeatEnd, setRepeatEndDate, errors, setErrors } = model;
  return (
    <>
      {editingTask?.recurrence && (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <p className="text-xs font-medium">Apply changes to</p>
          <TaskSelect
            label="Edit recurring task"
            value={editScope}
            onChange={(value) => setEditScope(value as "this" | "future")}
            options={[
              { value: "this", label: "This occurrence only" },
              { value: "future", label: "This and future occurrences" },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            Completed sessions stay unchanged. Future open sessions are replaced
            only when you choose the second option.
          </p>
        </div>
      )}
      {editingTask?.recurrence &&
        editingTask.schedule.type === "fixed" &&
        editingTask.schedule.endAt - editingTask.schedule.startAt >
          86400000 && (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
            <p className="font-medium">
              Possible series end entered as a session end
            </p>
            <p>
              Correction preview: {startTime}–{endTime} each matching day until{" "}
              {localDateKey(new Date(editingTask.schedule.endAt), timezone)}.
              The original stays unchanged until you save.
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEndDate(
                  endTime > startTime ? startDate : shiftDate(startDate, 1),
                );
                setRepeatEnd("date");
                setRepeatEndDate(
                  localDateKey(
                    new Date(
                      editingTask.schedule.type === "fixed"
                        ? editingTask.schedule.endAt
                        : 0,
                    ),
                    timezone,
                  ),
                );
                setAllowOverlap(false);
                setEditScope("future");
              }}
            >
              Use this correction
            </Button>
          </div>
        )}
      <div className="space-y-1.5">
        <label htmlFor="task-title" className="text-xs font-medium">
          Task title <span className="text-primary">*</span>
        </label>
        <Input
          id="task-title"
          required
          maxLength={200}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setErrors((previous) => ({ ...previous, title: "" }));
          }}
          placeholder="e.g., Prepare the project proposal"
          className="min-h-10 bg-muted/40"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "task-title-error" : undefined}
        />
        {errors.title && (
          <p id="task-title-error" className="text-xs text-destructive">
            {errors.title}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="task-description" className="text-xs font-medium">
          Description{" "}
          <span className="font-normal text-muted-foreground">(Optional)</span>
        </label>
        <Textarea
          id="task-description"
          maxLength={5000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add context and details..."
          className="min-h-20 max-h-48 resize-y bg-muted/40"
        />
      </div>
      <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
        <label
          id="task-domain-label"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Layers className="size-4" aria-hidden="true" />
          Domain
        </label>
        <TaskSelect
          label="Domain"
          value={domainId}
          onChange={setDomainId}
          disabled={!domains}
          options={[
            { value: "uncategorized", label: "Uncategorized" },
            ...(domains ?? []).map((domain) => ({
              value: domain._id,
              label: <DomainLabel {...domain} />,
            })),
          ]}
        />
      </div>
      {hasMoreDomains && (
        <Button
          variant="ghost"
          type="button"
          className="min-h-8 text-xs"
          disabled={loadingMoreDomains}
          onClick={onLoadMoreDomains}
        >
          {loadingMoreDomains ? "Loading…" : "Load more domains"}
        </Button>
      )}
      {domains?.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No domains yet. You can create one separately from the Domains menu.
        </p>
      )}
      <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flag className="size-4" aria-hidden="true" />
          Priority
        </span>
        <TaskSelect
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={priorities.map((option) => ({
            value: option.value,
            label: <PriorityLabel value={option.value} />,
          }))}
        />
      </div>
    </>
  );
}
