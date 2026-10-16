/**
 * Dummy-data seed for Tempo. Generates richly varied tasks across the next
 * month (plus a few overdue) for every domain + some uncategorized, each with
 * different scenarios: bare / described / sub-tasked, varied statuses, time
 * windows, durations (min & hr incl. multi-day), elastic floors, and rollforward
 * slippage. Deterministic (seeded PRNG) so re-runs are reproducible.
 *
 *   npx tsx src/db/seed.ts            # add ~225 tasks
 *   npx tsx src/db/seed.ts --wipe     # delete all tasks first, then seed
 *
 * Owns everything to the single app account and backfills domains to match.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { isNull } from "drizzle-orm";
import * as schema from "./schema";
import type { NewTask, NewTaskMilestone } from "./schema";

const { tasks, taskMilestones, domains } = schema;
const PER_DOMAIN = 50;
const UNCATEGORIZED = 25;

/* ------------------------------- PRNG ---------------------------------- */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x7e3f01);
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const chance = (p: number) => rng() < p;
const int = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------- dates --------------------------------- */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(days: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}
const TODAY = addDays(0);

/* ---------------------------- content pools ---------------------------- */
const VERBS: Record<string, string[]> = {
  cashcrow: ["Reconcile", "Review", "Rebalance", "Audit", "Forecast", "Draft", "Model", "Settle", "Prepare", "Analyze"],
  levich: ["Finalize", "Send", "Schedule", "Draft", "Review", "Align on", "Approve", "Prepare", "Sync on", "Ship"],
  personal: ["Book", "Call", "Plan", "Renew", "Pay", "Organize", "Research", "Order", "Fix", "Schedule"],
  priminent: ["Fix", "Ship", "Review", "Design", "Refactor", "Test", "Deploy", "Spec", "Investigate", "Migrate"],
  _uncat: ["Follow up on", "Check", "Sort out", "Look into", "Wrap up", "Draft", "Review", "Plan"],
};
const NOUNS: Record<string, string[]> = {
  cashcrow: ["Q3 P&L", "the treasury position", "staking rewards", "the investor update", "the cap table", "burn rate", "the tax provision", "DeFi yields", "the hedge book", "the runway model", "payroll", "the audit trail"],
  levich: ["the board deck", "the vendor contract", "Q4 OKRs", "the hiring plan", "the offsite agenda", "the SOW", "the partner MOU", "the compliance filing", "team 1:1s", "the launch brief", "the pricing memo"],
  personal: ["the dentist appointment", "the flight to Dubai", "gym membership", "the car service", "the apartment lease", "the grocery run", "mom's birthday", "passport renewal", "the insurance claim", "a weekend trip"],
  priminent: ["the auth flow", "the onboarding bug", "the API rate limiter", "dashboard perf", "the mobile layout", "push notifications", "the search index", "the RLS policies", "the webhook retry", "the caching layer"],
  _uncat: ["the inbox", "that intro email", "the receipts", "the shared doc", "last week's notes", "the backlog"],
};
const DESCRIPTIONS = [
  "Context in the shared drive; loop in the team before finalizing.",
  "Blocked until the vendor replies — chase if no response by EOD.",
  "Keep it tight: one page, numbers first.",
  "See the thread from Monday for the latest requirements.",
  "High-stakes — double-check figures against source.",
  "Quick one, but easy to forget. Don't let it slip.",
  "Needs sign-off from finance before it goes out.",
  "Draft exists; just needs a polish and a final read.",
];
const STEP_TITLES = [
  "Outline the approach", "Gather the data", "Draft the first pass", "Review with the team",
  "Pull the numbers", "Build the deck", "QA / sanity check", "Address feedback",
  "Get sign-off", "Send it out", "Write the summary", "Book the slot",
];
const STEP_DETAILS = [
  "", "", "Use last quarter's template.", "Ping Sarah for the latest file.",
  "", "Double-check the totals.", "", "Link the source in the doc.",
];
const TIME_HINTS = ["before noon", "by 2pm", "morning", "after lunch", "end of day", "first thing"];
const STARTS = ["08:30", "09:00", "09:30", "10:00", "11:00", "13:00", "14:00", "15:30", "16:00"];

type DomainRow = { id: string; tag: string };

function titlePool(key: string, n: number): string[] {
  const combos: string[] = [];
  for (const v of VERBS[key]) for (const nn of NOUNS[key]) combos.push(`${v} ${nn}`);
  return shuffle(combos).slice(0, n);
}

