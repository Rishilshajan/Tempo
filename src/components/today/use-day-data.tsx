/**
 * TEMPO-003 - useDayData: state and actions owned once per mounted view.
 * Code map: src/components/code-map.md.
 */
"use client";
import { dayWindow } from "@/lib/today-model";
import { localDateKey } from "@/lib/validation/task";
import { useUser } from "@clerk/nextjs";
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "./day-errors";
import type { TodayDashboardProps } from "./today-types";
/**
 * TEMPO-003-F17 - useDayData
 * Purpose: Owns one set of live day feeds, local clock, pagination and focus actions.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function useDayData(props: TodayDashboardProps) {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const [clock, setClock] = useState<{ now: number; timezone: string } | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () =>
      setClock({
        now: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const today = clock ? localDateKey(new Date(clock.now), clock.timezone) : "";
  // Follow midnight automatically, while preserving a deliberately selected future day.
  const date = selected ?? today;
  const onSelectedDateChange = props.onSelectedDateChange;
  useEffect(() => {
    if (date) onSelectedDateChange?.(date);
  }, [date, onSelectedDateChange]);
  const timezone = clock?.timezone;
  const args = useMemo(
    () => (isAuthenticated && timezone && date ? { date, timezone } : null),
    [isAuthenticated, timezone, date],
  );
  const backlog = usePaginatedQuery(
    api.dashboard.feed,
    args && date === today ? { ...args, kind: "open" } : "skip",
    { initialNumItems: 50 },
  );
  const scheduledSteps = usePaginatedQuery(
    api.dashboard.subtaskFeed,
    args ? { date, kind: "scheduled" } : "skip",
    { initialNumItems: 50 },
  );
  const dueSteps = usePaginatedQuery(
    api.dashboard.subtaskFeed,
    args ? { date, kind: "due" } : "skip",
    { initialNumItems: 50 },
  );
  const steps = [...scheduledSteps.results, ...dueSteps.results];
  const dated = usePaginatedQuery(
    api.dashboard.feed,
    args ? { ...args, kind: "dated" } : "skip",
    { initialNumItems: 50 },
  );
  const fixed = usePaginatedQuery(
    api.dashboard.feed,
    args ? { ...args, kind: "fixed" } : "skip",
    { initialNumItems: 50 },
  );
  const completed = usePaginatedQuery(
    api.dashboard.feed,
    args ? { ...args, kind: "completed" } : "skip",
    { initialNumItems: 50 },
  );
  const focus = useQuery(
    api.dashboard.focus,
    args ? { ...args, today } : "skip",
  );
  const setFocus = useMutation(api.dashboard.setFocus);
  const planTask = useMutation(api.kanban.move);
  const rescheduleTask = useMutation(api.tasks.reschedule);
  const [focusSaving, setFocusSaving] = useState(false);
  useEffect(() => {
    if (args && date === today && backlog.status === "CanLoadMore")
      backlog.loadMore(50);
  }, [args, date, today, backlog]);
  useEffect(() => {
    if (args && dated.status === "CanLoadMore") dated.loadMore(50);
  }, [args, dated]);
  useEffect(() => {
    if (args && fixed.status === "CanLoadMore") fixed.loadMore(50);
  }, [args, fixed]);
  useEffect(() => {
    if (args && completed.status === "CanLoadMore") completed.loadMore(50);
  }, [args, completed]);
  const ready =
    !!args &&
    (date !== today || backlog.status !== "LoadingFirstPage") &&
    [dated, fixed, completed].every(
      (feed) => feed.status !== "LoadingFirstPage",
    ) &&
    focus !== undefined;
  const day = clock && date ? dayWindow(date, clock.timezone, clock.now) : null;
  async function chooseFocus(id: string) {
    if (!args || focusSaving) return;
    setFocusSaving(true);
    try {
      await setFocus({
        ...args,
        taskId: id === "none" ? null : (id as Id<"tasks">),
      });
      toast.success(
        id === "none" ? "Focus cleared." : "Focus selected for this day.",
      );
    } catch (cause) {
      toast.error(
        errorMessage(cause, "Couldn’t update your focus. Please try again."),
      );
    } finally {
      setFocusSaving(false);
    }
  }

  return {
    props,
    isAuthenticated,
    user,
    clock,
    setClock,
    selected,
    setSelected,
    today,
    date,
    onSelectedDateChange,
    timezone,
    args,
    backlog,
    scheduledSteps,
    dueSteps,
    steps,
    dated,
    fixed,
    completed,
    focus,
    setFocus,
    planTask,
    rescheduleTask,
    focusSaving,
    setFocusSaving,
    ready,
    day,
    chooseFocus,
  };
}
