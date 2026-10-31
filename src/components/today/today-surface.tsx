"use client";
import { MyTasksBoard } from "@/components/tasks/my-tasks-board";

import { TempoLogo } from "@/components/brand/tempo-logo";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  CircleCheck,
  Grid2X2,
  History,
  Plus,
  Search,
  Settings2,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FirstTimeEmptyState } from "./first-time-empty-state";
import {
  CreateDomainSheet,
  type CreateDomainValues,
} from "@/components/domains/create-domain-sheet";
import {
  DomainLabel,
  type DomainSummary,
} from "@/components/domains/domain-appearance";
import { DomainNavigation } from "@/components/domains/domain-navigation";
import { DeleteDomainDialog } from "@/components/domains/delete-domain-dialog";
import { CreateTaskSheet } from "@/components/tasks/create-task-sheet";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { TodayDashboard, type TaskPrefill } from "./today-dashboard";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  TaskList,
  type TaskRecord,
  type SetTaskCompleted,
  type SetTaskProgress,
} from "@/components/tasks/task-list";
import type { CreateTaskValues } from "@/lib/validation/task";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// Clerk can already be loaded in the browser while SSR has no widget markup.
// Mount only this SDK widget on the client; keep the workspace server-rendered.
const WorkspaceUserButton = dynamic(
  () => import("@clerk/nextjs").then((module) => module.UserButton),
  {
    ssr: false,
    loading: () => (
      <span aria-hidden="true" className="block size-8 rounded-full bg-muted" />
    ),
  },
);
const WorkspaceAccount = dynamic(
  () =>
    import("@/components/auth/workspace-account").then(
      (module) => module.WorkspaceAccount,
    ),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden="true" className="h-14 rounded-xl bg-card" />
    ),
  },
);

const navigation = [
  { label: "Today", icon: Sun, current: true },
  { label: "My Tasks", icon: CircleCheck, current: false },
  { label: "Rolled Forward", icon: History, current: false },
  { label: "Calendar", icon: CalendarDays, current: false },
];

const mobileNavigation = [
  { label: "Today", icon: Sun, current: true },
  { label: "Tasks", icon: CircleCheck, current: false },
  { label: "Rolled Forward", icon: History, current: false },
  { label: "More", icon: Grid2X2, current: false },
];

type TodaySurfaceProps = {
  todayContent?: ReactNode;
  todayDate?: string;
  todayLabel: string;
  taskView: "today" | "all" | "domain";
  selectedDomainId?: string;
  onViewChange: (view: "today" | "all") => void;
  onSelectDomain: (domain: DomainSummary) => void;
  tasks: TaskRecord[] | undefined;
  hasAnyTasks: boolean | undefined;
  hasMoreTasks?: boolean;
  loadingMoreTasks?: boolean;
  onLoadMoreTasks?: () => void;
  onCreateTask: (values: CreateTaskValues) => Promise<unknown>;
  onSetTaskCompleted: SetTaskCompleted;
  onSetTaskProgress: SetTaskProgress;
  domains: DomainSummary[] | undefined;
  canCreateDomain: boolean;
  onCreateDomain: (values: CreateDomainValues) => Promise<unknown>;
  onUpdateDomain: (
    domain: DomainSummary,
    values: CreateDomainValues,
  ) => Promise<unknown>;
  onDeleteDomain: (domain: DomainSummary) => Promise<unknown>;
  hasMoreDomains?: boolean;
  onLoadMoreDomains?: () => void;
  loadingMoreDomains?: boolean;
};

