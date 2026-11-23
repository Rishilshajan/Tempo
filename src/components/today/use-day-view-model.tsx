/**
 * TEMPO-003 - useDayViewModel: state and actions owned once per mounted view.
 * Code map: src/components/code-map.md.
 */
"use client";
import { DomainLabel } from "@/components/domains/domain-appearance";
import type { TaskRecord } from "@/components/tasks/task-list";
import { isCarried, summarizeDay, type DayWindow } from "@/lib/today-model";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { errorMessage } from "./day-errors";
import type { TodayDashboardProps } from "./today-types";
/**
 * TEMPO-003-F18 - useDayViewModel
 * Purpose: Owns daily filtering, summary calculations and local presentation state.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function useDayViewModel({
  tasks,
  day,
  now,
  name,
  focus,
  focusSaving,
  onFocus,
  navigation,
  subtasks,
  loadingMore = false,
  ...props
}: TodayDashboardProps & {
  tasks: TaskRecord[];
  day: DayWindow;
  now: number;
  name?: string;
  focus: TaskRecord | null;
  focusSaving: boolean;
  onFocus: (id: string) => void;
  navigation?: ReactNode;
  subtasks?: ReactNode;
  loadingMore?: boolean;
}) {
  const [requestedDomain, setDomainFilter] = useState("all");
  const domainFilter =
    requestedDomain === "all" ||
    requestedDomain === "uncategorized" ||
    tasks.some((task) => task.domainId === requestedDomain)
      ? requestedDomain
      : "all";
  const allSummary = summarizeDay(tasks, day);
  const scopedTasks = tasks.filter(
    (task) =>
      domainFilter === "all" ||
      (domainFilter === "uncategorized"
        ? !task.domain
        : task.domainId === domainFilter),
  );
  const summary = summarizeDay(scopedTasks, day);
  const [focusExpanded, setFocusExpanded] = useState(true);
  const [mobileTab, setMobileTab] = useState<"tasks" | "schedule">("tasks");
  const [group, setGroup] = useState("all");
  const prioritiesHeading = useRef<HTMLHeadingElement>(null);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const today = day.date === day.today;
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: day.timezone,
  }).format(day.start);
  // Build the filter from all loaded task domains, including domains beyond the sidebar's first page.
  const taskDomains = new Map(
    allSummary.tasks.flatMap((task) =>
      task.domainId && task.domain
        ? [[task.domainId, task.domain] as const]
        : [],
    ),
  );
  const options = [
    { value: "all", label: "All domains" },
    { value: "uncategorized", label: "Uncategorized" },
    ...[...taskDomains]
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, domain]) => ({
        value: id,
        label: <DomainLabel {...domain} />,
      })),
  ];
  const effectiveDomainFilter = options.some(
    (option) => option.value === domainFilter,
  )
    ? domainFilter
    : "all";
  const listedTasks =
    group === "carried"
      ? summary.carried
      : group === "in_progress"
        ? summary.active.filter((task) => task.progress === "in_progress")
        : group === "fixed"
          ? [...summary.fixed].sort((a, b) =>
              a.schedule.type === "fixed" && b.schedule.type === "fixed"
                ? a.schedule.startAt - b.schedule.startAt
                : 0,
            )
          : summary.active.filter((task) => !isCarried(task, day));
  const hasTaskFilters =
    allSummary.active.length > 0 ||
    allSummary.fixed.length > 0 ||
    domainFilter !== "all";
  const noMatches =
    allSummary.tasks.length > 0 &&
    (effectiveDomainFilter !== "all" || group !== "all");
  const filtered = listedTasks.filter(
    (task) =>
      (effectiveDomainFilter === "all" ||
      effectiveDomainFilter === "uncategorized"
        ? effectiveDomainFilter === "all" || !task.domain
        : task.domainId === effectiveDomainFilter) &&
      (group === "all" ||
        group === "fixed" ||
        (group === "in_progress" && task.progress === "in_progress") ||
        (group === "carried" && isCarried(task, day)) ||
        (group === "flexible" && task.schedule.type === "flexible")),
  );
  const activeFocus =
    (focus &&
      (domainFilter === "all" ||
        (domainFilter === "uncategorized"
          ? !focus.domain
          : focus.domainId === domainFilter)) &&
      (summary.tasks.find((task) => task._id === focus._id) ?? focus)) ||
    null;
  async function complete(task: TaskRecord) {
    if (pending.has(task._id)) return;
    setPending((previous) => new Set(previous).add(task._id));
    try {
      const next = await props.onSetCompleted(
        task._id,
        task.status !== "completed",
      );
      toast.success(
        typeof next === "string"
          ? "Task completed. Next recurring task created."
          : task.status === "completed"
            ? "Task reopened."
            : "Task completed.",
      );
    } catch (cause) {
      toast.error(
        errorMessage(cause, "Couldn’t update this task. Please try again."),
      );
    } finally {
      setPending((previous) => {
        const next = new Set(previous);
        next.delete(task._id);
        return next;
      });
    }
  }
  const total = summary.totalMinutes;
  // Use the selected day's device timezone and the existing Clerk first-name prop.
  const localHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: day.timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  const salutation =
    localHour < 12
      ? "Good morning"
      : localHour < 17
        ? "Good afternoon"
        : "Good evening";
  const firstName = name?.trim().split(/\s+/)[0];
  const greeting = today
    ? salutation + (firstName ? ", " + firstName : "")
    : "Your day";

  return {
    tasks,
    day,
    now,
    name,
    focus,
    focusSaving,
    onFocus,
    navigation,
    subtasks,
    loadingMore,
    props,
    requestedDomain,
    setDomainFilter,
    domainFilter,
    allSummary,
    scopedTasks,
    summary,
    focusExpanded,
    setFocusExpanded,
    mobileTab,
    setMobileTab,
    group,
    setGroup,
    prioritiesHeading,
    pending,
    setPending,
    today,
    dateLabel,
    taskDomains,
    options,
    effectiveDomainFilter,
    listedTasks,
    hasTaskFilters,
    noMatches,
    filtered,
    activeFocus,
    complete,
    total,
    localHour,
    salutation,
    firstName,
    greeting,
  };
}
