import type { Task } from "@/db/schema";

export type TaskStatus = Task["status"];

/** Linear flow used by the Start/Complete move buttons. */
export const STATUS_FLOW: TaskStatus[] = [
  "not_started",
  "in_progress",
  "done",
];

/** Order of Board columns (includes rolled-forward). */
export const BOARD_COLUMNS: TaskStatus[] = [
  "not_started",
  "in_progress",
  "done",
  "rolled_forward",
];

export const STATUS_META: Record<
  TaskStatus,
  { label: string; dot: string; tint: string }
> = {
  not_started: { label: "Not Started", dot: "bg-muted-foreground/50", tint: "bg-muted" },
  in_progress: { label: "In Progress", dot: "bg-medium", tint: "bg-medium/15" },
  done: { label: "Done", dot: "bg-ontrack", tint: "bg-ontrack/15" },
  rolled_forward: { label: "Rolled Forward", dot: "bg-rolledforward", tint: "bg-rolledforward/15" },
};

export function nextStatus(s: TaskStatus): TaskStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  if (i === -1 || i >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1];
}

export function prevStatus(s: TaskStatus): TaskStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  if (i <= 0) return null;
  return STATUS_FLOW[i - 1];
}

export function formatDuration(min?: number | null): string | null {
  if (!min) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Preset swatches offered when creating a domain (Sage Focus family). */
export const DOMAIN_COLORS = [
  "#4C9A78",
  "#7BC96F",
  "#5DB87E",
  "#F2B24C",
  "#F0705A",
  "#7C87D6",
  "#3D9A9A",
  "#6D9DC5",
] as const;

export const DOMAIN_EMOJIS = ["🚀", "💼", "🏛️", "🌿", "🧪", "📁", "💡", "🎯"] as const;
