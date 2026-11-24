/**
 * TEMPO-003 - TodaySurface: composes reused presentation and a single state hook.
 * Code map: src/components/code-map.md.
 */
"use client";
import { TempoLogo } from "@/components/brand/tempo-logo";
import { CreateDomainSheet } from "@/components/domains/create-domain-sheet";
import { DeleteDomainDialog } from "@/components/domains/delete-domain-dialog";
import { DomainSettings } from "@/components/domains/domain-settings";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { CreateTaskSheet } from "@/components/tasks/create-task-sheet";
import { MyTasksBoard } from "@/components/tasks/my-tasks-board";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { Button } from "@/components/ui/button";
import {
Popover,
PopoverContent,
PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { FirstTimeEmptyState } from "./first-time-empty-state";
import { TodayDashboard } from "./today-dashboard";
import {
WorkspaceUserButton,
mobileNavigation,
navigation
} from "./today-shell-config";
import { useTodaySurface } from "./use-today-surface";
import { WorkspaceSearch } from "./workspace-search";
/**
 * TEMPO-003-F04 - TodaySurface
 * Purpose: Composes the existing workspace header, views, and editor overlays.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function TodaySurface(input: Parameters<typeof useTodaySurface>[0]) {
  const model = useTodaySurface(input);
  const { todayContent, notificationsEnabled, todayLabel, taskView, selectedDomainId, onViewChange, onSelectDomain, tasks, hasAnyTasks, hasMoreTasks, onCreateTask, onSetTaskCompleted, onSetTaskProgress, domains, canCreateDomain, onCreateDomain, onUpdateDomain, onDeleteDomain, onReorderDomains, hasMoreDomains, onLoadMoreDomains, loadingMoreDomains, domainsOpen, setDomainsOpen, inAppDraft, setInAppDraft, settingsSection, setSettingsSection, domainSheetOpen, setDomainSheetOpen, editingDomain, deletingDomain, setDeletingDomain, taskSheetOpen, setTaskSheetOpen, taskPrefill, setTaskPrefill, setDashboardDate, detailId, setDetailId, selectedDomain, openCreateTask, openCreateDomain, editDomain, selectDomain, domainNavigation } = model;
  return (
    <div className="dashboard-shell min-h-svh bg-background text-foreground">
      <a
        href="#today-content"
        className="sr-only z-50 rounded-md bg-card p-3 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <div>
        <header className="dashboard-header relative flex min-h-16 items-center justify-between gap-4 border-b border-border bg-card/60 px-4 sm:px-8">
          <Link
            href="/"
            aria-label="Tempo home"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <TempoLogo />
          </Link>
          <nav
            aria-label="Workspace navigation"
            className="hidden shrink-0 items-center gap-1 lg:flex"
          >
            {navigation.map(({ label, current }) => {
              const active = current
                ? taskView === "today"
                : taskView === "all" || taskView === "domain";
              return (
                <Button
                  key={label}
                  variant="ghost"
                  className={
                    active
                      ? "min-h-10 bg-secondary text-primary"
                      : "min-h-10 text-muted-foreground"
                  }
                  aria-current={active ? "page" : undefined}
                  onClick={() => onViewChange(current ? "today" : "all")}
                >
                  {label}
                </Button>
              );
            })}
            <Popover open={domainsOpen} onOpenChange={setDomainsOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    className="min-h-10 gap-1 text-muted-foreground"
                  />
                }
              >
                Domains

              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-h-[70dvh] overflow-y-auto"
              >
                <Button
                  variant="ghost"
                  className="min-h-10 w-full justify-start"
                  onClick={() => {
                    setDomainsOpen(false);
                    onViewChange("all");
                  }}
                >
                  All domains
                </Button>
                {domainNavigation}
                {hasMoreDomains && (
                  <Button
                    variant="ghost"
                    className="min-h-10"
                    disabled={loadingMoreDomains}
                    onClick={onLoadMoreDomains}
                  >
                    {loadingMoreDomains ? "Loading…" : "Load more domains"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="min-h-10 w-full gap-2"
                  onClick={() => {
                    setDomainsOpen(false);
                    openCreateDomain();
                  }}
                >

                  Create domain
                </Button>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" className="min-h-10 text-muted-foreground" onClick={() => { setSettingsSection("domains"); onViewChange("settings"); }}>Settings</Button>
          </nav>
          <WorkspaceSearch
            enabled={notificationsEnabled}
            onTask={setDetailId}
            onDomain={selectDomain}
          />
          <div className="flex shrink-0 items-center gap-4 sm:gap-5 lg:gap-5">
            <Button
              className="hidden min-h-10 gap-2 lg:inline-flex"
              onClick={openCreateTask}
            >

              Create task
            </Button>
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex lg:hidden">
              <CalendarDays size={14} aria-hidden="true" />
              {todayLabel}
            </span>
            <WorkspaceSearch
              enabled={notificationsEnabled}
              onTask={setDetailId}
              onDomain={selectDomain}
              mobile
            />
            {notificationsEnabled && inAppDraft !== false && (
              <NotificationInbox onOpenTask={setDetailId} />
            )}
            <div className="size-8 shrink-0">
              <WorkspaceUserButton />
            </div>
          </div>
        </header>

        <main
          id="today-content"
          data-workspace-view={taskView}
          className="w-full min-w-0 px-4 pb-28 pt-6 sm:px-8 lg:pb-10"
        >
          {taskView === "settings" ? (
            <div className="space-y-4">
              {notificationsEnabled && (
                <nav
                  aria-label="Settings sections"
                  className="flex flex-wrap gap-2"
                >
                  <Button
                    size="sm"
                    variant={
                      settingsSection === "domains" ? "default" : "outline"
                    }
                    aria-pressed={settingsSection === "domains"}
                    onClick={() => setSettingsSection("domains")}
                  >
                    Domains
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      settingsSection === "notifications"
                        ? "default"
                        : "outline"
                    }
                    aria-pressed={settingsSection === "notifications"}
                    onClick={() => setSettingsSection("notifications")}
                  >
                    Notifications &amp; Reminders
                  </Button>
                </nav>
              )}
              {settingsSection === "notifications" && notificationsEnabled ? (
                <NotificationSettings onInAppDraftChange={setInAppDraft} />
              ) : (
                <DomainSettings
                  domains={domains}
                  loading={!!hasMoreDomains}
                  onReorder={onReorderDomains}
                  onCreate={openCreateDomain}
                  onEdit={editDomain}
                  onDelete={setDeletingDomain}
                />
              )}
            </div>
          ) : domains === undefined ||
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
          ) : (
            <MyTasksBoard
              selectedDomainId={
                taskView === "domain" ? (selectedDomainId ?? "") : ""
              }
              onDomainChange={(id) => {
                const domain = domains.find((item) => item._id === id);
                if (domain) onSelectDomain(domain);
                else onViewChange("all");
              }}
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
          )}
        </main>
      </div>

      <nav
        aria-label="Mobile workspace navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {mobileNavigation.map(({ label, icon: Icon, current }) => {
          const view = current
            ? "today"
            : label === "Settings"
              ? "settings"
              : "all";
          const active =
            taskView === view || (view === "all" && taskView === "domain");
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (view === "settings") setSettingsSection("domains");
                if (taskView !== view) onViewChange(view);
              }}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </nav>
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
