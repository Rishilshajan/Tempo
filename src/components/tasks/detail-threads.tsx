"use client";
import { useRef, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { GitBranch, Link2, Link2Off, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateTaskSheet } from "./create-task-sheet";
import { threadSchema } from "@/lib/validation/task-details";
import { localDateKey } from "@/lib/validation/task";
import { TaskSelect } from "./task-select";
import { TaskStatusSelect } from "./task-status";
import type {
  TaskRecord,
  SetTaskCompleted,
  SetTaskProgress,
} from "./task-list";
import { detailError } from "./detail-shared";

export function DetailThreads({
  task,
  onOpenTask,
  onSetCompleted,
  onSetProgress,
}: {
  task: TaskRecord;
  onOpenTask: (id: Id<"tasks">) => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
}) {
  const threads = useQuery(api.taskDetails.threadsForTask, {
    taskId: task._id,
  });
  const [selected, setSelected] = useState<string>("");
  const [dialog, setDialog] = useState<"create" | "link" | "connect" | null>(
    null,
  );
  const current =
    threads?.find((thread) => thread._id === selected) ?? threads?.[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Thread stream</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Connect related tasks and follow their progress.
          </p>
        </div>
        {!!threads?.length && (
          <div className="flex flex-wrap justify-end gap-1">
            <Button
              variant="secondary"
              className="min-h-8 px-2 text-xs"
              onClick={() => setDialog("create")}
            >
              <Plus className="size-3.5" />
              Create thread
            </Button>
            <Button
              variant="ghost"
              className="min-h-8 px-2 text-xs"
              onClick={() => setDialog(current ? "link" : "connect")}
            >
              <Link2 className="size-3.5" />
              Link existing task
            </Button>
          </div>
        )}
      </div>
      {threads === undefined ? (
        <p role="status" className="text-xs text-muted-foreground">
          Loading threads…
        </p>
      ) : !threads.length ? (
        <section className="rounded-xl border border-border bg-muted/20 px-4 py-6 text-center">
          <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GitBranch className="size-5" aria-hidden="true" />
          </span>
          <h4 className="text-sm font-medium">Keep related tasks together</h4>
          <p className="mx-auto mt-1 max-w-64 text-xs leading-5 text-muted-foreground">
            Create a new task in a thread, or connect a task you already have.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <Button
              className="min-h-10 text-xs"
              onClick={() => setDialog("create")}
            >
              <Plus className="size-3.5" />
              Create thread
            </Button>
            <Button
              variant="outline"
              className="min-h-10 text-xs"
              onClick={() => setDialog("connect")}
            >
              <Link2 className="size-3.5" />
              Link existing task
            </Button>
          </div>
        </section>
      ) : (
        current && (
          <>
            {threads.length > 1 && (
              <TaskSelect
                label="Select task thread"
                value={current._id}
                onChange={setSelected}
                options={threads.map((thread) => ({
                  value: thread._id,
                  label: thread.name,
                }))}
              />
            )}
            <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="break-words text-sm font-medium [overflow-wrap:anywhere]">
                    {current.name}
                  </h4>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {current.taskCount}{" "}
                    {current.taskCount === 1 ? "task" : "tasks"} linked
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="min-h-9 shrink-0 px-2 text-xs"
                  onClick={() => setDialog("link")}
                >
                  <Link2 className="size-3.5" />
                  Link task
                </Button>
              </div>
              {current.description && (
                <p className="whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                  {current.description}
                </p>
              )}
              <ThreadTasks
                key={current._id}
                thread={current}
                task={task}
                onOpenTask={onOpenTask}
                onSetCompleted={onSetCompleted}
                onSetProgress={onSetProgress}
              />
            </section>
          </>
        )
      )}
      {dialog === "create" && (
        <CreateThread
          task={task}
          onClose={() => setDialog(null)}
          onCreated={(id) => {
            setSelected(id);
            setDialog(null);
          }}
        />
      )}
      {dialog === "link" && current && (
        <RelationshipPicker
          mode="link"
          task={task}
          threadId={current._id}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "connect" && (
        <RelationshipPicker
          mode="connect"
          task={task}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
function ThreadTasks({
  task,
  thread,
  onOpenTask,
  onSetCompleted,
  onSetProgress,
}: {
  task: TaskRecord;
  thread: Doc<"threads">;
  onOpenTask: (id: Id<"tasks">) => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.taskDetails.threadTasks,
    { taskId: task._id, threadId: thread._id },
    { initialNumItems: 15 },
  );
  const unlink = useMutation(api.taskDetails.unlinkTask);
  const [removing, setRemoving] = useState<string | null>(null);
  async function unlinkTask(id: Id<"tasks">) {
    if (removing) return;
    setRemoving(id);
    try {
      await unlink({ taskId: id, threadId: thread._id });
      toast.success("Task unlinked.");
    } catch (error) {
      detailError(error);
    } finally {
      setRemoving(null);
    }
  }
  return (
    <div className="space-y-2">
      {status === "LoadingFirstPage" && (
        <p role="status" className="text-xs text-muted-foreground">
          Loading linked tasks…
        </p>
      )}
      <ul className="space-y-2">
        {results.map((related) => (
          <li
            key={related._id}
            className={`flex min-w-0 flex-wrap items-center gap-1 rounded-md px-2 py-1.5 ${related._id === task._id ? "bg-primary/5" : "bg-card"}`}
          >
            <button
              type="button"
              className="min-h-8 min-w-0 flex-1 truncate text-left text-xs font-medium hover:text-primary"
              title={related.title}
              onClick={() => {
                if (related._id !== task._id) onOpenTask(related._id);
              }}
            >
              {related.title}
              {related._id === task._id && (
                <span className="ml-1 text-[10px] font-normal text-primary">
                  (Current)
                </span>
              )}
            </button>
            <TaskStatusSelect
              task={related}
              onSetCompleted={onSetCompleted}
              onSetProgress={onSetProgress}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 shrink-0"
              aria-label={`Remove ${related.title} from thread`}
              disabled={removing !== null}
              onClick={() => void unlinkTask(related._id)}
            >
              <Link2Off className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          variant="outline"
          className="w-full text-xs"
          disabled={status === "LoadingMore"}
          onClick={() => loadMore(15)}
        >
          {status === "LoadingMore" ? "Loading…" : "Load more linked tasks"}
        </Button>
      )}
    </div>
  );
}
function CreateThread({
  task,
  onClose,
  onCreated,
}: {
  task: TaskRecord;
  onClose: () => void;
  onCreated: (id: Id<"threads">) => void;
}) {
  const createTask = useMutation(api.tasks.create);
  const createThread = useMutation(api.taskDetails.createThread);
  const domains = usePaginatedQuery(
    api.domains.list,
    {},
    { initialNumItems: 30 },
  );
  const request = useRef<string | null>(null);
  return (
    <CreateTaskSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      domains={domains.results}
      initialDomainId={task.domainId}
      canSubmit
      hasMoreDomains={domains.status === "CanLoadMore"}
      loadingMoreDomains={domains.status === "LoadingMore"}
      onLoadMoreDomains={() => domains.loadMore(30)}
      onCreate={async (values) => {
        request.current ??= crypto.randomUUID();
        const relatedTaskId = await createTask({
          ...values,
          domainId: values.domainId as Id<"domains"> | undefined,
        });
        const id = await createThread({
          taskId: task._id,
          relatedTaskId,
          name: values.title.slice(0, 113) + " thread",
          requestId: request.current,
        });
        toast.success("Task created and linked in a thread.");
        onCreated(id);
      }}
    />
  );
}
function RelationshipPicker({
  mode,
  task,
  threadId,
  onClose,
}: {
  mode: "link" | "join" | "connect";
  task: TaskRecord;
  threadId?: Id<"threads">;
  onClose: () => void;
}) {
  const link = useMutation(api.taskDetails.linkTask);
  const create = useMutation(api.taskDetails.createThread);
  const tasks = usePaginatedQuery(
    api.tasks.list,
    mode !== "join"
      ? { view: "all", today: localDateKey(new Date(), task.timezone) }
      : "skip",
    { initialNumItems: 20 },
  );
  const threads = usePaginatedQuery(
    api.taskDetails.listThreads,
    mode === "join" ? {} : "skip",
    { initialNumItems: 20 },
  );
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const name = `${task.title.slice(0, 110)} thread`;
  const request = useRef<{ id: string; requestId: string } | null>(null);
  const source = mode !== "join" ? tasks : threads;
  const options =
    mode !== "join"
      ? tasks.results
          .filter((row) => row._id !== task._id)
          .map((row) => ({ id: row._id, title: row.title }))
      : threads.results.map((row) => ({ id: row._id, title: row.name }));
  const filtered = options.filter((row) =>
    row.title.toLowerCase().includes(search.trim().toLowerCase()),
  );
  async function choose(id: Id<"tasks"> | Id<"threads">) {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "connect") {
        const parsed = threadSchema.safeParse({ name });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        if (request.current?.id !== id)
          request.current = { id, requestId: crypto.randomUUID() };
        await create({
          taskId: task._id,
          relatedTaskId: id as Id<"tasks">,
          ...parsed.data,
          requestId: request.current.requestId,
        });
      } else
        await link({
          taskId: mode === "link" ? (id as Id<"tasks">) : task._id,
          threadId: mode === "join" ? (id as Id<"threads">) : threadId!,
        });
      toast.success(
        mode === "join" ? "Task joined the thread." : "Task linked.",
      );
      onClose();
    } catch (error) {
      detailError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-card p-3"
      aria-label={
        mode === "join" ? "Join existing thread" : "Link existing task"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium">
          {mode === "join" ? "Join existing thread" : "Link existing task"}
        </h4>
        <Button variant="ghost" size="sm" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
      <Input
        aria-label="Filter loaded items"
        placeholder={
          mode === "join" ? "Search threads…" : "Search task titles…"
        }
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={busy}
        className="min-h-8 text-xs"
      />
      <TaskSelect
        label={
          mode === "join" ? "Choose existing thread" : "Choose task to attach"
        }
        value="__choose__"
        onChange={(id) => {
          if (id) void choose(id as Id<"tasks"> | Id<"threads">);
        }}
        options={[
          {
            value: "__choose__",
            label: mode === "join" ? "Choose a thread…" : "Choose a task…",
            disabled: true,
          },
          ...filtered.map((row) => ({ value: row.id, label: row.title })),
        ]}
        disabled={busy || !filtered.length}
      />
      {!filtered.length && (
        <p className="text-xs text-muted-foreground">
          {source.status === "LoadingFirstPage"
            ? "Loading…"
            : "No matching results in the loaded items."}
        </p>
      )}
      {(source.status === "CanLoadMore" || source.status === "LoadingMore") && (
        <Button
          variant="ghost"
          className="w-full text-xs"
          disabled={busy || source.status === "LoadingMore"}
          onClick={() => source.loadMore(20)}
        >
          Load more
        </Button>
      )}
      {busy && (
        <p role="status" className="text-xs text-muted-foreground">
          Linking…
        </p>
      )}
    </section>
  );
}
