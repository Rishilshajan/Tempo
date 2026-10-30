// Runs seed/cleanup handlers against an in-memory database, never the live deployment.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
const result = await build({
  entryPoints: ["convex/verificationData.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const functions = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : ["2026-10-30T12:00Z"]));
  }
  static now() {
    return RealDate.parse("2026-10-30T12:00Z");
  }
};
const records = new Map();
let sequence = 0;
const db = {
  get: async (id) => records.get(id) ?? null,
  insert: async (table, value) => {
    const id = `${table}-${++sequence}`;
    records.set(id, { ...structuredClone(value), _id: id });
    return id;
  },
  delete: async (id) => records.delete(id),
  query(table) {
    const clauses = [];
    const range = {
      eq(key, value) {
        clauses.push((row) => row[key] === value);
        return range;
      },
    };
    const rows = () =>
      [...records.values()].filter(
        (row) =>
          row._id.startsWith(`${table}-`) && clauses.every((test) => test(row)),
      );
    const query = {
      withIndex(_name, apply) {
        apply(range);
        return query;
      },
      unique: async () => {
        assert.ok(rows().length <= 1);
        return rows()[0] ?? null;
      },
      first: async () => rows()[0] ?? null,
      take: async (count) => rows().slice(0, count),
    };
    return query;
  },
};
const ctx = (owner) => ({
  db,
  auth: {
    getUserIdentity: async () => (owner ? { tokenIdentifier: owner } : null),
  },
});
async function run(fn, owner, args) {
  const snapshot = structuredClone(records);
  try {
    return await fn._handler(ctx(owner), { ...args, ownerId: owner ?? "" });
  } catch (error) {
    records.clear();
    snapshot.forEach((value, key) => records.set(key, value));
    throw error;
  }
}
const args = {
  today: "2026-10-30",
  tomorrow: "2026-10-31",
  timezone: "Asia/Kolkata",
  domains: [
    {
      name: "[Demo] Product",
      color: "green",
      icon: "layers",
      requestId: randomUUID(),
    },
  ],
  tasks: [
    {
      title: "[Demo] Today",
      priority: "high",
      timezone: "Asia/Kolkata",
      schedule: { type: "flexible", dueDate: "2026-10-30" },
      subtasks: [],
      requestId: randomUUID(),
      domainIndex: 0,
    },
    {
      title: "[Demo] Tomorrow",
      priority: "low",
      timezone: "Asia/Kolkata",
      schedule: { type: "flexible", dueDate: "2026-10-31" },
      subtasks: [],
      requestId: randomUUID(),
      domainIndex: 0,
    },
  ],
};
try {
  assert.equal(functions.seed.isInternal,true);
  assert.equal(functions.cleanup.isInternal,true);
  assert.equal(functions.lookup.isInternal,true);
  const original = await db.insert("tasks", {
    ownerId: "alice",
    requestId: randomUUID(),
    title: "Original task",
  });
  await db.insert("dailyFocus", {
    ownerId: "alice",
    date: args.today,
    taskId: original,
  });
  await assert.rejects(() => run(functions.seed, null, args));
  await assert.rejects(() =>
    run(functions.seed, "alice", { ...args, today: "2026-10-29" }),
  );
  await assert.rejects(() =>
    run(functions.seed, "alice", {
      ...args,
      tasks: [
        {
          ...args.tasks[0],
          schedule: { type: "flexible", dueDate: "2026-11-01" },
        },
      ],
    }),
  );
  assert.equal(
    records.size,
    2,
    "invalid batch rolls back without fixture records",
  );
  const batch = await run(functions.seed, "alice", args);
  assert.deepEqual(
    await run(functions.seed, "alice", args),
    batch,
    "retries do not create duplicate fixtures",
  );
  const lookup = {
    taskRequests: args.tasks.map((task) => task.requestId),
    domainRequests: args.domains.map((domain) => domain.requestId),
  };
  assert.deepEqual(await run(functions.lookup, "alice", lookup), batch);
  assert.deepEqual((await run(functions.lookup, "bob", lookup)).tasks, []);
  assert.equal(
    [...records.values()].find(
      (row) => row._id.startsWith("dailyFocus-") && row.date === args.today,
    ).taskId,
    original,
    "seed preserves real focus choices",
  );
  await assert.rejects(() => run(functions.cleanup, "bob", batch));
  await assert.rejects(() =>
    run(functions.cleanup, "alice", {
      ...batch,
      tasks: [
        ...batch.tasks.slice(0, 1),
        { ...batch.tasks[1], requestId: randomUUID() },
      ],
    }),
  );
  assert.ok(records.has(batch.tasks[0].id), "failed cleanup is atomic");
  records.get(batch.tasks[0].id).title = "Renamed during verification";
  const adopted = await db.insert("tasks", {
    ownerId: "alice",
    domainId: batch.domains[0].id,
    title: "User-created task",
    requestId: randomUUID(),
  });
  const cleaned = await run(functions.cleanup, "alice", batch);
  assert.equal(cleaned.deletedTasks, 2);
  assert.deepEqual(
    cleaned.retainedDomains,
    [batch.domains[0].id],
    "keep a sample domain if a real user task now uses it",
  );
  assert.ok(records.has(original) && records.has(adopted));
  assert.equal(
    [...records.values()].filter((row) => row._id.startsWith("dailyFocus-"))
      .length,
    1,
    "remove sample focus pointers only",
  );
  assert.equal(
    (await run(functions.cleanup, "alice", batch)).deletedTasks,
    0,
    "cleanup retries are safe",
  );
  console.log(
    "PASS: verification fixtures — admin-only visibility, date bounds, atomic retries, ownership, exact manifest cleanup, edited samples, and preservation of real records/focus.",
  );
} finally {
  globalThis.Date = RealDate;
}
