import type { Task } from "@/db/schema";

export type Briefing = {
  windowLabel: string;
  summary: string;
  top: Task | null;
  ordered: Task[];
  warnings: string[];
  escalations: Task[];
};

const WINDOW_LABEL: Record<string, string> = {
  morning: "Morning Focus",
  afternoon: "Afternoon Flow",
  evening: "Evening Wind-down",
  flexible: "Flexible Day",
};

// Matches common "morning" time hints: morning/noon/first thing/early,
// "before noon|10|11|12", "by 9|10|11|12", and "8am|9 am|9:30am|11am".
const IMPORTANCE_RANK: Record<Task["importance"], number> = {
  important: 2,
  medium: 1,
  flexible: 0,
};

const MORNING_RE =
  /morning|\bnoon\b|first thing|early|before\s+(?:noon|1[0-2])|by\s+(?:[89]|1[0-2])\b|\b(?:[6-9]|1[0-2])(?::\d{2})?\s*am\b/i;

/**
 * Deterministic briefing. Phase 4 will replace `summary` with an LLM-phrased
 * version; the structured ordering, warnings and escalations stay as-is.
 */
export function buildBriefing(
  tasks: Task[],
  opts: { productivityWindow: string },
): Briefing {
  const active = tasks.filter((t) => t.status !== "done");

  const ordered = [...active].sort((a, b) => {
    const imp = IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance];
    if (imp) return imp;
    const inf = (b.inferredImportant ? 1 : 0) - (a.inferredImportant ? 1 : 0);
    if (inf) return inf;
    const th = (b.timeHint ? 1 : 0) - (a.timeHint ? 1 : 0);
    if (th) return th;
    const dur = (a.durationMin ?? 9999) - (b.durationMin ?? 9999);
    if (dur) return dur;
    return a.id.localeCompare(b.id); // stable, deterministic tie-break
  });

  const top = ordered[0] ?? null;

  const warnings: string[] = [];
  const morning = active.filter((t) => MORNING_RE.test(t.timeHint ?? ""));
  if (morning.length >= 3) {
    warnings.push(
      `${morning.length} tasks target the morning - they may not all fit before noon.`,
    );
  }

  const escalations = active.filter((t) => t.rollforwardCount >= 3);
  for (const t of escalations) {
    warnings.push(
      `"${t.title}" has rolled forward ${t.rollforwardCount}x - still real, or drop it?`,
    );
  }

  const totalMin = active.reduce((s, t) => s + (t.durationMin ?? 0), 0);
  const load =
    totalMin >= 60
      ? ` (~${(totalMin / 60).toFixed(1)}h)`
      : totalMin
        ? ` (~${totalMin}m)`
        : "";

  const summary = active.length
    ? `${active.length} task${active.length > 1 ? "s" : ""} on deck${load}${
        top ? `. Top priority: ${top.title}.` : "."
      }`
    : "Nothing scheduled - enjoy the open day.";

  return {
    windowLabel: WINDOW_LABEL[opts.productivityWindow] ?? "Your Day",
    summary,
    top,
    ordered,
    warnings,
    escalations,
  };
}