function buildTask(userId: string, domainId: string | null, title: string): {
  task: NewTask;
  subtaskCount: number;
} {
  // Status distribution.
  const r = rng();
  let status: NewTask["status"];
  if (r < 0.4) status = "not_started";
  else if (r < 0.55) status = "in_progress";
  else if (r < 0.8) status = "done";
  else status = "rolled_forward";

  // Date by status: overdue/rolled in past-or-today, done in recent past/today,
  // the rest spread across the next 30 days (with a slice landing today).
  let date: string;
  if (status === "rolled_forward") date = iso(TODAY);
  else if (status === "done") date = iso(addDays(-int(0, 6)));
  else if (chance(0.12)) date = iso(addDays(-int(1, 7))); // overdue, still open
  else if (chance(0.2)) date = iso(TODAY);
  else date = iso(addDays(int(1, 30)));

  const importance = pick(["important", "medium", "flexible"] as const);

  // Time window (~40%) OR a loose hint (~20% of the rest).
  let scheduledStart: string | null = null;
  let scheduledEnd: string | null = null;
  let timeHint: string | null = null;
  if (chance(0.4)) {
    scheduledStart = pick(STARTS);
    const [h, m] = scheduledStart.split(":").map(Number);
    const endH = Math.min(h + int(1, 3), 23);
    scheduledEnd = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } else if (chance(0.3)) {
    timeHint = pick(TIME_HINTS);
  }

  // Duration: mostly minutes; ~6% "epic" multi-day work in hours.
  let durationMin: number | null = null;
  if (chance(0.85)) {
    durationMin = chance(0.06)
      ? pick([40, 80, 120, 200]) * 60 // epic: 40h..200h
      : pick([15, 30, 45, 60, 90, 120, 180]);
  }
  const isElastic = chance(0.35);
  const minDurationMin = isElastic ? pick([10, 15, 30]) : null;

  const completedAt = status === "done" ? addDays(-int(0, 6)) : null;
  const rollforwardCount = status === "rolled_forward" ? int(1, 5) : 0;

  const task: NewTask = {
    userId,
    domainId,
    title,
    description: chance(0.5) ? pick(DESCRIPTIONS) : null,
    importance,
    status,
    date,
    scheduledStart,
    scheduledEnd,
    timeHint,
    durationMin,
    minDurationMin,
    isElastic,
    rollforwardCount,
    completedAt,
  };

  // ~45% get 2-6 subtasks; title-only "idle" tasks get none.
  const subtaskCount = chance(0.45) ? int(2, 6) : 0;
  return { task, subtaskCount };
}

function buildSubtasks(
  userId: string,
  taskId: string,
  taskDone: boolean,
  count: number,
): NewTaskMilestone[] {
  const titles = shuffle(STEP_TITLES).slice(0, count);
  return titles.map((title, i) => {
    const hasDate = chance(0.4);
    const date = hasDate ? iso(addDays(int(0, 10))) : null;
    const scheduledTime = chance(0.3) ? pick(STARTS) : null;
    const durationEstMin = chance(0.1) ? pick([2, 3, 4]) * 60 : pick([10, 15, 20, 30, 45]);
    // If the parent is done, all steps done; otherwise a leading prefix done.
    const isCompleted = taskDone || i < Math.floor(rng() * (count + 1) * 0.5);
    return {
      userId,
      taskId,
      title,
      description: chance(0.35) ? pick(STEP_DETAILS) || null : null,
      date,
      scheduledTime,
      durationEstMin,
      isCompleted,
      sortOrder: i,
    } satisfies NewTaskMilestone;
  });
}

/* -------------------------------- run ---------------------------------- */
async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  const wipe = process.argv.includes("--wipe");

  const [{ id: userId }] = await client`select id from auth.users order by created_at limit 1`;
  if (!userId) throw new Error("No auth user found — create an account first.");

  const domainRows = (await db
    .select({ id: domains.id, tag: domains.tag })
    .from(domains)) as DomainRow[];

  if (wipe) {
    await db.delete(tasks);
    console.log("Wiped all existing tasks.");
  }

  // Backfill domains to the account so ownership is consistent.
  await db.update(domains).set({ userId }).where(isNull(domains.userId));

  // Build the full task list: 50 per domain + uncategorized.
  const plan: { task: NewTask; subtaskCount: number }[] = [];
  for (const d of domainRows) {
    for (const t of titlePool(d.tag, PER_DOMAIN)) {
      plan.push(buildTask(userId, d.id, t));
    }
  }
  for (const t of titlePool("_uncat", UNCATEGORIZED)) {
    plan.push(buildTask(userId, null, t));
  }

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(tasks)
      .values(plan.map((p) => p.task))
      .returning({ id: tasks.id, status: tasks.status });

    const milestones: NewTaskMilestone[] = [];
    inserted.forEach((row, i) => {
      const { subtaskCount } = plan[i];
      if (subtaskCount > 0) {
        milestones.push(
          ...buildSubtasks(userId, row.id, row.status === "done", subtaskCount),
        );
      }
    });
    if (milestones.length) await tx.insert(taskMilestones).values(milestones);

    // Summary
    const byStatus = inserted.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    console.log("Seeded tasks:", inserted.length);
    console.table(byStatus);
    console.log("Subtasks:", milestones.length);
  });

  await client.end();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
