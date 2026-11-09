// Local fixtures only: pure day calculations and the actual owner-checked handlers.
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
const model = await load("src/lib/today-model.ts");
const recurrence = await load("src/lib/validation/recurrence.ts");
assert.equal(
  recurrence.zonedTimestamp(
    "2026-11-01",
    "01:30",
    "America/New_York",
    Date.parse("2026-11-01T06:30Z"),
  ),
  Date.parse("2026-11-01T06:30Z"),
  "unchanged timeline prefills retain the selected DST fold",
);
const dashboard = await load("convex/dashboard.ts");
const tasks = await load("convex/tasks.ts");
const now = Date.parse("2026-10-30T12:00:00Z");
const day = model.dayWindow("2026-10-30", "UTC", now);
const emptyDay = model.summarizeDay([], day);
assert.equal(emptyDay.active.length, 0);
assert.equal(emptyDay.totalMinutes, 0);
assert.equal(emptyDay.carried.length, 0);
const at = (time) => Date.parse(`2026-10-30T${time}:00Z`);
const row = (id, extra = {}) => ({
  _id: id,
  _creationTime: 1,
  ownerId: "alice",
  requestId: id,
  title: id,
  priority: "medium",
  status: "open",
  workDate: "2026-10-30",
  schedule: { type: "flexible" },
  timezone: "UTC",
  subtasks: [],
  ...extra,
});
const fixed = row("tasks-fixed", {
  schedule: { type: "fixed", startAt: at("10:00"), endAt: at("11:30") },
});
const overlap = row("tasks-overlap", {
  priority: "urgent",
  schedule: { type: "fixed", startAt: at("10:30"), endAt: at("12:00") },
});
const boundary = row("tasks-boundary", {
  schedule: { type: "fixed", startAt: at("12:00"), endAt: at("13:00") },
});
const carried = row("tasks-carried", {
  workDate: "2026-10-29",
  schedule: { type: "flexible", dueDate: "2026-10-29" },
  estimatedMinutes: 30,
});
const anytime = row("tasks-anytime", { workDate: "", estimatedMinutes: 20 });
const cross = row("tasks-cross", {
  workDate: "2026-10-29",
  schedule: {
    type: "fixed",
    startAt: Date.parse("2026-10-29T23:00Z"),
    endAt: at("01:00"),
  },
  estimatedMinutes: 60,
});
const future = row("tasks-future", {
  workDate: "2026-10-31",
  schedule: { type: "flexible", dueDate: "2026-10-31" },
});
const completed = row("tasks-completed", {
  workDate: "2026-10-20",
  status: "completed",
  completedAt: at("09:00"),
});
const summary = model.summarizeDay(
  [fixed, overlap, boundary, carried, anytime, cross, future, completed, fixed],
  day,
);
assert.equal(
  summary.tasks.length,
  6,
  "overlapping feeds deduplicate parent tasks",
);
assert.equal(summary.active.length, 5);
assert.equal(summary.completed.length, 1);
assert.deepEqual(
  summary.carried.map((task) => task._id),
  [carried._id],
);
assert.equal(summary.active[0]._id, overlap._id, "urgent priority first");
assert.equal(
  summary.totalMinutes,
  290,
  "fixed bookings count actual day overlap; subtasks are not additional workload",
);
assert.equal(
  model.summarizeDay(
    [anytime, carried, future],
    model.dayWindow("2026-10-31", "UTC", now),
  ).active.length,
  1,
  "future date does not project today's backlog",
);
assert.equal(
  model.belongsToDay(
    row("tasks-old-completed", {
      status: "completed",
      workDate: "2026-10-29",
      completedAt: day.start - 1,
    }),
    day,
  ),
  false,
);
const lanes = model.timelineLayout([fixed, overlap, boundary], day);
const overnightStart = model.dayWindow("2026-10-30", "Asia/Calcutta", now);
const overnightNext = model.dayWindow("2026-10-31", "Asia/Calcutta", now);
const overnight = row("tasks-overnight", {
  timezone: "Asia/Calcutta",
  workDate: "2026-10-30",
  estimatedMinutes: 120,
  schedule: {
    type: "fixed",
    startAt: overnightNext.start - 3600000,
    endAt: overnightNext.start + 3600000,
  },
});
const firstNight = model.timelineLayout([overnight], overnightStart)[0];
const nextMorning = model.timelineLayout([overnight], overnightNext)[0];
assert.equal(firstNight.start, overnight.schedule.startAt);
assert.equal(firstNight.end, overnightNext.start);
assert.equal(nextMorning, undefined);
assert.equal(model.belongsToDay(overnight, overnightNext), false);
assert.equal(model.plannedMinutes(overnight, overnightStart), 60);
assert.equal(model.plannedMinutes(overnight, overnightNext), 60);
assert.equal(
  model.timelineLayout(
    [
      {
        ...overnight,
        schedule: { ...overnight.schedule, endAt: overnightNext.start },
      },
    ],
    overnightNext,
  ).length,
  0,
  "midnight endings do not leak into the next day",
);
assert.deepEqual(
  lanes.map((block) => [block.lane, block.lanes]),
  [
    [0, 2],
    [1, 2],
    [0, 1],
  ],
  "overlap clusters use adjacent lanes; touching intervals do not overlap",
);
assert.equal(
  (model.dayWindow("2026-03-08", "America/New_York", now).end -
    model.dayWindow("2026-03-08", "America/New_York", now).start) /
    3600000,
  23,
);
assert.equal(
  (model.dayWindow("2026-11-01", "America/New_York", now).end -
    model.dayWindow("2026-11-01", "America/New_York", now).start) /
    3600000,
  25,
);

