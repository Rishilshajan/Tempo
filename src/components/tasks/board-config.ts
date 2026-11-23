import { type DomainSummary } from "@/components/domains/domain-appearance";
import { type Lane } from "@/lib/kanban-model";
import { CircleCheck, History, ListChecks, Zap } from "lucide-react";
import {
  type SetTaskCompleted,
  type SetTaskProgress,
  type TaskRecord,
} from "./task-list";
export const columns: {
  id: Lane;
  title: string;
  empty: string;
  icon: typeof ListChecks;
  tone: string;
}[] = [
  {
    id: "planned",
    title: "Planned Queue",
    empty: "No planned tasks.",
    icon: ListChecks,
    tone: "bg-secondary",
  },
  {
    id: "progress",
    title: "In Progress",
    empty: "Nothing in progress.",
    icon: Zap,
    tone: "bg-emerald-100 text-emerald-900",
  },
  {
    id: "carried",
    title: "Rolled Forward",
    empty: "Nothing carried forward.",
    icon: History,
    tone: "bg-violet-100 text-violet-900",
  },
  {
    id: "completed",
    title: "Completed",
    empty: "No tasks completed today.",
    icon: CircleCheck,
    tone: "bg-primary/10 text-primary",
  },
];
export type Props = {
  selectedDomainId?: string;
  onDomainChange?: (domainId: string) => void;
  tasks: TaskRecord[];
  domains: DomainSummary[];
  incomplete?: boolean;
  onCreate: () => void;
  onCreateForDate?: (date: string, startAt?: number) => void;
  onOpen: (task: TaskRecord) => void;
  onSetCompleted: SetTaskCompleted;
  onSetProgress: SetTaskProgress;
};
