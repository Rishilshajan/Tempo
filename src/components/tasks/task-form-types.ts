/**
 * TEMPO-005 - Shared Props and Step type contracts.
 * Used by: CreateTaskSheet; useTaskFormState; submitTaskForm.
 * Code map: src/components/code-map.md.
 */
import { type DomainSummary } from "@/components/domains/domain-appearance";
import { type CreateTaskValues } from "@/lib/validation/task";
import type { TaskRecord } from "./task-list";
export type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
  domains: DomainSummary[] | undefined;
  initialDomainId?: string;
  initialDate?: string;
  initialStartAt?: number;
  canSubmit: boolean;
  onCreate: (
    values: CreateTaskValues,
    stepKeys?: string[],
    editScope?: "this" | "future",
  ) => Promise<unknown>;
  editingTask?: TaskRecord;
  hasMoreDomains?: boolean;
  loadingMoreDomains?: boolean;
  onLoadMoreDomains?: () => void;
};
export type Step = { key: string; title: string; dueDate: string };
