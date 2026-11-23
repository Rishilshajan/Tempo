/**
 * TEMPO-003 - useMyTasksBoard: state and actions owned once per mounted view.
 * Code map: src/components/code-map.md.
 */
"use client";
import {
  filterTasks,
  taskLane,
  type BoardFilters,
  type Lane,
} from "@/lib/kanban-model";
import { dayWindow } from "@/lib/today-model";
import { localDateKey } from "@/lib/validation/task";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  mobileBoardSnapshot,
  shortBoardDate,
  subscribeMobileBoard,
} from "./board-cards";
import { type Props } from "./board-config";
import { detailError } from "./detail-shared";
import { type TaskRecord } from "./task-list";
/**
 * TEMPO-003-F33 - useMyTasksBoard
 * Purpose: Owns existing board filters, drag actions and local view state.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function useMyTasksBoard({
  selectedDomainId,
  onDomainChange,
  onCreateForDate,
  tasks,
  domains,
  incomplete,
  onCreate,
  onOpen,
  onSetCompleted,
  onSetProgress,
}: Props) {
  const [view, setView] = useState("kanban");
  const isMobile = useSyncExternalStore(
    subscribeMobileBoard,
    mobileBoardSnapshot,
    () => false,
  );
  const effectiveView = isMobile && view === "kanban" ? "list" : view;
  const [mobileCollapsed, setMobileCollapsed] = useState<
    Partial<Record<Lane, boolean>>
  >({ progress: true, carried: true, completed: true });
  const [collapsed, setCollapsed] = useState<Partial<Record<Lane, boolean>>>(
    {},
  );
  const [localFilters, setFilters] = useState<BoardFilters>({
    domain: "",
    priority: "all",
    date: "all",
    from: "",
    to: "",
    sort: "manual",
  });
  const filters = {
    ...localFilters,
    domain: selectedDomainId ?? localFilters.domain,
  };
  const currentDomain = domains.find((domain) => domain._id === filters.domain);
  const [older, setOlder] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const move = useMutation(api.kanban.move);
  const reschedule = useMutation(api.tasks.reschedule);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const update = (key: keyof BoardFilters, value: string) => {
    if (key === "domain") onDomainChange?.(value);
    setFilters((previous) => ({ ...previous, [key]: value }));
    setHideCompleted(false);
  };
  const clock = now ?? 0;
  const rows = now === null ? [] : filterTasks(tasks, filters, clock);
  const completedDay =
    filters.date === "custom" && filters.from ? filters.from : undefined;
  const visible = rows.filter((task) => {
    if (task.recurrencePlanned) return false;
    if (task.status !== "completed") return true;
    if (hideCompleted) return false;
    if (older) return true;
    const day = completedDay ?? localDateKey(new Date(clock), task.timezone);
    const window = dayWindow(day, task.timezone, clock);
    return (
      task.completedAt !== undefined &&
      task.completedAt >= window.start &&
      task.completedAt < window.end
    );
  });
  const laneRows = (lane: Lane) =>
    visible.filter((task) => taskLane(task, clock) === lane);
  async function saveMove(
    task: TaskRecord,
    to: Lane,
    beforeId?: Id<"tasks">,
    afterId?: Id<"tasks">,
  ) {
    if (locked.current) return;
    locked.current = true;
    setSaving(true);
    try {
      await move({
        id: task._id,
        from: taskLane(task, clock),
        to,
        beforeId,
        afterId,
      });
    } catch (error) {
      detailError(error);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  function drop(event: DragEndEvent) {
    setDragging(null);
    if (!event.over || event.active.id === event.over.id || saving) return;
    const task = tasks.find((task) => task._id === event.active.id);
    if (!task) return;
    const target = tasks.find((task) => task._id === event.over!.id);
    const lane = target
      ? taskLane(target, clock)
      : (String(event.over.id).replace("lane:", "") as Lane);
    if (lane === "carried") {
      toast.error("Rolled Forward is managed automatically.");
      return;
    }
    const list = laneRows(lane).filter((row) => row._id !== task._id);
    let index = target
      ? list.findIndex((row) => row._id === target._id)
      : list.length;
    if (index < 0) index = list.length;
    if (target && taskLane(task, clock) === lane) {
      const original = laneRows(lane);
      if (
        original.findIndex((row) => row._id === task._id) <
        original.findIndex((row) => row._id === target._id)
      )
        index++;
    }
    setCollapsed((previous) => ({ ...previous, [lane]: false }));
    setMobileCollapsed((previous) => ({ ...previous, [lane]: false }));
    setFilters((previous) => ({ ...previous, sort: "manual" }));
    // Neighbors use persisted order even if a different visual sort was selected.
    if (filters.sort !== "manual") {
      void saveMove(task, lane);
      return;
    }
    void saveMove(task, lane, list[index - 1]?._id, list[index]?._id);
  }
  const selectedDrag = tasks.find((task) => task._id === dragging);
  const activeFilters: {
    key: keyof BoardFilters;
    label: string;
    reset: string;
  }[] = [];
  if (filters.date !== "all")
    activeFilters.push({
      key: "date",
      reset: "all",
      label:
        filters.date === "custom"
          ? `Scheduled: ${filters.from ? shortBoardDate(filters.from) : "Choose date"}`
          : filters.date === "range"
            ? `${filters.from ? shortBoardDate(filters.from) : "Start"} – ${filters.to ? shortBoardDate(filters.to) : "End"}`
            : filters.date.replaceAll("_", " "),
    });
  if (filters.priority !== "all")
    activeFilters.push({
      key: "priority",
      reset: "all",
      label: `Priority: ${filters.priority}`,
    });
  if (filters.dueDate)
    activeFilters.push({
      key: "dueDate",
      reset: "",
      label: `Due: ${shortBoardDate(filters.dueDate)}`,
    });
  if (filters.sort !== "manual")
    activeFilters.push({
      key: "sort",
      reset: "manual",
      label: `Sort: ${filters.sort}`,
    });

  return {
    selectedDomainId,
    onDomainChange,
    onCreateForDate,
    tasks,
    domains,
    incomplete,
    onCreate,
    onOpen,
    onSetCompleted,
    onSetProgress,
    view,
    setView,
    isMobile,
    effectiveView,
    mobileCollapsed,
    setMobileCollapsed,
    collapsed,
    setCollapsed,
    localFilters,
    setFilters,
    filters,
    currentDomain,
    older,
    setOlder,
    filtersOpen,
    setFiltersOpen,
    hideCompleted,
    setHideCompleted,
    dragging,
    setDragging,
    saving,
    setSaving,
    locked,
    move,
    reschedule,
    now,
    setNow,
    sensors,
    update,
    clock,
    rows,
    completedDay,
    visible,
    laneRows,
    saveMove,
    drop,
    selectedDrag,
    activeFilters,
  };
}
