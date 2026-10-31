import assert from "node:assert/strict";
import { build } from "esbuild";
async function load(path) {
  const result = await build({
    entryPoints: [path],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
  );
}
const { rollForwardPatch } = await load("src/lib/roll-forward.ts");
const { processBatch } = await load("convex/rollForward.ts");
const { belongsToDay, isCarried, dayWindow } = await load(
  "src/lib/today-model.ts",
);
const now = Date.parse("2026-11-01T00:05:00Z");
const base = {
  _id: "a",
  status: "open",
  workDate: "2026-10-30",
  timezone: "UTC",
  schedule: { type: "flexible", dueDate: "2026-10-30" },
  progress: "in_progress",
  subtasks: [],
};
const patch = rollForwardPatch(base, now);
assert.equal(patch.workDate, "2026-11-01");
assert.equal(patch.rollForwardCount, 2);
const rolled = { ...base, ...patch };
assert.equal(rollForwardPatch(rolled, now), null);
assert.equal(rollForwardPatch(rolled, now - 86400000), null);
assert.equal(rollForwardPatch({ ...base, status: "completed" }, now), null);
assert.equal(
  rollForwardPatch(
    { ...base, workDate: "", schedule: { type: "flexible" } },
    now,
  ),
  null,
);
assert.equal(rollForwardPatch({ ...base, workDate: "2026-11-02" }, now), null);
assert.equal(
  rollForwardPatch(
    { ...base, timezone: "America/Los_Angeles", workDate: "2026-10-31" },
    now,
  ),
  null,
);
assert.equal(
  rollForwardPatch(
    { ...base, timezone: "Asia/Kolkata", workDate: "2026-10-31" },
    now,
  ).workDate,
  "2026-11-01",
);
const overnight = {
  ...base,
  workDate: "2026-10-31",
  schedule: {
    type: "fixed",
    startAt: Date.parse("2026-10-31T23:00Z"),
    endAt: Date.parse("2026-11-01T01:00Z"),
  },
};
assert.equal(rollForwardPatch(overnight, now), null);
assert.equal(rollForwardPatch(overnight, now + 86400000).rollForwardCount, 1);
const midnight = {
  ...overnight,
  schedule: { ...overnight.schedule, endAt: Date.parse("2026-11-01T00:00Z") },
};
assert.equal(rollForwardPatch(midnight, now).rollForwardCount, 1);
assert.equal(isCarried(rolled, dayWindow("2026-11-01", "UTC", now)), true);
assert.equal(belongsToDay(rolled, dayWindow("2026-11-01", "UTC", now)), true);
assert.equal(
  isCarried(
    { ...rolled, continuedOn: "2026-11-01" },
    dayWindow("2026-11-01", "UTC", now),
  ),
  false,
);
const records = new Map(
  Array.from({ length: 205 }, (_, i) => [
    String(i),
    { ...base, _id: String(i) },
  ]),
);
const events = [],
  jobs = [];
const ctx = {
  db: {
    query: () => ({
      withIndex: () => ({
        paginate: async ({ cursor, numItems }) => {
          const start = Number(cursor ?? 0),
            all = [...records.values()].filter((t) => t.status === "open");
          return {
            page: all.slice(start, start + numItems),
            isDone: start + numItems >= all.length,
            continueCursor: String(start + numItems),
          };
        },
      }),
    }),
    patch: async (id, data) => Object.assign(records.get(id), data),
    insert: async (table, data) => {
      assert.equal(table, "activity");
      events.push(data);
    },
  },
  scheduler: { runAfter: async (_delay, _fn, args) => jobs.push(args) },
};
assert.equal((await processBatch._handler(ctx, { runAt: now })).examined, 100);
while (jobs.length) await processBatch._handler(ctx, jobs.shift());
assert.equal(events.length, 205);
assert.ok(
  events.every(
    (e) =>
      e.eventType === "rolled_forward" &&
      e.metadata.afterScheduledDate === "2026-11-01",
  ),
);
assert.ok(
  [...records.values()].every(
    (t) => t.schedule.dueDate === "2026-10-30" && t.progress === "in_progress",
  ),
);
await processBatch._handler(ctx, { runAt: now });
assert.equal(events.length, 205);
console.log(
  "PASS: roll-forward timezone boundaries, catch-up counts, idempotency, future/undated/completed protection, overnight/exact-midnight blocks, continued work, 205-task pagination and atomic activity payloads.",
);
