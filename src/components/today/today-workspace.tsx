"use client";

import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { TodaySurface } from "./today-surface";
import { localDateKey } from "@/lib/validation/task";
import type { Id } from "../../../convex/_generated/dataModel";

export function TodayWorkspace({
  todayLabel,
  initialView = "today",
}: {
  todayLabel: string;
  initialView?: "today" | "all";
}) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL)
    return (
      <p className="p-8 text-sm" role="alert">
        The workspace connection is not configured.
      </p>
    );
  return <ConnectedToday todayLabel={todayLabel} initialView={initialView} />;
}

function ConnectedToday({
  todayLabel,
  initialView,
}: {
  todayLabel: string;
  initialView: "today" | "all";
}) {
  const [selection, setSelection] = useState<{
    view: "today" | "all" | "domain";
    domainId?: Id<"domains">;
  }>({ view: initialView });
  const [today, setToday] = useState(() => localDateKey());
  const [currentLabel, setCurrentLabel] = useState(todayLabel);
  useEffect(() => {
    const refreshDate = () => {
      setToday(localDateKey());
      setCurrentLabel(
        new Intl.DateTimeFormat(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(new Date()),
      );
    };
    const initial = setTimeout(refreshDate, 0);
    const timer = setInterval(refreshDate, 60000);
    window.addEventListener("focus", refreshDate);
    return () => {
      clearInterval(timer);
      clearTimeout(initial);
      window.removeEventListener("focus", refreshDate);
    };
  }, []);
  const { isAuthenticated } = useConvexAuth();
  const { results, status, loadMore } = usePaginatedQuery(
    api.domains.list,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 30 },
  );
  const createDomain = useMutation(api.domains.create);
  const updateDomain = useMutation(api.domains.update);
  const removeDomain = useMutation(api.domains.remove);
  const createTask = useMutation(api.tasks.create);
  const setTaskCompleted = useMutation(api.tasks.setCompleted);
  const setTaskProgress = useMutation(api.tasks.setProgress);
  const hasAnyTasks = useQuery(api.tasks.hasAny, isAuthenticated ? {} : "skip");
  const taskQuery = usePaginatedQuery(
    api.tasks.list,
    isAuthenticated && selection.view !== "today"
      ? { ...selection, today }
      : "skip",
    { initialNumItems: 30 },
  );

  const { status: taskStatus, loadMore: loadNextTasks } = taskQuery;
  useEffect(() => {
    if (selection.view === "all" && taskStatus === "CanLoadMore")
      loadNextTasks(60);
  }, [selection.view, taskStatus, loadNextTasks]);

  return (
    <TodaySurface
      todayLabel={currentLabel}
      taskView={selection.view}
      selectedDomainId={selection.domainId}
      onViewChange={(view) => {
        setSelection({ view });
        window.history.replaceState(
          null,
          "",
          view === "all" ? "/dashboard?view=all" : "/dashboard",
        );
      }}
      onSelectDomain={(domain) => {
        setSelection({ view: "domain", domainId: domain._id });
        window.history.replaceState(null, "", "/dashboard");
      }}
      hasAnyTasks={hasAnyTasks}
      tasks={
        !isAuthenticated || taskQuery.status === "LoadingFirstPage"
          ? undefined
          : taskQuery.results
      }
      hasMoreTasks={
        taskQuery.status === "CanLoadMore" || taskQuery.status === "LoadingMore"
      }
      loadingMoreTasks={taskQuery.status === "LoadingMore"}
      onLoadMoreTasks={() => taskQuery.loadMore(30)}
      onCreateTask={async (values) => {
        const id = await createTask({
          ...values,
          domainId: values.domainId as Id<"domains"> | undefined,
        });
        toast.success("Task created.");
        return id;
      }}
      onSetTaskCompleted={(id, completed, subtaskId) =>
        setTaskCompleted({ id, completed, ...(subtaskId ? { subtaskId } : {}) })
      }
      onSetTaskProgress={(id, progress) => setTaskProgress({ id, progress })}
      domains={
        !isAuthenticated || status === "LoadingFirstPage" ? undefined : results
      }
      canCreateDomain={isAuthenticated}
      onCreateDomain={async (values) => {
        const id = await createDomain(values);
        toast.success("Domain created.");
        return id;
      }}
      onUpdateDomain={async (domain, values) => {
        await updateDomain({
          id: domain._id,
          name: values.name,
          purpose: values.purpose,
          color: values.color,
          icon: values.icon,
        });
        toast.success("Domain updated.");
      }}
      onDeleteDomain={async (domain) => {
        const previous = selection;
        if (selection.domainId === domain._id) setSelection({ view: "today" });
        try {
          await removeDomain({ id: domain._id });
        } catch (error) {
          setSelection(previous);
          throw error;
        }
        toast.success("Domain deleted.");
      }}
      hasMoreDomains={status === "CanLoadMore" || status === "LoadingMore"}
      loadingMoreDomains={status === "LoadingMore"}
      onLoadMoreDomains={() => loadMore(30)}
    />
  );
}
