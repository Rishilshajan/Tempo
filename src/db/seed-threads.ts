/**
 * Seed ~50 dummy task threads (chains of related tasks that continue one line
 * of work). Each thread has 2-5 tasks linked by parent_task_id, with a realistic
 * progression: earlier steps completed (past dates), a current step, and
 * upcoming ones. Some threads are fully closed. Owned by the app account.
 *
 *   npx tsx src/db/seed-threads.ts            # add 50 threads
 *   npx tsx src/db/seed-threads.ts --wipe     # delete existing threads first
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type { NewTask } from "./schema";

const { tasks, threads, domains } = schema;
const THREAD_COUNT = 50;

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
const rng = mulberry32(0xc0ffee);
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

/* ---------------------------- scenarios -------------------------------- */
const SUBJECTS = [
  "Acme", "Vertex", "Nimbus", "Orion", "Helio", "Quanta", "Atlas", "Zephyr",
  "Lumen", "Cobalt", "Northwind", "Pioneer", "Apex", "Beacon", "Solstice",
  "Cascade", "Meridian", "Onyx", "Riverstone", "Harbor",
];

type Scenario = {
  thread: (x: string) => string;
  steps: (x: string) => string[];
  domainTag: string | null;
};
const SCENARIOS: Scenario[] = [
  {
    thread: (x) => `${x} client relationship`,
    steps: (x) => [`Intro call – ${x}`, `Discovery meeting – ${x}`, `Send proposal to ${x}`, `Follow-up meeting – ${x}`, `Negotiate terms – ${x}`, `Close the deal – ${x}`],
    domainTag: "levich",
  },
  {
    thread: (x) => `${x} Series A raise`,
    steps: (x) => [`First investor call – ${x}`, `Share the deck – ${x}`, `Partner meeting – ${x}`, `Due diligence – ${x}`, `Term sheet – ${x}`, `Close the round – ${x}`],
    domainTag: "cashcrow",
  },
  {
    thread: (x) => `${x} integration`,
    steps: (x) => [`Scope the integration – ${x}`, `Design the API contract – ${x}`, `Build the connector – ${x}`, `QA with ${x}`, `Ship to production – ${x}`],
    domainTag: "priminent",
  },
  {
    thread: (x) => `${x} hiring loop`,
    steps: (x) => [`Screen ${x}`, `Tech interview – ${x}`, `Onsite – ${x}`, `Debrief – ${x}`, `Send offer – ${x}`],
    domainTag: "levich",
  },
  {
    thread: (x) => `${x} contract renewal`,
    steps: (x) => [`Review usage – ${x}`, `Draft the renewal – ${x}`, `Negotiate pricing – ${x}`, `Sign & renew – ${x}`],
    domainTag: "cashcrow",
  },
  {
    thread: (x) => `${x} rollout`,
    steps: (x) => [`Plan the rollout – ${x}`, `Pilot with ${x}`, `Collect feedback – ${x}`, `Full rollout – ${x}`, `Rollout retro – ${x}`],
    domainTag: "priminent",
  },
  {
    thread: (x) => `${x} trip`,
    steps: (x) => [`Research the ${x} trip`, `Book flights – ${x}`, `Book the hotel – ${x}`, `Plan the itinerary – ${x}`, `Pack & prep – ${x}`],
    domainTag: "personal",
  },
];

const DESCRIPTIONS = [
  "Context in the thread above — pick up where the last one left off.",
  "Went well; moving to the next step.",
  "Keep momentum — don't let this stall.",
  "Notes from the previous meeting attached.",
  "",
  "",
];
const STARTS = ["09:00", "09:30", "10:00", "11:00", "13:00", "14:30", "15:30"];

/* -------------------------------- run ---------------------------------- */
async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  const wipe = process.argv.includes("--wipe");

  const [{ id: userId }] =
    await client`select id from auth.users order by created_at limit 1`;
  if (!userId) throw new Error("No auth user found — create an account first.");

  const domainRows = (await db
    .select({ id: domains.id, tag: domains.tag })
    .from(domains)) as { id: string; tag: string }[];
  const domainByTag = new Map(domainRows.map((d) => [d.tag, d.id]));

  if (wipe) {
    // Detach tasks first (FK set null), then clear threads.
    await client`update tasks set thread_id = null, parent_task_id = null where thread_id is not null`;
    await db.delete(threads);
    console.log("Wiped existing threads.");
  }

  // Unique (subject, scenario) combos.
  const combos: { subject: string; scenario: Scenario }[] = [];
  for (const subject of SUBJECTS)
    for (const scenario of SCENARIOS) combos.push({ subject, scenario });
  const chosen = shuffle(combos).slice(0, THREAD_COUNT);

  let threadsMade = 0;
  let tasksMade = 0;

  await db.transaction(async (tx) => {
    for (const { subject, scenario } of chosen) {
      const allSteps = scenario.steps(subject);
      const n = Math.min(allSteps.length, int(2, 5));
      const steps = allSteps.slice(0, n);
      const doneCount = int(1, n); // 1..n done; n => closed thread
      const closed = doneCount === n;
      const domainId = scenario.domainTag
        ? (domainByTag.get(scenario.domainTag) ?? null)
        : null;

      const [thread] = await tx
        .insert(threads)
        .values({
          userId,
          title: scenario.thread(subject),
          status: closed ? "closed" : "active",
        })
        .returning({ id: threads.id });
      threadsMade++;

      let parentId: string | null = null;
      const baseMs = addDays(-int(8, 24)).getTime();
      for (let i = 0; i < n; i++) {
        const done = i < doneCount;
        const current = i === doneCount; // first not-done step
        // Dates progress across the chain; done in the past, upcoming ahead.
        const date = done
          ? iso(addDays(-int(1, 18)))
          : current
            ? iso(addDays(int(0, 2)))
            : iso(addDays(int(3, 20)));
        const hasWindow = chance(0.4);
        const start = hasWindow ? pick(STARTS) : null;
        const end = start
          ? (() => {
              const [h, m] = start.split(":").map(Number);
              return `${String(Math.min(h + int(1, 2), 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            })()
          : null;

        const task: NewTask = {
          userId,
          threadId: thread.id,
          parentTaskId: parentId,
          domainId,
          title: steps[i],
          description: chance(0.5) ? pick(DESCRIPTIONS) || null : null,
          importance: pick(["important", "medium", "flexible"] as const),
          status: done ? "done" : current ? pick(["in_progress", "not_started"] as const) : "not_started",
          date,
          scheduledStart: start,
          scheduledEnd: end,
          durationMin: chance(0.8) ? pick([30, 45, 60, 90]) : null,
          isElastic: false,
          completedAt: done ? addDays(-int(1, 18)) : null,
          // Stagger createdAt so the thread panel orders steps correctly.
          createdAt: new Date(baseMs + i * 60_000),
        };

        const [row] = await tx.insert(tasks).values(task).returning({ id: tasks.id });
        parentId = row.id;
        tasksMade++;
      }
    }
  });

  console.log(`Seeded ${threadsMade} threads, ${tasksMade} tasks.`);
  await client.end();
}

main().catch((e) => {
  console.error("Thread seed failed:", e);
  process.exit(1);
});
