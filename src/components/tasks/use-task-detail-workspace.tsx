/**
 * TEMPO-003 - useTaskDetailWorkspace: state and actions owned once per mounted view.
 * Code map: src/components/code-map.md.
 */
"use client";
import { useOverlayBack } from "@/hooks/use-overlay-back";
import { localDateKey } from "@/lib/validation/task";
import { useMutation } from "convex/react";
import {
  Activity,
  GitBranch,
  ListChecks,
  NotebookPen,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { detailError } from "./detail-shared";
import type {
  SetTaskCompleted,
  SetTaskProgress,
  TaskRecord,
} from "./task-list";

/**
 * TEMPO-003-F42 - useTaskDetailWorkspace
 * Purpose: Owns existing details tabs, overlay state and mutation actions.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function useTaskDetailWorkspace({
  task,
  onSetCompleted,
  onSetProgress,
  onOpenTask,
  onBack,
  onDeleted,
}: {
  task: TaskRecord;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
  onOpenTask: (id: Id<"tasks">) => void;
  onBack?: () => void;
  onDeleted: () => void;
}) {
  const [tab, setTab] = useState("subtasks");
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  useOverlayBack(
    mobileSectionOpen,
    () => {
      setMobileSectionOpen(false);
      return true;
    },
    true,
  );
  const mobileSectionId = useId();
  const mobileBack = useRef<HTMLButtonElement>(null);
  const sections = [
    {
      value: "subtasks",
      label: "Subtasks",
      icon: ListChecks,
      count: `${task.subtasks.filter((step) => step.completedAt !== undefined).length}/${task.subtasks.length}`,
    },
    {
      value: "thread",
      label: "Threads",
      icon: GitBranch,
      count: task.threadCount || undefined,
    },
    { value: "activity", label: "Activity", icon: Activity, count: undefined },
    {
      value: "notes",
      label: "Notes",
      icon: NotebookPen,
      count: task.notesCount || undefined,
    },
  ];
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const remove = useMutation(api.tasks.remove);
  const reschedule = useMutation(api.tasks.reschedule);
  const completedSteps = task.subtasks.filter(
    (step) => step.completedAt !== undefined,
  ).length;
  const fixed = task.schedule.type === "fixed" ? task.schedule : null;
  const today = localDateKey(new Date(), task.timezone);
  const subtaskCount = task.subtasks.length;
  const progress =
    task.status === "completed"
      ? 100
      : task.progress === "in_progress"
        ? 20 +
          (subtaskCount ? Math.round((60 * completedSteps) / subtaskCount) : 0)
        : 0;
  const scheduleText = fixed
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: task.timezone,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatRange(fixed.startAt, fixed.endAt)
    : "Flexible schedule";
  async function completeTask() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await onSetCompleted(task._id, task.status !== "completed");
      toast.success(
        task.status === "completed" ? "Task reopened." : "Task completed.",
      );
      if (typeof next === "string")
        toast.success("Next recurring task created.");
    } catch (error) {
      detailError(error);
    } finally {
      setBusy(false);
    }
  }

  return { task, onSetCompleted, onSetProgress, onOpenTask, onBack, onDeleted, tab, setTab, mobileSectionOpen, setMobileSectionOpen, mobileSectionId, mobileBack, sections, dialog, setDialog, busy, setBusy, remove, reschedule, completedSteps, fixed, today, subtaskCount, progress, scheduleText, completeTask };
}
