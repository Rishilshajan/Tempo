/**
 * TEMPO-003 - Shared workspace prop contract, navigation and client-only account widgets.
 * Code map: src/components/code-map.md.
 */
"use client";
import { type CreateDomainValues } from "@/components/domains/create-domain-sheet";
import type { DomainSummary } from "@/components/domains/domain-appearance";
import {
  type SetTaskCompleted,
  type SetTaskProgress,
  type TaskRecord,
} from "@/components/tasks/task-list";
import { type CreateTaskValues } from "@/lib/validation/task";
import { CircleCheck, Settings2, Sun } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export const WorkspaceUserButton = dynamic(
  () => import("@clerk/nextjs").then((module) => module.UserButton),
  {
    ssr: false,
    loading: () => (
      <span aria-hidden="true" className="block size-8 rounded-full bg-muted" />
    ),
  },
);
export const WorkspaceAccount = dynamic(
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
export const navigation = [
  { label: "Today", icon: Sun, current: true },
  { label: "My Tasks", icon: CircleCheck, current: false },
];
export const mobileNavigation = [
  { label: "Today", icon: Sun, current: true },
  { label: "Tasks", icon: CircleCheck, current: false },
  { label: "Settings", icon: Settings2, current: false },
];
export type TodaySurfaceProps = {
  todayContent?: ReactNode;
  notificationsEnabled?: boolean;
  todayDate?: string;
  todayLabel: string;
  taskView: "today" | "all" | "domain" | "settings";
  selectedDomainId?: string;
  onViewChange: (view: "today" | "all" | "settings") => void;
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
  onReorderDomains?: (ids: Id<"domains">[]) => Promise<void>;
  onDeleteDomain: (domain: DomainSummary) => Promise<unknown>;
  hasMoreDomains?: boolean;
  onLoadMoreDomains?: () => void;
  loadingMoreDomains?: boolean;
};
