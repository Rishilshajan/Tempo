"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Link2, Pencil, Plus, StickyNote, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import type { TaskNote } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addTaskNote,
  deleteTaskNote,
  getTaskNotes,
  updateTaskNote,
} from "@/server/actions";
import { log } from "@/lib/logger";

const SPLIT_RE = /(https?:\/\/[^\s]+)/g;
const IS_URL = /^https?:\/\//;

function formatNoteDate(value: Date | string): string {
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

function linkify(body: string): ReactNode[] {
  return body.split(SPLIT_RE).map((part, index) => {
    if (!IS_URL.test(part)) return <span key={index}>{part}</span>;
    try {
      const url = new URL(part);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return <span key={index}>{part}</span>;
      }
      return (
        <a
          key={index}
          href={url.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-0.5 break-all font-medium text-primary hover:underline"
        >
          <Link2 className="size-3 shrink-0" />
          {url.hostname + (url.pathname !== "/" ? url.pathname : "")}
        </a>
      );
    } catch {
      return <span key={index}>{part}</span>;
    }
  });
}

export function TaskNotes({ taskId }: { taskId: string }) {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getTaskNotes(taskId)
      .then((rows) => {
        if (!cancelled) setNotes(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          log.error("Could not load task notes", error);
          toast.error("Could not load task notes");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const add = () => {
    const noteBody = body.trim();
    if (!noteBody) return;
    startTransition(async () => {
      const result = await addTaskNote(taskId, {
        title: title.trim() || null,
        body: noteBody,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNotes((current) => [result.data, ...current]);
      setTitle("");
      setBody("");
      toast.success("Note added");
    });
  };

  const saveEdit = (id: string) => {
    const noteBody = editBody.trim();
    if (!noteBody) return;
    startTransition(async () => {
      const result = await updateTaskNote(id, {
        title: editTitle.trim() || null,
        body: noteBody,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNotes((current) =>
        current.map((note) => (note.id === id ? result.data : note)),
      );
      setEditingId(null);
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await deleteTaskNote(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNotes((current) => current.filter((note) => note.id !== id));
    });
  };

  return (
    <section className="space-y-4" aria-label="Task notes">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <StickyNote className="size-4 text-primary" /> Notes
          <span className="text-xs font-normal text-muted-foreground">
            ({notes.length})
          </span>
        </h3>
      </div>

      <div className="space-y-2 rounded-xl border border-border p-3">
        <Label htmlFor="task-note-title">Title (optional)</Label>
        <Input
          id="task-note-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Meeting notes, decision, blocker…"
          maxLength={200}
        />
        <Label htmlFor="task-note-body">Note</Label>
        <Textarea
          id="task-note-body"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Capture context, thoughts, decisions, or useful links…"
          maxLength={5000}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={add} disabled={pending || !body.trim()}>
            <Plus className="size-3.5" /> Add note
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
          No notes yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id} className="py-3 first:pt-0">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Title (optional)"
                    maxLength={200}
                    aria-label="Note title"
                  />
                  <Textarea
                    rows={3}
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    aria-label="Note content"
                  />
                  <div className="flex justify-end gap-2">
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
                      onClick={() => saveEdit(note.id)}
                      disabled={pending || !editBody.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <article className="group rounded-lg border border-border bg-card px-3 py-2.5">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {note.title && (
                        <h4 className="truncate text-sm font-semibold">
                          {note.title}
                        </h4>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Created {formatNoteDate(note.createdAt)}
                      </p>
                      {new Date(note.updatedAt).getTime() >
                        new Date(note.createdAt).getTime() && (
                        <p className="text-[11px] text-muted-foreground">
                          Updated {formatNoteDate(note.updatedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditTitle(note.title ?? "");
                          setEditBody(note.body);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit note"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(note.id)}
                        disabled={pending}
                        className="rounded p-1 text-muted-foreground hover:bg-urgent/10 hover:text-urgent"
                        aria-label="Delete note"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {linkify(note.body)}
                  </p>
                </article>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
