"use client";
import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  CheckCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
  Circle,
  CircleCheck,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { subtaskDetailSchema } from "@/lib/validation/task-details";
import { localDateKey } from "@/lib/validation/task";
import type { TaskRecord, SetTaskCompleted } from "./task-list";
import { ConfirmDelete, DetailEmpty, detailError } from "./detail-shared";

type Step = TaskRecord["subtasks"][number];
export function DetailSubtasks({
  task,
  onSetCompleted,
}: {
  task: TaskRecord;
  onSetCompleted: SetTaskCompleted;
}) {
  const add = useMutation(api.taskDetails.addSubtask);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const complete = task.subtasks.filter(
    (step) => step.completedAt !== undefined,
  ).length;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = subtaskDetailSchema.safeParse({
      title,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      input.current?.focus();
      return;
    }
    request.current ??= crypto.randomUUID();
    setBusy(true);
    try {
      await add({
        taskId: task._id,
        ...parsed.data,
        requestId: request.current,
      });
      setTitle("");
      request.current = null;
      requestAnimationFrame(() => input.current?.focus());
    } catch (error) {
      detailError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Subtasks ({task.subtasks.length})
          </h3>
          {task.subtasks.length < 30 && (
            <button
              type="button"
              onClick={() => input.current?.focus()}
              className="ml-auto flex min-h-8 items-center gap-1 text-xs text-primary"
            >
              <Plus className="size-3.5" />
              Add step
            </button>
          )}
          <span className="sr-only">
            {complete} of {task.subtasks.length} completed
            {task.subtasks.length
              ? ` · ${Math.round((complete / task.subtasks.length) * 100)}%`
              : ""}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Subtask completion"
          aria-valuemin={0}
          aria-valuemax={task.subtasks.length || 1}
          aria-valuenow={complete}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{
              width: `${task.subtasks.length ? (complete / task.subtasks.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      {!task.subtasks.length && (
        <DetailEmpty icon={<CheckCheck />} title="Break it into smaller steps">
          Add a subtask to keep the next action clear.
        </DetailEmpty>
      )}
      <ol className="divide-y divide-border rounded-lg border border-border">
        {task.subtasks.map((step, index) => (
          <SubtaskRow
            key={`${step.id}:${step.updatedAt ?? step.title}:${step.completedAt ?? "open"}`}
            task={task}
            step={step}
            index={index}
            onSetCompleted={onSetCompleted}
          />
        ))}
      </ol>
      {task.subtasks.length < 30 ? (
        <form
          onSubmit={submit}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
          noValidate
        >
          <Input
            ref={input}
            aria-label="New subtask title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={240}
            placeholder="Add a subtask (press Enter)…"
            disabled={busy}
            className="min-h-10 min-w-0 flex-1"
          />
          <Button
            type="submit"
            variant="outline"
            size="icon"
            className="col-start-2 row-start-1 size-10 shrink-0"
            aria-label="Add subtask"
            disabled={busy}
          >
            <Plus className="size-4" />
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          This task has reached the 30-subtask limit.
        </p>
      )}
    </div>
  );
}
function SubtaskRow({
  task,
  step,
  index,
  onSetCompleted,
}: {
  task: TaskRecord;
  step: Step;
  index: number;
  onSetCompleted: SetTaskCompleted;
}) {
  const update = useMutation(api.taskDetails.updateSubtask);
  const move = useMutation(api.taskDetails.moveSubtask);
  const remove = useMutation(api.taskDetails.deleteSubtask);
  const [title, setTitle] = useState(step.title);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const done = step.completedAt !== undefined;
  const subtaskId = step.id as Id<"subtasks">;
  async function save(values: {
    title: string;
    dueDate?: string;
    scheduledDate?: string;
  }) {
    const parsed = subtaskDetailSchema.safeParse(values);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0].message);
    }
    await update({ taskId: task._id, subtaskId, ...parsed.data });
  }
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      detailError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="min-w-0 p-2">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-1 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          disabled={busy}
          aria-label={`${done ? "Reopen" : "Complete"} subtask ${step.title}`}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() =>
            void run(() => onSetCompleted(task._id, !done, step.id))
          }
        >
          {done ? (
            <CircleCheck className="size-4 text-primary" />
          ) : (
            <Circle className="size-4" />
          )}
        </button>
        <Textarea
          aria-label={`Subtask ${index + 1} title`}
          rows={1}
          value={title}
          disabled={busy}
          maxLength={240}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (title.trim() !== step.title)
              void run(() =>
                save({
                  title,
                  dueDate: step.dueDate,
                  scheduledDate: step.scheduledDate,
                }),
              );
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className={`col-start-2 row-start-1 !min-h-8 min-w-0 resize-none border-transparent bg-transparent px-1 py-1.5 text-xs leading-5 ${done ? "text-muted-foreground line-through" : ""}`}
        />
        <div className="col-start-2 row-start-2 w-fit max-w-full sm:col-start-3 sm:row-start-1">
          <DatePicker
            value={step.dueDate ?? ""}
            onChange={(value) =>
              void run(() =>
                save({
                  title,
                  dueDate: value || undefined,
                  scheduledDate: step.scheduledDate,
                }),
              )
            }
            minDate={localDateKey(new Date(), task.timezone)}
            ariaLabel={`Subtask ${index + 1} date (Optional)`}
            placeholder="Add date"
            disabled={busy}
            className="!w-auto max-w-36 border-transparent bg-muted/40 text-xs"
          />
        </div>
        <div className="col-start-3 row-start-1 sm:col-start-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-8"
                  aria-label={`Subtask ${index + 1} options`}
                  disabled={busy}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil />
                Edit subtask
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={index === 0}
                onClick={() =>
                  void run(() =>
                    move({ taskId: task._id, subtaskId, direction: "up" }),
                  )
                }
              >
                <ArrowUp />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={index === task.subtasks.length - 1}
                onClick={() =>
                  void run(() =>
                    move({ taskId: task._id, subtaskId, direction: "down" }),
                  )
                }
              >
                <ArrowDown />
                Move down
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleting(true)}
              >
                <Trash2 />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {editing && (
        <SubtaskEditor
          step={step}
          timezone={task.timezone}
          onClose={() => setEditing(false)}
          onSave={save}
        />
      )}
      {deleting && (
        <ConfirmDelete
          title="Delete subtask?"
          description={`“${step.title}” will be removed. The parent task will stay.`}
          onClose={() => setDeleting(false)}
          onDelete={() => remove({ taskId: task._id, subtaskId })}
        />
      )}
    </li>
  );
}
function SubtaskEditor({
  step,
  timezone,
  onClose,
  onSave,
}: {
  step: Step;
  timezone: string;
  onClose: () => void;
  onSave: (values: {
    title: string;
    dueDate?: string;
    scheduledDate?: string;
  }) => Promise<unknown>;
}) {
  const [title, setTitle] = useState(step.title);
  const [dueDate, setDueDate] = useState(step.dueDate ?? "");
  const [scheduledDate, setScheduledDate] = useState(step.scheduledDate ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit subtask</DialogTitle>
          <DialogDescription>
            Dates are optional and use the task’s timezone.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            try {
              await onSave({
                title,
                dueDate: dueDate || undefined,
                scheduledDate: scheduledDate || undefined,
              });
              onClose();
            } catch (error) {
              detailError(error);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="grid gap-2 text-xs">
            Title
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={240}
              disabled={busy}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs">Scheduled date</p>
              <DatePicker
                value={scheduledDate}
                onChange={setScheduledDate}
                ariaLabel="Subtask scheduled date"
                minDate={localDateKey(new Date(), timezone)}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs">Due date</p>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                ariaLabel="Subtask due date"
                minDate={localDateKey(new Date(), timezone)}
                disabled={busy}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save subtask"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
