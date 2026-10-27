"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { StickyNote, Pencil, Trash2, Link2, Check, X } from "lucide-react";
import { toast } from "sonner";

import type { Task, TaskNote } from "@/db/schema";
import { log } from "@/lib/logger";
import {
  getTaskNotes,
  addTaskNote,
  updateTaskNote,
  deleteTaskNote,
} from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* ----------------------------- linkify ----------------------------- */

const SPLIT_RE = /(https?:\/\/[^\s]+)/g;
const IS_URL = /^https?:\/\//;

function hostLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname !== "/" ? u.pathname : "";
    return (u.hostname + path).replace(/^www\./, "");
  } catch {
    return url;
  }
}

function linkify(body: string): ReactNode[] {
  return body.split(SPLIT_RE).map((part, i) =>
    IS_URL.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex max-w-full items-center gap-0.5 break-all align-baseline font-medium text-primary hover:underline"
      >
        <Link2 className="inline size-3 shrink-0" />
        {hostLabel(part)}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function fmt(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---------------------------- component ---------------------------- */

type ActivityTask = Task;

type ActivityEntry =
  | { type: "note"; key: string; at: Date | string; note: TaskNote }
  | { type: "created"; key: string; at: Date | string; task: ActivityTask }
  | { type: "completed"; key: string; at: Date | string; task: ActivityTask }
  | { type: "thread"; key: string; at: Date | string; task: ActivityTask };

export function TaskNotes({
  taskId,
  task,
  threadTitle,
  threadTasks = [],
  onSelectTask,
}: {
  taskId: string;
  task: ActivityTask;
  threadTitle?: string;
  threadTasks?: ActivityTask[];
  onSelectTask?: (task: Task) => void;
}) {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const entries: ActivityEntry[] = [
    ...(threadTasks.length
      ? threadTasks.map(
          (threadTask): ActivityEntry => ({
            type: "thread",
            key: `thread-${threadTask.id}`,
            at: threadTask.createdAt,
            task: threadTask,
          }),
        )
      : [
          {
            type: "created" as const,
            key: `created-${task.id}`,
            at: task.createdAt,
            task,
          },
        ]),
    ...(task.completedAt
      ? [
          {
            type: "completed" as const,
            key: `completed-${task.id}`,
            at: task.completedAt,
            task,
          },
        ]
      : []),
    ...notes.map(
      (note): ActivityEntry => ({
        type: "note",
        key: `note-${note.id}`,
        at: note.createdAt,
        note,
      }),
    ),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  useEffect(() => {
    let cancelled = false;
    getTaskNotes(taskId).then((rows) => {
      if (!cancelled) setNotes(rows);
    }).catch((error) => {
      if (!cancelled) {
        log.error("Could not load task activity", error);
        toast.error("Could not load task activity");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const add = () => {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const res = await addTaskNote(taskId, body);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setNotes((n) => [res.data, ...n]);
      setDraft("");
    });
  };

  const saveEdit = (id: string) => {
    const body = editDraft.trim();
    if (!body) return;
    startTransition(async () => {
      const res = await updateTaskNote(id, body);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setNotes((n) => n.map((x) => (x.id === id ? res.data : x)));
      setEditingId(null);
    });
  };

  const remove = (id: string) => {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id)); // optimistic
    startTransition(async () => {
      const res = await deleteTaskNote(id);
      if (!res.ok) {
        setNotes(prev); // rollback
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <StickyNote className="size-3.5" /> Activity
        </Label>
        {threadTitle && (
          <span className="truncate text-xs text-muted-foreground">
            Thread: {threadTitle}
          </span>
        )}
      </div>

      <ol className="space-y-2 border-l border-border pl-3">
        {entries.map((entry) => (
          <li key={entry.key} className="relative">
            <span className="absolute -left-[17px] top-1.5 size-2 rounded-full bg-primary/60 ring-2 ring-background" />
            {entry.type === "note" ? (
              <article className="group rounded-lg border border-border bg-card px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {fmt(entry.at)}
                  </span>
                  {editingId !== entry.note.id && (
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(entry.note.id);
                          setEditDraft(entry.note.body);
                        }}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit note"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(entry.note.id)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-urgent/10 hover:text-urgent"
                        aria-label="Delete note"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {editingId === entry.note.id ? (
                  <div className="space-y-1.5">
                    <Textarea
                      rows={2}
                      value={editDraft}
                      autoFocus
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full resize-none px-2.5 py-1.5 text-sm"
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={pending}
                      >
                        <X className="size-3.5" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(entry.note.id)}
                        disabled={pending || !editDraft.trim()}
                      >
                        <Check className="size-3.5" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground">
                    {linkify(entry.note.body)}
                  </p>
                )}
              </article>
            ) : (
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {fmt(entry.at)}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {entry.type === "completed"
                      ? "Completed"
                      : entry.type === "created"
                        ? "Created"
                        : "Thread"}
                  </span>
                </div>
                {entry.type === "thread" ? (
                  <button
                    type="button"
                    disabled={entry.task.id === taskId || !onSelectTask}
                    onClick={() => onSelectTask?.(entry.task)}
                    className="mt-1 text-left text-sm font-medium text-foreground hover:text-primary disabled:cursor-default"
                  >
                    {entry.task.title}
                    {entry.task.id === taskId && " · current task"}
                  </button>
                ) : (
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {entry.type === "completed"
                      ? `${entry.task.title} marked complete`
                      : `${entry.task.title} created`}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="flex items-end gap-2 border-t border-border pt-3">
        <Textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a note or paste a link…  (⌘↵)"
          className="min-h-9 flex-1 resize-none rounded-lg px-2.5 py-1.5 text-sm placeholder:text-muted-foreground/70"
        />
        <Button size="sm" onClick={add} disabled={pending || !draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