const records = new Map(
  [
    fixed,
    overlap,
    boundary,
    carried,
    anytime,
    cross,
    future,
    completed,
    row("tasks-private", { ownerId: "bob" }),
  ].map((task) => [task._id, structuredClone(task)]),
);
const halfHourSpring = model.dayWindow(
  "2026-10-04",
  "Australia/Lord_Howe",
  now,
);
const halfHourFall = model.dayWindow("2026-04-05", "Australia/Lord_Howe", now);
assert.equal((halfHourSpring.end - halfHourSpring.start) / 3600000, 23.5);
assert.equal((halfHourFall.end - halfHourFall.start) / 3600000, 24.5);
let sequence = 0;
const field = (row, path) =>
  path.split(".").reduce((value, key) => value?.[key], row);
const db = {
  get: async (id) => records.get(id) ?? null,
  insert: async (table, value) => {
    const id = `${table}-${++sequence}`;
    records.set(id, {
      ...structuredClone(value),
      _id: id,
      _creationTime: sequence,
    });
    return id;
  },
  patch: async (id, patch) => {
    const row = { ...records.get(id), ...structuredClone(patch) };
    Object.keys(row).forEach((key) => {
      if (row[key] === undefined) delete row[key];
    });
    records.set(id, row);
  },
  delete: async (id) => {
    records.delete(id);
  },
  query(table) {
    const clauses = [];
    const range = {};
    for (const [operator, test] of Object.entries({
      eq: (a, b) => a === b,
      lt: (a, b) => a < b,
      lte: (a, b) => a <= b,
      gt: (a, b) => a > b,
      gte: (a, b) => a >= b,
    }))
      range[operator] = (path, value) => {
        clauses.push((row) => test(field(row, path), value));
        return range;
      };
    const rows = () =>
      [...records.values()].filter(
        (row) =>
          row._id.startsWith(`${table}-`) && clauses.every((test) => test(row)),
      );
    const query = {
      withIndex(_index, constrain) {
        constrain(range);
        return query;
      },
      unique: async () => {
        assert.ok(rows().length <= 1);
        return rows()[0] ?? null;
      },
      take: async (count) => rows().slice(0, count),
      paginate: async ({ numItems, cursor }) => {
        const offset = Number(cursor ?? 0);
        const found = rows();
        return {
          page: found.slice(offset, offset + numItems),
          isDone: offset + numItems >= found.length,
          continueCursor: String(offset + numItems),
        };
      },
    };
    return query;
  },
};
const context = (owner) => ({
  db,
  auth: {
    getUserIdentity: async () => (owner ? { tokenIdentifier: owner } : null),
  },
});
const alice = context("alice"),
  bob = context("bob");
