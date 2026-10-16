"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { StickyNote, Pencil, Trash2, Link2, Check, X } from "lucide-react";
import { toast } from "sonner";

import type { TaskNote } from "@/db/schema";
import {
  getTaskNotes,
  addTaskNote,
  updateTaskNote,
  deleteTaskNote,
} from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

export function TaskNotes({ taskId }: { taskId: string }) {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getTaskNotes(taskId).then((rows) => {
      if (!cancelled) setNotes(rows);
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
      <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <StickyNote className="size-3.5" /> Notes &amp; Output ({notes.length})
      </Label>

      {/* Quick capture */}
      <div className="flex items-end gap-2">
        <textarea
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
          className="min-h-9 flex-1 resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button size="sm" onClick={add} disabled={pending || !draft.trim()}>
          Add
        </Button>
      </div>

      {/* Log */}
      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
          No notes yet — capture what came out of this task.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="group rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {fmt(n.createdAt)}
                </span>
                {editingId !== n.id && (
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(n.id);
                        setEditDraft(n.body);
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Edit note"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-urgent/10 hover:text-urgent"
                      aria-label="Delete note"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {editingId === n.id ? (
                <div className="space-y-1.5">
                  <textarea
                    rows={2}
                    value={editDraft}
                    autoFocus
                    onChange={(e) => setEditDraft(e.target.value)}
                    className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none [field-sizing:content] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
                      onClick={() => saveEdit(n.id)}
                      disabled={pending || !editDraft.trim()}
                    >
                      <Check className="size-3.5" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground">
                  {linkify(n.body)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
