// Exercises the real Convex handlers locally without writing live test data.
import assert from "node:assert/strict";
import { build } from "esbuild";
const RealDate = Date;
let clock = RealDate.parse("2026-01-01T12:00:00Z");
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [clock]));
  }
  static now() {
    return clock;
  }
};
const compiled = await build({
  entryPoints: ["convex/tasks.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const functions = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const records = new Map();
let sequence = 0;
const db = {
  async get(id) {
    return records.get(id) ?? null;
  },
  async insert(table, value) {
    const id = `${table}-${++sequence}`;
    records.set(id, {
      ...structuredClone(value),
      _id: id,
      _creationTime: sequence,
    });
    return id;
  },
  async patch(id, patch) {
    const row = { ...records.get(id), ...structuredClone(patch) };
    for (const key of Object.keys(row))
      if (row[key] === undefined) delete row[key];
    records.set(id, row);
  },
  async delete(id) {
    records.delete(id);
  },
  query(table) {
    const conditions = [];
    let descending = false;
    let indexName = "";
    const clauses = {
      eq(key, value) {
        conditions.push(
          (row) =>
            key.split(".").reduce((result, part) => result?.[part], row) ===
            value,
        );
        return clauses;
      },
      gte(key,value){conditions.push(row=>row[key]>=value);return clauses;},
      lte(key, value) {
        conditions.push((row) => row[key] <= value);
        return clauses;
      },
      gt(key, value) {
        conditions.push((row) => row[key] > value);
        return clauses;
      },
    };
    const rows = () =>
      [...records.values()]
        .filter(
          (row) =>
            row._id.startsWith(`${table}-`) &&
            conditions.every((match) => match(row)),
        )
        .sort((a, b) => {
          const difference =
            indexName === "by_parentTaskId_and_position"
              ? a.position - b.position || a._creationTime - b._creationTime
              : a._creationTime - b._creationTime;
          return descending ? -difference : difference;
        });
    const query = {
      async *[Symbol.asyncIterator]() {
        yield* rows();
      },
      withIndex(_name, constrain) {
        indexName = _name;
        constrain(clauses);
        return query;
      },
      order(direction) {
        descending = direction === "desc";
        return query;
      },
      async unique() {
        assert.ok(rows().length <= 1);
        return rows()[0] ?? null;
      },
      async first() {
        return rows()[0] ?? null;
      },
      async take(count) {
        return rows().slice(0, count);
      },
      async paginate({ numItems, cursor }) {
        const found = rows();
        const offset = Number(cursor || 0);
        return {
          page: found.slice(offset, offset + numItems),
          isDone: found.length <= offset + numItems,
          continueCursor: String(offset + numItems),
        };
      },
    };
    return query;
  },
};
const context = (owner) => ({
  db,
  scheduler: {runAfter:async()=>null},
  auth: {
    getUserIdentity: async () => (owner ? { tokenIdentifier: owner } : null),
  },
});
async function legacyCreate(ctx,args){
 const id=await functions.create._handler(ctx,args);
 if(args.recurrence)await db.patch(id,{seriesId:undefined,recurrenceManaged:undefined});
 return id;
}
const alice = context("alice");
const bob = context("bob");
const steps = (taskId) =>
  [...records.values()]
    .filter(
      (row) => row._id.startsWith("subtasks-") && row.parentTaskId === taskId,
    )
    .sort((a, b) => a.position - b.position);
const base = {
  title: "  Proposal  ",
  priority: "medium",
  schedule: { type: "flexible" },
  timezone: "Asia/Kolkata",
  subtasks: [{ title: "Research" }],
  requestId: "ea2ff0cf-5af8-43ef-ab9b-eb5314855a58",
};
await assert.rejects(() => legacyCreate(context(null), base));
await assert.rejects(() =>
  legacyCreate(alice, { ...base, title: " " }),
);
const foreignDomain = await db.insert("domains", {
  ownerId: "bob",
  name: "Other",
  color: "green",
  icon: "briefcase",
});
await assert.rejects(() =>
  legacyCreate(alice, { ...base, domainId: foreignDomain }),
);
const id = await legacyCreate(alice, base);
assert.equal(await legacyCreate(alice, base), id);
assert.equal(records.get(id).title, "Proposal");
assert.equal(records.get(id).subtasks.length, 0);
assert.equal(records.get(id).subtasksNormalized, true);
assert.equal(steps(id).length, 1);
assert.equal(records.get(id).workDate, "");
await assert.rejects(() =>
  functions.setCompleted._handler(bob, { id, completed: true }),
);
const args = {
  view: "all",
  today: "2026-10-29",
  paginationOpts: { numItems: 30, cursor: null },
};
assert.equal((await functions.list._handler(bob, args)).page.length, 0);
const visible = (await functions.list._handler(alice, args)).page[0];
assert.ok(!("ownerId" in visible));
assert.ok(!("requestId" in visible));
const future = await legacyCreate(alice, {
  ...base,
  requestId: "64d9d6bb-6ea5-4c37-8d81-88e5521a4d91",
  schedule: { type: "flexible", dueDate: "2026-10-30" },
});
assert.equal(
  (await functions.list._handler(alice, { ...args, view: "today" })).page
    .length,
  1,
);
assert.equal(
  (
    await functions.list._handler(alice, {
      ...args,
      view: "today",
      today: "2026-10-30",
    })
  ).page.length,
  2,
);
assert.equal(records.get(future).schedule.dueDate, "2026-10-30");
await functions.setCompleted._handler(alice, {
  id,
  completed: true,
  subtaskId: steps(id)[0]._id,
});
assert.equal(typeof steps(id)[0].completedAt, "number");
await functions.setCompleted._handler(alice, {
  id,
  completed: false,
  subtaskId: steps(id)[0]._id,
});
assert.ok(!("completedAt" in steps(id)[0]));
await functions.setCompleted._handler(alice, { id, completed: true });
assert.equal(
  (await functions.list._handler(alice, { ...args, view: "today" })).page
    .length,
  0,
);
assert.equal((await functions.list._handler(alice, args)).page.length, 2);
await functions.setCompleted._handler(alice, { id, completed: false });
assert.equal(records.get(id).status, "open");
await assert.rejects(() =>
  functions.setProgress._handler(context(null), {
    id,
    progress: "in_progress",
  }),
);
await assert.rejects(() =>
  functions.setProgress._handler(bob, { id, progress: "in_progress" }),
);
await assert.rejects(() =>
  functions.setProgress._handler(alice, {
    id: "tasks-missing",
    progress: "in_progress",
  }),
);
await functions.setProgress._handler(alice, { id, progress: "in_progress" });
assert.equal(records.get(id).status, "open");
assert.equal(records.get(id).progress, "in_progress");
assert.equal(
  (await functions.get._handler(alice, { id })).progress,
  "in_progress",
);
await functions.setCompleted._handler(alice, { id, completed: true });
assert.equal(records.get(id).status, "completed");
await functions.setProgress._handler(alice, { id, progress: "in_progress" });
assert.equal(records.get(id).status, "open");
assert.ok(!("completedAt" in records.get(id)));
await functions.setProgress._handler(alice, { id, progress: "not_started" });
assert.equal(records.get(id).progress, "not_started");
await functions.setCompleted._handler(alice, { id, completed: true });
await functions.setCompleted._handler(alice, { id, completed: false });
assert.equal(records.get(id).progress, "not_started");
console.log(
  "PASS: actual task handlers — auth, domain ownership, idempotency, atomic subtasks, owner isolation, Today versus My Tasks, deadline preservation, completion and undo.",
);

const repeating = await legacyCreate(alice, {
  ...base,
  requestId: "5fe300ec-c322-4696-9898-72963446cc2a",
  schedule: { type: "flexible", dueDate: "2026-01-31" },
  subtasks: [{ title: "Follow up", dueDate: "2026-02-02" }],
  recurrence: {
    frequency: "monthly",
    interval: 1,
    unit: "month",
    end: { type: "count", count: 3 },
  },
});
const next = await functions.setCompleted._handler(alice, {
  id: repeating,
  completed: true,
});
assert.equal(records.get(next).schedule.dueDate, "2026-02-28");
assert.equal(records.get(next).recurrenceOrdinal, 2);
assert.equal(steps(next)[0].dueDate, "2026-03-02");
assert.ok(!("completedAt" in steps(next)[0]));
assert.equal(
  await functions.setCompleted._handler(alice, {
    id: repeating,
    completed: true,
  }),
  null,
);
await functions.setCompleted._handler(alice, {
  id: repeating,
  completed: false,
});
assert.equal(
  await functions.setCompleted._handler(alice, {
    id: repeating,
    completed: true,
  }),
  null,
);
assert.equal(records.get(repeating).nextOccurrenceId, next);
const third = await functions.setCompleted._handler(alice, {
  id: next,
  completed: true,
});
assert.equal(records.get(third).schedule.dueDate, "2026-03-31");
assert.equal(
  await functions.setCompleted._handler(alice, { id: third, completed: true }),
  null,
);
const until = await legacyCreate(alice, {
  ...base,
  requestId: "bd409a5c-1072-469c-969e-90b9ebcce7e3",
  schedule: { type: "flexible", dueDate: "2026-01-31" },
  recurrence: {
    frequency: "weekly",
    interval: 1,
    unit: "week",
    end: { type: "date", date: "2026-02-07" },
  },
});
const last = await functions.setCompleted._handler(alice, {
  id: until,
  completed: true,
});
assert.equal(records.get(last).workDate, "2026-02-07");
assert.equal(
  await functions.setCompleted._handler(alice, { id: last, completed: true }),
  null,
);
const dst = await legacyCreate(alice, {
  ...base,
  requestId: "a31d705a-0f94-451f-b572-bb01114e7c5b",
  timezone: "America/New_York",
  schedule: {
    type: "fixed",
    startAt: Date.parse("2026-03-07T07:30:00Z"),
    endAt: Date.parse("2026-03-07T08:30:00Z"),
  },
  recurrence: {
    frequency: "daily",
    interval: 1,
    unit: "day",
    end: { type: "count", count: 3 },
  },
});
const gap = await functions.setCompleted._handler(alice, {
  id: dst,
  completed: true,
});
const restored = await functions.setCompleted._handler(alice, {
  id: gap,
  completed: true,
});
assert.equal(
  records.get(gap).schedule.startAt,
  Date.parse("2026-03-08T07:30:00Z"),
);
assert.equal(
  records.get(restored).schedule.startAt,
  Date.parse("2026-03-09T06:30:00Z"),
);
console.log(
  "PASS: legacy recurring task persistence, completion generates one next occurrence, undo/re-complete safety, subtask resets, month-end dates, count/date stops, and fixed-time DST recovery.",
);

clock = RealDate.parse("2026-10-30T09:45:00Z");
await assert.rejects(() =>
  legacyCreate(alice, {
    ...base,
    requestId: "cb21c9d0-738d-48f1-80e5-3ccbc456e5cf",
    schedule: { type: "flexible", dueDate: "2026-10-29" },
  }),
);
await assert.rejects(() =>
  legacyCreate(alice, {
    ...base,
    requestId: "5db04481-758c-43ca-8520-595b9a8d4aad",
    subtasks: [{ title: "Past step", dueDate: "2026-10-29" }],
  }),
);
await assert.rejects(() =>
  legacyCreate(alice, {
    ...base,
    requestId: "9a86a70a-7af4-4c3d-a34f-2fbb021beceb",
    schedule: {
      type: "fixed",
      startAt: clock - 86400000,
      endAt: clock - 80000000,
    },
  }),
);
const daily = {
  frequency: "daily",
  interval: 1,
  unit: "day",
  end: { type: "never" },
};
await assert.rejects(() =>
  legacyCreate(alice, {
    ...base,
    requestId: "9d882f08-76f6-4c31-b4c6-d1aaf4467d01",
    schedule: { type: "flexible", dueDate: "2026-10-29" },
    recurrence: daily,
  }),
);
await assert.rejects(() =>
  legacyCreate(alice, {
    ...base,
    requestId: "9d882f08-76f6-4c31-b4c6-d1aaf4467d02",
    subtasks: [{ title: "Step", dueDate: "2026-10-29" }],
    recurrence: daily,
  }),
);
await assert.rejects(() =>
  legacyCreate(alice, {
    ...base,
    requestId: "9d882f08-76f6-4c31-b4c6-d1aaf4467d03",
    schedule: {
      type: "fixed",
      startAt: clock - 3600000,
      endAt: clock + 3600000,
    },
    recurrence: daily,
  }),
);
assert.equal(
  await legacyCreate(alice, {
    ...base,
    requestId: "5fe300ec-c322-4696-9898-72963446cc2a",
    schedule: { type: "flexible", dueDate: "2026-01-31" },
    recurrence: daily,
  }),
  repeating,
);
console.log(
  "PASS: authoritative past-date/time rejection and idempotent retries after the clock advances.",
);
const late = await legacyCreate(alice, {
  ...base,
  requestId: "02f7ee95-e39f-4f48-9248-7c7cf0a58f71",
  schedule: { type: "flexible", dueDate: "2026-10-30" },
  recurrence: { ...daily, end: { type: "count", count: 3 } },
});
const expired = await legacyCreate(alice, {
  ...base,
  requestId: "02f7ee95-e39f-4f48-9248-7c7cf0a58f72",
  schedule: { type: "flexible", dueDate: "2026-10-30" },
  recurrence: { ...daily, end: { type: "date", date: "2026-11-05" } },
});
const preparation = await legacyCreate(alice, {
  ...base,
  requestId: "02f7ee95-e39f-4f48-9248-7c7cf0a58f73",
  schedule: { type: "flexible", dueDate: "2026-11-10" },
  subtasks: [{ title: "Prepare", dueDate: "2026-11-01" }],
  recurrence: daily,
});
const lateFixed = await legacyCreate(alice, {
  ...base,
  requestId: "02f7ee95-e39f-4f48-9248-7c7cf0a58f74",
  schedule: { type: "fixed", startAt: clock + 3600000, endAt: clock + 7200000 },
  recurrence: daily,
});
clock = RealDate.parse("2026-11-10T12:00:00Z");
const resumed = await functions.setCompleted._handler(alice, {
  id: late,
  completed: true,
});
assert.equal(records.get(resumed).workDate, "2026-11-10");
assert.equal(records.get(resumed).recurrenceOrdinal, 2);
assert.equal(records.get(resumed).recurrenceSlot, 12);
const resumedAgain = await functions.setCompleted._handler(alice, {
  id: resumed,
  completed: true,
});
assert.equal(records.get(resumedAgain).workDate, "2026-11-11");
assert.equal(records.get(resumedAgain).recurrenceOrdinal, 3);
assert.equal(
  await functions.setCompleted._handler(alice, {
    id: resumedAgain,
    completed: true,
  }),
  null,
);
assert.equal(
  await functions.setCompleted._handler(alice, {
    id: expired,
    completed: true,
  }),
  null,
);
const resumedFixed = await functions.setCompleted._handler(alice, {
  id: lateFixed,
  completed: true,
});
assert.ok(records.get(resumedFixed).schedule.startAt >= clock);
clock = RealDate.parse("2026-11-11T12:00:00Z");
const prepared = await functions.setCompleted._handler(alice, {
  id: preparation,
  completed: true,
});
assert.equal(records.get(prepared).workDate, "2026-11-20");
assert.equal(steps(prepared)[0].dueDate, "2026-11-11");
console.log(
  "PASS: late completion skips expired dates/time slots, preserves actual occurrence limits, stops expired series, and keeps generated subtask dates valid.",
);
clock = RealDate.parse("2026-10-30T12:00:00Z");
const weekdayRule = {
  frequency: "weekdays",
  interval: 1,
  unit: "day",
  end: { type: "count", count: 3 },
};
const weekdayTask = await legacyCreate(alice, {
  ...base,
  timezone: "UTC",
  requestId: "d3b4071f-7a68-4947-b357-3a335a9b4041",
  schedule: { type: "flexible", dueDate: "2026-10-30" },
  recurrence: weekdayRule,
});
await functions.setProgress._handler(alice, {
  id: weekdayTask,
  progress: "in_progress",
});
assert.ok(!records.get(weekdayTask).nextOccurrenceId);
const monday = await functions.setCompleted._handler(alice, {
  id: weekdayTask,
  completed: true,
});
assert.equal(records.get(monday).workDate, "2026-11-02");
assert.equal(records.get(monday).progress ?? "not_started", "not_started");
assert.equal(
  await functions.setCompleted._handler(alice, {
    id: weekdayTask,
    completed: true,
  }),
  null,
);
const tuesday = await functions.setCompleted._handler(alice, {
  id: monday,
  completed: true,
});
assert.equal(records.get(tuesday).workDate, "2026-11-03");
assert.equal(
  await functions.setCompleted._handler(alice, {
    id: tuesday,
    completed: true,
  }),
  null,
);
const expires = await legacyCreate(alice, {
  ...base,
  timezone: "UTC",
  requestId: "e187014f-fc1f-47dc-b890-d6df58b9812a",
  schedule: { type: "flexible", dueDate: "2026-10-30" },
  recurrence: { ...weekdayRule, end: { type: "date", date: "2026-11-01" } },
});
assert.equal(
  await functions.setCompleted._handler(alice, {
    id: expires,
    completed: true,
  }),
  null,
);
const lateWeekday = await legacyCreate(alice, {
  ...base,
  timezone: "UTC",
  requestId: "4d1be2c3-ccbc-4fab-9de5-1467a6a7df97",
  schedule: { type: "flexible", dueDate: "2026-10-30" },
  recurrence: weekdayRule,
});
clock = RealDate.parse("2026-11-07T12:00:00Z");
const resumedWeekday = await functions.setCompleted._handler(alice, {
  id: lateWeekday,
  completed: true,
});
assert.equal(records.get(resumedWeekday).workDate, "2026-11-09");
assert.equal(records.get(resumedWeekday).recurrenceOrdinal, 2);
console.log(
  "PASS: weekday repeats skip weekends, retain count/date limits, reset status, and catch up after late completion.",
);
globalThis.Date = RealDate;
export { db, records, context, functions, steps };
