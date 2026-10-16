"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, ChevronRight, CircleCheck, Loader2 } from "lucide-react";

import type { Task, Domain } from "@/db/schema";
import { fetchTasksPage, type FollowUpContext } from "@/server/actions";
import type { TaskFilter } from "@/server/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TaskList } from "./task-list";
import { TaskBoard } from "./task-board";
import { TaskCalendar } from "./task-calendar";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskDetailDrawer } from "./task-detail-drawer";

type View = "list" | "board" | "calendar";
type Filter = "all" | "uncat" | (string & {});

const isView = (v: string | null): v is View =>
  v === "list" || v === "board" || v === "calendar";

export function TaskSurface({
  tasks,
  domains,
  title,
  initialView = "list",
  boardColumns,
  noteCounts = {},
  paginate,
}: {
  tasks: Task[];
  domains: Domain[];
  title: string;
  initialView?: View;
  boardColumns?: Task["status"][];
  noteCounts?: Record<string, number>;
  paginate?: { filter: TaskFilter; pageSize: number };
}) {
  // The single source of truth for the view is the ?view= URL param, driven by
  // the header switcher. Falls back to the page's initialView.
  const searchParams = useSearchParams();
  const view: View = isView(searchParams.get("view"))
    ? (searchParams.get("view") as View)
    : initialView;

  const router = useRouter();
  const pathname = usePathname();
  const filter = (searchParams.get("domain") ?? "all") as Filter;
  const setFilter = (f: Filter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (f === "all") params.delete("domain");
    else params.set("domain", f);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [threadContext, setThreadContext] = useState<FollowUpContext | null>(
    null,
  );

  // Drawer requested a follow-up: close it, open Create pre-filled for the thread.
  const handleFollowUp = (ctx: FollowUpContext) => {
    setThreadContext(ctx);
    setDrawerOpen(false);
    setCreateOpen(true);
  };

  const domainMap = useMemo(
    () => new Map(domains.map((d) => [d.id, d])),
    [domains],
  );

  // "Load more" pagination: accumulate pages beyond the first on the client.
  const [extra, setExtra] = useState<Task[]>([]);
  const [hasMore, setHasMore] = useState(
    paginate ? tasks.length >= paginate.pageSize : false,
  );
  const [loadingMore, startLoadMore] = useTransition();

  // Resync when the first-page data changes (navigation / revalidation).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resync pagination to fresh server data
    setExtra([]);
    setHasMore(paginate ? tasks.length >= paginate.pageSize : false);
  }, [tasks, paginate]);

  // Dedupe by id (first occurrence wins) so an overlapping page or a
  // revalidation never renders the same task twice (React key collisions).
  const allTasks = useMemo(() => {
    const byId = new Map<string, Task>();
    for (const t of [...tasks, ...extra]) if (!byId.has(t.id)) byId.set(t.id, t);
    return [...byId.values()];
  }, [tasks, extra]);

  const loadMore = () => {
    if (!paginate) return;
    startLoadMore(async () => {
      const next = await fetchTasksPage({
        ...paginate.filter,
        offset: allTasks.length,
        limit: paginate.pageSize,
      });
      setExtra((e) => [...e, ...next]);
      setHasMore(next.length >= paginate.pageSize);
    });
  };

  const filtered = useMemo(() => {
    if (filter === "all") return allTasks;
    if (filter === "uncat") return allTasks.filter((t) => !t.domainId);
    return allTasks.filter((t) => t.domainId === filter);
  }, [allTasks, filter]);

  // Split completed work into its own collapsible group (list view).
  const activeTasks = useMemo(
    () => filtered.filter((t) => t.status !== "done"),
    [filtered],
  );
  const doneTasks = useMemo(
    () => filtered.filter((t) => t.status === "done"),
    [filtered],
  );
  const [showDone, setShowDone] = useState(false);

  const openTask = (t: Task) => {
    setSelected(t);
    setDrawerOpen(true);
  };

  const uncatCount = allTasks.filter((t) => !t.domainId).length;

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New task
        </Button>
      </div>

      {/* Filter pills */}
      <div className="no-scrollbar -mx-4 mb-4 flex items-center gap-2 overflow-x-auto px-4">
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
          count={hasMore ? `${allTasks.length}+` : allTasks.length}
        />
        {domains.map((d) => (
          <FilterPill
            key={d.id}
            active={filter === d.id}
            onClick={() => setFilter(d.id)}
            label={d.name}
            color={d.color}
          />
        ))}
        {uncatCount > 0 && (
          <FilterPill
            active={filter === "uncat"}
            onClick={() => setFilter("uncat")}
            label="Uncategorized"
            count={uncatCount}
            dashed
          />
        )}
      </div>

      {/* View */}
      {view === "list" && (
        <div className="flex flex-col gap-4">
          {activeTasks.length > 0 || doneTasks.length === 0 ? (
            <TaskList
              tasks={activeTasks}
              domainMap={domainMap}
              onOpen={openTask}
              noteCounts={noteCounts}
            />
          ) : null}

          {doneTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronRight
                  className={cn(
                    "size-4 transition-transform",
                    showDone && "rotate-90",
                  )}
                />
                <CircleCheck className="size-4 text-ontrack" />
                Done ({doneTasks.length})
              </button>
              {showDone && (
                <div className="mt-2.5">
                  <TaskList
                    tasks={doneTasks}
                    domainMap={domainMap}
                    onOpen={openTask}
                    noteCounts={noteCounts}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {view === "board" && (
        <TaskBoard
          tasks={filtered}
          domainMap={domainMap}
          onOpen={openTask}
          columns={boardColumns}
          noteCounts={noteCounts}
        />
      )}
      {view === "calendar" && (
        <TaskCalendar tasks={filtered} domainMap={domainMap} onOpen={openTask} />
      )}

      {paginate && hasMore && (
        <div className="mt-5 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setThreadContext(null);
        }}
        domains={domains}
        threadContext={threadContext}
      />
      <TaskDetailDrawer
        task={selected}
        domains={domains}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onFollowUp={handleFollowUp}
        onSelectTask={openTask}
      />
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  color,
  dashed,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number | string;
  color?: string;
  dashed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium shadow-sm transition-all",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-secondary",
      )}
    >
      {color && (
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {dashed && (
        <span className="size-2 rounded-full border border-dashed border-muted-foreground" />
      )}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-bold",
            active ? "bg-primary-foreground/20" : "bg-muted",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
