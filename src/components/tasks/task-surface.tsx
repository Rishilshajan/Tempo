"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import type { Task, Domain } from "@/db/schema";
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
}: {
  tasks: Task[];
  domains: Domain[];
  title: string;
  initialView?: View;
  boardColumns?: Task["status"][];
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

  const domainMap = useMemo(
    () => new Map(domains.map((d) => [d.id, d])),
    [domains],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "uncat") return tasks.filter((t) => !t.domainId);
    return tasks.filter((t) => t.domainId === filter);
  }, [tasks, filter]);

  const openTask = (t: Task) => {
    setSelected(t);
    setDrawerOpen(true);
  };

  const uncatCount = tasks.filter((t) => !t.domainId).length;

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
          count={tasks.length}
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
        <TaskList tasks={filtered} domainMap={domainMap} onOpen={openTask} />
      )}
      {view === "board" && (
        <TaskBoard
          tasks={filtered}
          domainMap={domainMap}
          onOpen={openTask}
          columns={boardColumns}
        />
      )}
      {view === "calendar" && (
        <TaskCalendar tasks={filtered} domainMap={domainMap} onOpen={openTask} />
      )}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        domains={domains}
      />
      <TaskDetailDrawer
        task={selected}
        domains={domains}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
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
  count?: number;
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