export function TodaySurface({
  todayContent,
  todayDate,
  todayLabel,
  taskView,
  selectedDomainId,
  onViewChange,
  onSelectDomain,
  tasks,
  hasAnyTasks,
  hasMoreTasks,
  loadingMoreTasks,
  onLoadMoreTasks,
  onCreateTask,
  onSetTaskCompleted,
  onSetTaskProgress,
  domains,
  canCreateDomain,
  onCreateDomain,
  onUpdateDomain,
  onDeleteDomain,
  hasMoreDomains,
  onLoadMoreDomains,
  loadingMoreDomains,
}: TodaySurfaceProps) {
  const [domainSheetOpen, setDomainSheetOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<DomainSummary | null>(
    null,
  );
  const [deletingDomain, setDeletingDomain] = useState<DomainSummary | null>(
    null,
  );
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [taskPrefill, setTaskPrefill] = useState<TaskPrefill | null>(null);
  const [dashboardDate, setDashboardDate] = useState<string>();
  const [detailId, setDetailId] = useState<Id<"tasks"> | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const selectedDomain = domains?.find(
    (domain) => domain._id === selectedDomainId,
  );
  function openCreateTask() {
    const date = todayDate ?? dashboardDate;
    setTaskPrefill(taskView === "today" && date ? { date } : null);
    setTaskSheetOpen(true);
  }

  function openCreateDomain() {
    setMoreOpen(false);
    setEditingDomain(null);
    setDomainSheetOpen(true);
  }

  function editDomain(domain: DomainSummary) {
    setMoreOpen(false);
    setEditingDomain(domain);
    setDomainSheetOpen(true);
  }

  function selectDomain(domain: DomainSummary) {
    onSelectDomain(domain);
    setMoreOpen(false);
  }

  const domainNavigation = domains ? (
    <DomainNavigation
      domains={domains}
      selectedId={selectedDomain?._id}
      onSelect={selectDomain}
      onEdit={editDomain}
      onDelete={(domain) => {
        setMoreOpen(false);
        setDeletingDomain(domain);
      }}
    />
  ) : (
    <p role="status" className="px-3 text-xs text-muted-foreground">
      Connecting workspace…
    </p>
  );

  return (
    <div className="min-h-svh bg-background text-foreground">
      <a
        href="#today-content"
        className="sr-only z-50 rounded-md bg-card p-3 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <aside
        aria-label="Workspace sidebar"
        className="fixed inset-y-0 left-0 hidden w-48 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex"
      >
        <Link
          href="/"
          aria-label="Tempo home"
          className="mb-5 ml-3 inline-flex w-fit rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <TempoLogo />
        </Link>
        <Button
          className="mb-5 min-h-10 w-full gap-2 text-xs"
          onClick={openCreateTask}
        >
          <Plus aria-hidden="true" />
          Create Task
        </Button>
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          General
        </p>
        <nav aria-label="Workspace navigation" className="space-y-1">
          {navigation.map(({ label, icon: Icon, current }) =>
            current || label === "My Tasks" ? (
              <button
                key={label}
                type="button"
                onClick={() => onViewChange(current ? "today" : "all")}
                aria-current={
                  taskView === (current ? "today" : "all") ? "page" : undefined
                }
                className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${taskView === (current ? "today" : "all") ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ) : (
              <button
                key={label}
                type="button"
                disabled
                aria-label={`${label} (coming next)`}
                className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs text-muted-foreground opacity-60"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ),
          )}
        </nav>
        <div className="mt-6 flex items-center justify-between pl-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Domains
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-primary"
            aria-label="Create domain"
            onClick={openCreateDomain}
          >
            <Plus size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          {domainNavigation}
          {hasMoreDomains && (
            <Button
              variant="ghost"
              className="mt-2 min-h-11 text-xs"
              disabled={loadingMoreDomains}
              onClick={onLoadMoreDomains}
            >
              {loadingMoreDomains ? "Loading…" : "Load more domains"}
            </Button>
          )}
        </div>
        <div className="mt-auto space-y-2 border-t border-sidebar-border pt-3">
          <button
            type="button"
            disabled
            aria-label="Settings (coming next)"
            className="flex min-h-9 w-full items-center gap-2 px-3 text-xs text-muted-foreground opacity-60"
          >
            <Settings2 size={16} aria-hidden="true" />
            Settings
          </button>
          <WorkspaceAccount />
        </div>
      </aside>

      <div className="lg:pl-48">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-card/60 px-4 sm:px-8">
          <Link
            href="/"
            aria-label="Tempo home"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:hidden"
          >
            <TempoLogo />
          </Link>
          <div className="hidden w-full max-w-sm items-center gap-3 rounded-lg bg-muted/60 px-3 lg:flex">
            <Search
              size={16}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
            <input
              type="search"
              disabled
              aria-label="Search tasks and domains (coming next)"
              placeholder="Search tasks and domains"
              className="h-10 min-w-0 w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-5">
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex">
              <CalendarDays size={14} aria-hidden="true" />
              {todayLabel}
            </span>
            <div className="size-8 shrink-0">
              <WorkspaceUserButton />
            </div>
          </div>
        </header>

        <main
          id="today-content"
          className="w-full min-w-0 px-4 pb-28 pt-6 sm:px-8 lg:pb-10"
        >
          {taskView === "domain" && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 px-2 text-xs font-medium text-primary">
                {selectedDomain ? (
                  <DomainLabel {...selectedDomain} />
                ) : (
                  <>
                    <Sun size={16} aria-hidden="true" />
                    <span>Today</span>
                  </>
                )}
              </div>
              {tasks && tasks.length > 0 && (
                <Button
                  className="min-h-10 gap-2 text-xs lg:hidden"
                  onClick={openCreateTask}
                >
                  <Plus aria-hidden="true" />
                  Create Task
                </Button>
              )}
            </div>
          )}
          {domains === undefined ||
          (taskView !== "today" && tasks === undefined) ||
          hasAnyTasks === undefined ? (
            <p
              role="status"
              className="py-20 text-center text-sm text-muted-foreground"
            >
              Connecting your workspace…
            </p>
          ) : taskView === "today" && !hasAnyTasks && domains.length === 0 ? (
            <FirstTimeEmptyState
              taskCount={0}
              domainCount={0}
              onCreateTask={openCreateTask}
              onCreateDomain={openCreateDomain}
            />
          ) : taskView === "today" ? (
            (todayContent ?? (
              <TodayDashboard
                onSelectedDateChange={setDashboardDate}
                domains={domains}
                onCreateTask={(prefill) => {
                  setTaskPrefill(prefill);
                  setTaskSheetOpen(true);
                }}
                onOpenTask={(task) => setDetailId(task._id)}
                onSetCompleted={onSetTaskCompleted}
                onSetProgress={onSetTaskProgress}
              />
            ))
          ) : taskView === "all" ? (
            <MyTasksBoard
              tasks={tasks ?? []}
              domains={domains}
              incomplete={hasMoreTasks}
              onCreate={openCreateTask}
              onCreateForDate={(date, startAt) => {
                setTaskPrefill({ date, startAt });
                setTaskSheetOpen(true);
              }}
              onOpen={(task) => setDetailId(task._id)}
              onSetCompleted={onSetTaskCompleted}
              onSetProgress={onSetTaskProgress}
            />
          ) : tasks && tasks.length > 0 ? (
            <section aria-labelledby="tasks-heading" className="mt-7">
              <h1
                id="tasks-heading"
                className="mb-2 break-words text-[22px] font-semibold tracking-tight sm:text-2xl"
              >
                {selectedDomain?.name ?? "Tasks"}
              </h1>
              <div className="mt-5">
                <TaskList
                  tasks={tasks}
                  isToday={false}
                  onSetCompleted={onSetTaskCompleted}
                  onSetProgress={onSetTaskProgress}
                />
              </div>
              {hasMoreTasks && (
                <Button
                  variant="secondary"
                  disabled={loadingMoreTasks}
                  className="mt-5 min-h-10"
                  onClick={onLoadMoreTasks}
                >
                  {loadingMoreTasks ? "Loading…" : "Load more tasks"}
                </Button>
              )}
            </section>
          ) : (
            <section
              aria-labelledby="tasks-empty-heading"
              className="flex min-h-[55svh] flex-col items-center justify-center px-4 py-12 text-center"
            >
              <h1
                id="tasks-empty-heading"
                className="text-[22px] font-semibold tracking-tight sm:text-2xl"
              >
                {taskView === "domain"
                  ? "No tasks in this domain"
                  : taskView === "all"
                    ? "No tasks yet"
                    : "No tasks for today"}
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                There are no tasks here yet.
              </p>
              <Button
                className="mt-7 min-h-11 gap-2 px-5"
                onClick={openCreateTask}
              >
                <Plus aria-hidden="true" />
                Create Task
              </Button>
            </section>
          )}
        </main>
      </div>

      <nav
        aria-label="Mobile workspace navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {mobileNavigation.map(({ label, icon: Icon, current }) =>
          current || label === "Tasks" ? (
            <button
              key={label}
              type="button"
              onClick={() => onViewChange(current ? "today" : "all")}
              aria-current={
                taskView === (current ? "today" : "all") ? "page" : undefined
              }
              className={`flex min-h-17 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary ${taskView === (current ? "today" : "all") ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          ) : label === "More" ? (
            <button
              key={label}
              type="button"
              aria-label="More"
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
              className="flex min-h-17 flex-col items-center justify-center gap-1 px-1 text-[10px] text-foreground"
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          ) : (
            <button
              key={label}
              type="button"
              disabled
              aria-label={`${label} (coming next)`}
              className="flex min-h-17 flex-col items-center justify-center gap-1 px-1 text-[10px] text-muted-foreground opacity-60"
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          ),
        )}
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent className="!w-full !max-w-sm gap-0">
          <SheetHeader className="pr-14">
            <SheetTitle>Domains</SheetTitle>
            <SheetDescription>
              Choose a domain to view its tasks.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {domainNavigation}
            {hasMoreDomains && (
              <Button
                variant="ghost"
                className="min-h-11"
                disabled={loadingMoreDomains}
                onClick={onLoadMoreDomains}
              >
                {loadingMoreDomains ? "Loading…" : "Load more domains"}
              </Button>
            )}
            <Button
              variant="secondary"
              className="mt-4 min-h-11 w-full"
              onClick={openCreateDomain}
            >
              <Plus aria-hidden="true" />
              Create Domain
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <CreateTaskSheet
        open={taskSheetOpen}
        onOpenChange={setTaskSheetOpen}
        domains={domains}
        initialDomainId={selectedDomain?._id}
        initialDate={taskPrefill?.date}
        initialStartAt={taskPrefill?.startAt}
        canSubmit={canCreateDomain}
        onCreate={onCreateTask}
        hasMoreDomains={hasMoreDomains}
        loadingMoreDomains={loadingMoreDomains}
        onLoadMoreDomains={onLoadMoreDomains}
      />
      <TaskDetailSheet
        id={detailId}
        onClose={() => setDetailId(null)}
        onSetCompleted={onSetTaskCompleted}
        onSetProgress={onSetTaskProgress}
      />
      <CreateDomainSheet
        open={domainSheetOpen}
        onOpenChange={setDomainSheetOpen}
        canSubmit={canCreateDomain}
        initialValues={editingDomain ?? undefined}
        onCreate={(values) =>
          editingDomain
            ? onUpdateDomain(editingDomain, values)
            : onCreateDomain(values)
        }
      />
      <DeleteDomainDialog
        key={deletingDomain?._id ?? "none"}
        domain={deletingDomain}
        onClose={() => setDeletingDomain(null)}
        onDelete={async (domain) => {
          await onDeleteDomain(domain);
        }}
      />
    </div>
  );
}
