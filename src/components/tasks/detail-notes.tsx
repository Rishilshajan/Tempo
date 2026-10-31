"use client";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import {
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DescriptionPreview } from "./description-preview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { noteSchema } from "@/lib/validation/task-details";
import { taskTimestamp } from "@/lib/task-datetime";
import type { TaskRecord } from "./task-list";
import { ConfirmDelete, DetailEmpty, detailError } from "./detail-shared";

export function DetailNotes({ task }: { task: TaskRecord }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.taskDetails.listNotes,
    { taskId: task._id },
    { initialNumItems: 10 },
  );
  const remove = useMutation(api.taskDetails.deleteNote);
  const [editor, setEditor] = useState<Doc<"notes"> | "new" | null>("new");
  const [deleting, setDeleting] = useState<Doc<"notes"> | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Notes</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Capture context, decisions, and completed work.
          </p>
        </div>
        <Button
          variant="secondary"
          className="min-h-10 shrink-0 text-xs"
          disabled={editor !== null}
          onClick={() => setEditor("new")}
        >
          <Plus className="size-3.5" />
          Add note
        </Button>
      </div>
      {editor && (
        <NoteEditor
          key={editor === "new" ? "new" : editor._id}
          task={task}
          note={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
      {status === "LoadingFirstPage" ? (
        <p role="status" className="text-xs text-muted-foreground">
          Loading notes…
        </p>
      ) : (
        !results.length &&
        !editor && (
          <DetailEmpty
            icon={<NotebookPen />}
            title="Keep the context with the task"
          >
            Add research, a decision, a progress update, or an output artifact.
          </DetailEmpty>
        )
      )}
      {results.map((note) => (
        <NoteCard
          key={note._id}
          note={note}
          timezone={task.timezone}
          onEdit={() => setEditor(note)}
          onDelete={() => setDeleting(note)}
        />
      ))}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          variant="outline"
          className="w-full"
          disabled={status === "LoadingMore"}
          onClick={() => loadMore(10)}
        >
          {status === "LoadingMore" ? "Loading…" : "Load more notes"}
        </Button>
      )}
      {deleting && (
        <ConfirmDelete
          title="Delete note?"
          description={`“${deleting.title || "Untitled note"}” and its contents will be removed.`}
          onClose={() => setDeleting(null)}
          onDelete={() => remove({ taskId: task._id, noteId: deleting._id })}
        />
      )}
    </div>
  );
}
function NoteCard({
  note,
  timezone,
  onEdit,
  onDelete,
}: {
  note: Doc<"notes">;
  timezone: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="min-w-0 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h4 className="min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">
            {note.title || "Untitled note"}
          </h4>
          <time
            dateTime={new Date(note.createdAt).toISOString()}
            className="text-[10px] text-muted-foreground"
            title="Created date"
          >
            {taskTimestamp(note.createdAt, timezone)}
          </time>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-9 shrink-0"
                aria-label={`Options for note ${note.title || "Untitled note"}`}
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Edit note
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Delete note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <DescriptionPreview text={note.content} />
    </article>
  );
}
function NoteEditor({
  task,
  note,
  onClose,
}: {
  task: TaskRecord;
  note?: Doc<"notes">;
  onClose: () => void;
}) {
  const save = useMutation(api.taskDetails.saveNote);
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const type = note?.type ?? "general";
  const [busy, setBusy] = useState(false);
  const request = useRef<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = noteSchema.safeParse({ title, content, type });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    request.current ??= crypto.randomUUID();
    setBusy(true);
    try {
      await save({
        taskId: task._id,
        ...(note ? { noteId: note._id } : {}),
        ...parsed.data,
        requestId: request.current,
      });
      toast.success(note ? "Note updated." : "Note added.");
      onClose();
    } catch (error) {
      detailError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label={note ? "Edit note" : "Add note"}
      className="rounded-lg border border-border"
    >
      <form
        onSubmit={submit}
        noValidate
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="space-y-3 p-3">
          <label className="grid gap-2 text-xs">
            Title (optional)
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              disabled={busy}
              placeholder="Give this note a title"
            />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="task-note-content" className="text-xs">
                Description
              </label>
            </div>
            <Textarea
              id="task-note-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={20000}
              rows={4}
              disabled={busy}
              placeholder="Write a note…"
              className="min-h-24 resize-y bg-muted/20 text-sm leading-6"
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <p className="text-right text-[10px] text-muted-foreground">
              {content.length.toLocaleString()} / 20,000
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-3 pb-3">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save note"}
          </Button>
        </div>
      </form>
    </section>
  );
}
