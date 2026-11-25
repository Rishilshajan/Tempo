/**
 * TEMPO-005 - Shared task-form validation focus helpers.
 * Used by: submitTaskForm; local field groups.
 * Code map: src/components/code-map.md.
 */
"use client";

export type TaskFormIssue = { path: readonly PropertyKey[]; message: string };

/**
 * TEMPO-005-F24 - taskIssueSelector
 * Purpose: Resolves a schema issue to an existing form control without changing validation.
 * Used by: focusTaskIssue.
 * Trigger: Submission reports its first invalid field.
 */
export function taskIssueSelector(issue: TaskFormIssue): string {
  switch (String(issue.path[0])) {
    case "title": return "#task-title";
    case "description": return "#task-description";
    case "domainId": return '[aria-label="Domain"]';
    case "priority": return '[aria-label="Priority"]';
    case "estimatedMinutes": return issue.path[1] === "minutes"
      ? '[aria-label="Estimated minutes"]' : '[aria-label="Estimated hours"]';
    case "schedule":
      if (/end time|end.*later/i.test(issue.message)) return '[aria-label="End time"]';
      if (/start.*time|time slot|start now/i.test(issue.message)) return '[aria-label="Start time"]';
      return '[aria-label="Start date"], [data-validation-field="due-date"] button, [aria-label="Due date (Optional)"]';
    case "recurrence":
      if (/end date/i.test(issue.message)) return '[aria-label="Repeat end date"]';
      if (/weekday|repeat days/i.test(issue.message)) return '[aria-label="Repeat weekdays"] button';
      if (/count|occurrence/i.test(issue.message)) return '[aria-label="Repeat occurrences"]';
      if (/interval/i.test(issue.message)) return '[aria-label="Repeat interval"]';
      return '[aria-label="Repeat"]';
    case "subtasks": {
      const number = typeof issue.path[1] === "number" ? issue.path[1] + 1 : null;
      return number
        ? `[aria-label="Subtask ${number} ${issue.path[2] === "dueDate" ? "date (Optional)" : "title"}"]`
        : '#new-subtask-title';
    }
    default: return '[data-validation-summary]';
  }
}

/**
 * TEMPO-005-F25 - focusTaskIssue
 * Purpose: Reveals and focuses the first invalid field after React paints error messages.
 * Used by: submitTaskForm.
 * Trigger: Client validation or a save attempt fails.
 */
export function focusTaskIssue(form: HTMLFormElement, issue: TaskFormIssue) {
  requestAnimationFrame(() => {
    if (!form.isConnected) return;
    const control = form.querySelector<HTMLElement>(taskIssueSelector(issue))
      ?? form.querySelector<HTMLElement>('[aria-invalid="true"] button, [aria-invalid="true"], [data-validation-summary]');
    if (!control) return;
    control.scrollIntoView({ block: "center", behavior: "auto" });
    control.focus({ preventScroll: true });
  });
}
