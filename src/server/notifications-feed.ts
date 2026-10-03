import "server-only";

import { getTasks, todayISO } from "@/server/queries";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: "urgent" | "rolled" | "info";
};

/**
 * In-app notification feed shown in the header bell. Derived live from task
 * state (no storage) - the same signals the briefing surfaces, as a glanceable
 * list: repeat-slippage escalations, rolled-forward work, and today's load.
 */
export async function getInAppNotifications(): Promise<AppNotification[]> {
  const all = await getTasks();
  const active = all.filter((t) => t.status !== "done");
  const items: AppNotification[] = [];

  // Repeat offenders: pushed 3+ times - needs a real decision.
  for (const t of active.filter((t) => t.rollforwardCount >= 3)) {
    items.push({
      id: `esc-${t.id}`,
      title: "Still real?",
      body: `"${t.title}" has rolled forward ${t.rollforwardCount}×.`,
      href: "/rolled",
      tone: "urgent",
    });
  }

  // Rolled-forward summary.
  const rolled = active.filter((t) => t.status === "rolled_forward");
  if (rolled.length) {
    items.push({
      id: "rolled-summary",
      title: `${rolled.length} task${rolled.length > 1 ? "s" : ""} rolled forward`,
      body: "Unfinished past-due work moved to today.",
      href: "/rolled",
      tone: "rolled",
    });
  }

  // Today's load.
  const today = todayISO();
  const todays = active.filter((t) => t.date === today);
  if (todays.length) {
    items.push({
      id: "today-load",
      title: `${todays.length} task${todays.length > 1 ? "s" : ""} on deck today`,
      body: "Open Today to start your briefing.",
      href: "/today",
      tone: "info",
    });
  }

  return items;
}
