/**
 * TEMPO-003 — Type-only contracts shared by the existing dashboard components.
 * Purpose: Keep timeline creation and daily callbacks independent of render modules.
 * Used by: TodayDashboard and TodaySurface.
 * Runtime: None; all imports and exports in this file are types.
 * Code map: src/components/code-map.md; behavior audit: ./README.md.
 */
import type { DomainSummary } from "@/components/domains/domain-appearance";
import type {
  SetTaskCompleted,
  SetTaskProgress,
  TaskRecord,
} from "@/components/tasks/task-list";

export type TaskPrefill = { date: string; startAt?: number };

export type TodayDashboardProps = {
  domains: DomainSummary[];
  onCreateTask: (prefill: TaskPrefill) => void;
  onOpenTask: (task: TaskRecord) => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
  onRescheduleTask?: (
    task: TaskRecord,
    schedule: TaskRecord["schedule"],
  ) => Promise<unknown>;
  onPlanTask?: (task: TaskRecord) => Promise<unknown>;
  onSelectedDateChange?: (date: string) => void;
};

