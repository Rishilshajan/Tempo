/**
 * TEMPO-003 - useTodaySurface: state and actions owned once per mounted view.
 * Code map: src/components/code-map.md.
 */
"use client";
import type { DomainSummary } from "@/components/domains/domain-appearance";
import { DomainNavigation } from "@/components/domains/domain-navigation";
import { localDateKey } from "@/lib/validation/task";
import { useEffect, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { type TodaySurfaceProps } from "./today-shell-config";
import type { TaskPrefill } from "./today-types";
/**
 * TEMPO-003-F22 - useTodaySurface
 * Purpose: Owns existing workspace navigation, domain dialogs and task overlay state.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function useTodaySurface({
  todayContent,
  notificationsEnabled = false,
  todayDate,
  todayLabel,
  taskView,
  selectedDomainId,
  onViewChange,
  onSelectDomain,
  tasks,
  hasAnyTasks,
  hasMoreTasks,
  onCreateTask,
  onSetTaskCompleted,
  onSetTaskProgress,
  domains,
  canCreateDomain,
  onCreateDomain,
  onUpdateDomain,
  onDeleteDomain,
  onReorderDomains,
  hasMoreDomains,
  onLoadMoreDomains,
  loadingMoreDomains,
}: TodaySurfaceProps) {
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [inAppDraft, setInAppDraft] = useState<boolean>();
  const [settingsSection, setSettingsSection] = useState<
    "domains" | "notifications"
  >("domains");
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
  useEffect(() => {
    if (!notificationsEnabled) return;
    const url = new URL(window.location.href);
    const taskId = url.searchParams.get("notificationTask");
    if (!taskId) return;
    const timer = window.setTimeout(() => {
      url.searchParams.delete("notificationTask");
      window.history.replaceState(window.history.state, "", url);
      if (/^[a-z0-9]{32}$/.test(taskId)) setDetailId(taskId as Id<"tasks">);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [notificationsEnabled]);
  const selectedDomain = domains?.find(
    (domain) => domain._id === selectedDomainId,
  );
  function openCreateTask() {
    const selectedDate = todayDate ?? dashboardDate;
    const date =
      selectedDate && selectedDate >= localDateKey()
        ? selectedDate
        : localDateKey();
    setTaskPrefill(taskView === "today" && date ? { date } : null);
    setTaskSheetOpen(true);
  }

  function openCreateDomain() {
    setEditingDomain(null);
    setDomainSheetOpen(true);
  }

  function editDomain(domain: DomainSummary) {
    setEditingDomain(domain);
    setDomainSheetOpen(true);
  }

  function selectDomain(domain: DomainSummary) {
    setDomainsOpen(false);
    onSelectDomain(domain);
  }

  const domainNavigation = domains ? (
    <DomainNavigation
      domains={domains}
      selectedId={selectedDomain?._id}
      onSelect={selectDomain}
      onEdit={editDomain}
      onDelete={(domain) => {
        setDeletingDomain(domain);
      }}
    />
  ) : (
    <p role="status" className="px-3 text-xs text-muted-foreground">
      Connecting workspace…
    </p>
  );

  return {
    todayContent,
    notificationsEnabled,
    todayDate,
    todayLabel,
    taskView,
    selectedDomainId,
    onViewChange,
    onSelectDomain,
    tasks,
    hasAnyTasks,
    hasMoreTasks,
    onCreateTask,
    onSetTaskCompleted,
    onSetTaskProgress,
    domains,
    canCreateDomain,
    onCreateDomain,
    onUpdateDomain,
    onDeleteDomain,
    onReorderDomains,
    hasMoreDomains,
    onLoadMoreDomains,
    loadingMoreDomains,
    domainsOpen,
    setDomainsOpen,
    inAppDraft,
    setInAppDraft,
    settingsSection,
    setSettingsSection,
    domainSheetOpen,
    setDomainSheetOpen,
    editingDomain,
    setEditingDomain,
    deletingDomain,
    setDeletingDomain,
    taskSheetOpen,
    setTaskSheetOpen,
    taskPrefill,
    setTaskPrefill,
    dashboardDate,
    setDashboardDate,
    detailId,
    setDetailId,
    selectedDomain,
    openCreateTask,
    openCreateDomain,
    editDomain,
    selectDomain,
    domainNavigation,
  };
}
