"use client";

import { useEffect, useState, useTransition } from "react";
import { ExternalLink, FileOutput, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import type { TaskOutput } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addTaskOutput,
  deleteTaskOutput,
  getTaskOutputs,
  updateTaskOutput,
} from "@/server/actions";
import { TASK_OUTPUT_TYPES } from "@/server/validation";
import type { TaskOutputInput } from "@/server/validation";
import { log } from "@/lib/logger";

const OUTPUT_TYPE_LABELS: Record<(typeof TASK_OUTPUT_TYPES)[number], string> = {
  document: "Document",
  report: "Report",
  code: "Code",
  link: "Link",
  other: "Other",
};

type OutputDraft = {
  title: string;
  description: string;
  outputType: (typeof TASK_OUTPUT_TYPES)[number];
  referenceUrl: string;
};

const EMPTY_DRAFT: OutputDraft = {
  title: "",
  description: "",
  outputType: "other",
  referenceUrl: "",
};

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function toInput(draft: OutputDraft): TaskOutputInput {
  return {
    ...draft,
    description: draft.description.trim() || null,
    referenceUrl: draft.referenceUrl.trim() || null,
  };
}

function formatOutputDate(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function TaskOutputs({ taskId }: { taskId: string }) {
  const [outputs, setOutputs] = useState<TaskOutput[]>([]);
  const [draft, setDraft] = useState<OutputDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getTaskOutputs(taskId)
      .then((rows) => {
        if (!cancelled) setOutputs(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          log.error("Could not load task outputs", error);
          toast.error("Could not load task outputs");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const reset = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
  };

  const save = () => {
    const input = toInput(draft);
    if (!input.title.trim()) return;
    startTransition(async () => {
      const result = editingId
        ? await updateTaskOutput(editingId, input)
        : await addTaskOutput(taskId, input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOutputs((current) =>
        editingId
          ? current.map((output) =>
              output.id === result.data.id ? result.data : output,
            )
          : [result.data, ...current],
      );
      toast.success(editingId ? "Output updated" : "Output added");
      reset();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await deleteTaskOutput(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOutputs((current) => current.filter((output) => output.id !== id));
    });
  };

  const beginEdit = (output: TaskOutput) => {
    setEditingId(output.id);
    setDraft({
      title: output.title,
      description: output.description ?? "",
      outputType: TASK_OUTPUT_TYPES.includes(
        output.outputType as (typeof TASK_OUTPUT_TYPES)[number],
      )
        ? (output.outputType as OutputDraft["outputType"])
        : "other",
      referenceUrl: output.referenceUrl ?? "",
    });
  };

  return (
    <section className="space-y-4" aria-label="Task outputs">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <FileOutput className="size-4 text-primary" /> Outputs
        <span className="text-xs font-normal text-muted-foreground">
          ({outputs.length})
        </span>
      </h3>

      <div className="space-y-2 rounded-xl border border-border p-3">
        <Label htmlFor="output-title">Title</Label>
        <Input
          id="output-title"
          value={draft.title}
          maxLength={200}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
          placeholder="Deliverable name"
        />
        <div className="space-y-1">
          <Label htmlFor="output-type">Type</Label>
          <select
            id="output-type"
            value={draft.outputType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                outputType: event.target.value as OutputDraft["outputType"],
              }))
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {TASK_OUTPUT_TYPES.map((type) => (
              <option key={type} value={type}>
                {OUTPUT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <Label htmlFor="output-description">Summary (optional)</Label>
        <Textarea
          id="output-description"
          rows={2}
          value={draft.description}
          maxLength={2000}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="What does this deliverable contain?"
        />
        <Label htmlFor="output-url">Reference URL (optional)</Label>
        <Input
          id="output-url"
          type="url"
          value={draft.referenceUrl}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              referenceUrl: event.target.value,
            }))
          }
          placeholder="https://…"
        />
        <div className="flex justify-end gap-2">
          {editingId && (
            <Button size="sm" variant="ghost" onClick={reset} disabled={pending}>
              <X className="size-3.5" /> Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={save}
            disabled={pending || !draft.title.trim()}
          >
            {editingId ? "Save output" : <><Plus className="size-3.5" /> Add output</>}
          </Button>
        </div>
      </div>

      {outputs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
          No outputs yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {outputs.map((output) => (
            <li
              key={output.id}
              className="rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="break-words text-sm font-semibold">
                      {output.title}
                    </h4>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {OUTPUT_TYPE_LABELS[
                        TASK_OUTPUT_TYPES.includes(
                          output.outputType as (typeof TASK_OUTPUT_TYPES)[number],
                        )
                          ? (output.outputType as (typeof TASK_OUTPUT_TYPES)[number])
                          : "other"
                      ]}
                    </span>
                  </div>
                  {output.description && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {output.description}
                    </p>
                  )}
                  {output.referenceUrl && isSafeExternalUrl(output.referenceUrl) && (
                    <a
                      href={output.referenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 break-all text-sm font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="size-3.5 shrink-0" />
                      {output.referenceUrl}
                    </a>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Created {formatOutputDate(output.createdAt)}
                  </p>
                  {new Date(output.updatedAt).getTime() >
                    new Date(output.createdAt).getTime() && (
                    <p className="text-[11px] text-muted-foreground">
                      Updated {formatOutputDate(output.updatedAt)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => beginEdit(output)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${output.title}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(output.id)}
                    disabled={pending}
                    className="rounded p-1 text-muted-foreground hover:bg-urgent/10 hover:text-urgent"
                    aria-label={`Delete ${output.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