const args = {
  date: day.date,
  timezone: day.timezone,
  paginationOpts: { numItems: 2, cursor: null },
};
await assert.rejects(() =>
  dashboard.feed._handler(context(null), { ...args, kind: "open" }),
);
await assert.rejects(() =>
  dashboard.feed._handler(alice, { ...args, date: "invalid", kind: "fixed" }),
);
await assert.rejects(() =>
  dashboard.feed._handler(alice, {
    ...args,
    timezone: "invalid",
    kind: "fixed",
  }),
);
for (const kind of ["open", "dated", "fixed", "completed"]) {
  let cursor = null;
  let done = false;
  const found = [];
  while (!done) {
    const result = await dashboard.feed._handler(alice, {
      ...args,
      kind,
      paginationOpts: { numItems: 2, cursor },
    });
    found.push(...result.page);
    cursor = result.continueCursor;
    done = result.isDone;
  }
  assert.ok(
    found.every((task) => !("ownerId" in task) && !("requestId" in task)),
    "DTO omits owner and deduplication key",
  );
  assert.ok(
    !found.some((task) => task._id === "tasks-private"),
    "feeds isolate owners",
  );
  if (kind === "fixed")
    assert.equal(found.length, 3, "only bookings starting that day");
  if (kind === "completed")
    assert.deepEqual(
      found.map((task) => task._id),
      [completed._id],
    );
}
assert.equal(await tasks.get._handler(bob, { id: fixed._id }), null);
assert.equal(
  (await tasks.get._handler(alice, { id: fixed._id })).title,
  fixed.title,
);
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [now]));
  }
  static now() {
    return now;
  }
};
try {
  const focusArgs = { date: day.date, timezone: day.timezone };
  await assert.rejects(() =>
    dashboard.setFocus._handler(bob, { ...focusArgs, taskId: fixed._id }),
  );
  await assert.rejects(() =>
    dashboard.setFocus._handler(alice, {
      ...focusArgs,
      date: "2026-10-29",
      taskId: fixed._id,
    }),
  );
  await assert.rejects(() =>
    dashboard.setFocus._handler(alice, {
      ...focusArgs,
      date: "2026-10-31",
      taskId: anytime._id,
    }),
  );
  await dashboard.setFocus._handler(alice, { ...focusArgs, taskId: fixed._id });
  await dashboard.setFocus._handler(alice, {
    ...focusArgs,
    taskId: overlap._id,
  });
  assert.equal(
    [...records.values()].filter((row) => row._id.startsWith("dailyFocus-"))
      .length,
    1,
    "focus is upserted once per owner/day",
  );
  assert.equal(
    (await dashboard.focus._handler(alice, { ...focusArgs, today: day.date }))
      ._id,
    overlap._id,
  );
  records.get(overlap._id).status = "completed";
  assert.equal(
    await dashboard.focus._handler(alice, { ...focusArgs, today: day.date }),
    null,
    "completed tasks stop being focus anchors",
  );
  await dashboard.setFocus._handler(alice, { ...focusArgs, taskId: null });
  assert.equal(
    await dashboard.focus._handler(alice, { ...focusArgs, today: day.date }),
    null,
  );
  await assert.rejects(() =>
    tasks.reschedule._handler(bob, { id: fixed._id, schedule: fixed.schedule }),
  );
  await assert.rejects(() =>
    tasks.reschedule._handler(alice, {
      id: completed._id,
      schedule: completed.schedule,
    }),
  );
  await assert.rejects(
    () =>
      tasks.reschedule._handler(alice, {
        id: carried._id,
        schedule: carried.schedule,
      }),
    "past dates rejected",
  );
  await assert.rejects(() =>
    tasks.reschedule._handler(alice, {
      id: fixed._id,
      schedule: { type: "fixed", startAt: at("10:00"), endAt: at("09:00") },
    }),
  );
  await tasks.reschedule._handler(alice, {
    id: carried._id,
    schedule: { type: "flexible", dueDate: "2026-11-02" },
  });
  assert.equal(records.get(carried._id).workDate, "2026-11-02");
  assert.equal(records.get(carried._id).estimatedMinutes, 30);
  await tasks.reschedule._handler(alice, {
    id: fixed._id,
    schedule: { type: "fixed", startAt: at("14:00"), endAt: at("15:00") },
  });
  assert.equal(records.get(fixed._id).schedule.startAt, at("14:00"));
  const recurring = row("tasks-rescheduled-series", {
    recurrence: {
      frequency: "daily",
      interval: 1,
      unit: "day",
      end: { type: "count", count: 3 },
    },
    recurrenceAnchorDate: day.date,
    recurrenceOrdinal: 1,
    recurrenceSlot: 1,
    schedule: { type: "flexible", dueDate: day.date },
  });
  records.set(recurring._id, recurring);
  await tasks.reschedule._handler(alice, {
    id: recurring._id,
    schedule: { type: "flexible", dueDate: "2026-11-03" },
  });
  const nextId = await tasks.setCompleted._handler(alice, {
    id: recurring._id,
    completed: true,
  });
  assert.equal(
    records.get(nextId).workDate,
    "2026-11-04",
    "rescheduling an occurrence forward cannot generate the next occurrence before it",
  );
  assert.equal(
    records.get(nextId).recurrenceOrdinal,
    2,
    "moving a task does not consume additional recurrence counts",
  );
} finally {
  globalThis.Date = RealDate;
}
console.log(
  "Today model and handlers passed: timezones, DST, overlap, workload, priority, pagination, ownership, focus, and rescheduling.",
);
