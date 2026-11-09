import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { records, context, functions } from "./check-task-handlers.mjs";
async function load(file) {
  const b = await build({
    entryPoints: [file],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
  });
  return import(
    "data:text/javascript;base64," +
      Buffer.from(b.outputFiles[0].text).toString("base64")
  );
}
const series = await load("convex/series.ts"),
  rec = await load("src/lib/validation/recurrence.ts"),
  validation = await load("src/lib/validation/task.ts"),
  model = await load("src/lib/today-model.ts"),
  details = await load("convex/taskDetails.ts");
const ctx = context("series-test"),
  timezone = "America/New_York";
const base = {
  title: "One hour",
  priority: "medium",
  timezone,
  schedule: {
    type: "fixed",
    startAt: Date.parse("2030-03-08T12:00:00Z"),
    endAt: Date.parse("2030-03-08T13:00:00Z"),
  },
  subtasks: [],
  requestId: randomUUID(),
  recurrence: {
    frequency: "daily",
    interval: 1,
    unit: "day",
    end: { type: "count", count: 5 },
  },
};
const id = await functions.create._handler(ctx, base),
  seriesId = records.get(id).seriesId;
assert.ok(seriesId);
await series.generate._handler(ctx, { seriesId });
const rows = () =>
  [...records.values()].filter(
    (t) => t._id.startsWith("tasks-") && t.seriesId === seriesId,
  );
assert.equal(
  rows().length,
  5,
  "all sessions generated before completing the first",
);
const dates = rows().map((t) => t.schedule.startAt);
await series.generate._handler(ctx, { seriesId });
assert.equal(rows().length, 5, "retry deduplicates");
assert.equal(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(rows()[2].schedule.startAt),
  "07",
  "local seven stays seven after DST",
);
assert.ok(
  rows().every((t) => t.schedule.endAt - t.schedule.startAt === 3600000),
);
await functions.setCompleted._handler(ctx, { id, completed: true });
assert.deepEqual(
  rows().map((t) => t.schedule.startAt),
  dates,
  "completion does not shift cadence",
);
const overnight = series.occurrenceSchedule(
  {
    ...base,
    schedule: {
      type: "fixed",
      startAt: Date.parse("2030-03-08T04:00Z"),
      endAt: Date.parse("2030-03-08T06:00Z"),
    },
  },
  "2030-03-09",
);
const day = model.dayWindow("2030-03-09", timezone);
assert.equal(
  model.plannedMinutes(
    { ...records.get(id), schedule: overnight, estimatedMinutes: 10 },
    day,
  ),
  60,
  "only midnight-to-one is counted, independent of estimate",
);
const monthly = {
  frequency: "monthly",
  interval: 1,
  unit: "month",
  end: { type: "never" },
  monthlyMissing: "skip",
};
assert.equal(rec.occurrenceDate("2030-01-31", monthly, 2), "2030-03-31");
const weekly = {
  ...monthly,
  frequency: "weekly",
  unit: "week",
  weekdays: [1, 3, 5],
};
assert.deepEqual(
  [1, 2, 3, 4].map((i) => rec.occurrenceDate("2030-03-04", weekly, i)),
  ["2030-03-04", "2030-03-06", "2030-03-08", "2030-03-11"],
);
const long = {
  ...base,
  schedule: { ...base.schedule, endAt: Date.parse("2030-06-08T12:00Z") },
};
assert.equal(
  validation.createTaskSchema.safeParse(long).success,
  false,
  "overlap needs explicit consent",
);
assert.ok(
  validation.createTaskSchema.safeParse({
    ...long,
    allowOverlap: true,
  }).success,
);
const editId = rows()[1]._id,
  original = records.get(editId);
const editValues = {
  ...base,
  id: editId,
  title: "Just one",
  schedule: original.schedule,
  requestId: randomUUID(),
  stepKeys: [],
  expectedStepIds: [],
  editScope: "this",
};
await details.updateTask._handler(ctx, editValues);
assert.equal(records.get(editId).title, "Just one");
assert.equal(records.get(rows()[2]._id).title, "One hour");
const completedFuture = rows()[3];
await assert.rejects(
  functions.setCompleted._handler(ctx, { id: completedFuture._id, completed: true }),
  /Complete the active occurrence first/,
);
// Preserve historical completions created before the active-occurrence rule.
await ctx.db.patch(completedFuture._id, { status: "completed", completedAt: Date.now() });
await details.updateTask._handler(ctx, {
  ...editValues,
  title: "Future revised",
  requestId: randomUUID(),
  editScope: "future",
});
assert.equal(records.get(seriesId).active, false);
await series.retire._handler(ctx, {
  seriesId,
  from: original.recurrenceOrdinal,
  except: editId,
});
assert.equal(records.get(completedFuture._id).status, "completed");
assert.ok(!records.get(completedFuture._id).recurrenceCancelled);
const revised = records.get(editId).seriesId;
await series.generate._handler(ctx, { seriesId: revised });
assert.ok(
  ![...records.values()].some(
    (t) =>
      t.seriesId === revised &&
      t.status === "open" &&
      t.workDate === completedFuture.workDate,
  ),
  "completed future session isn't duplicated",
);
const neverId = await functions.create._handler(ctx, {
  ...base,
  requestId: randomUUID(),
  recurrence: { ...base.recurrence, end: { type: "never" } },
});
const neverSeries = records.get(neverId).seriesId;
await series.generate._handler(ctx, { seriesId: neverSeries });
await series.generate._handler(ctx, { seriesId: neverSeries });
assert.equal(
  [...records.values()].filter((t) => t.seriesId === neverSeries).length,
  31,
  "never-ending repeat bounded to thirty days ahead of first date",
);
const untilId = await functions.create._handler(ctx, {
  ...base,
  requestId: randomUUID(),
  recurrence: { ...base.recurrence, end: { type: "date", date: "2030-03-10" } },
});
await series.generate._handler(ctx, {
  seriesId: records.get(untilId).seriesId,
});
assert.equal(
  [...records.values()].filter(
    (t) => t.seriesId === records.get(untilId).seriesId,
  ).length,
  3,
  "inclusive repeat end date",
);
console.log(
  "PASS: scheduled series, retry safety, independent completion, DST, overnight allocation, weekday selection, missing months, overlap consent, scoped edits and preserved completed history.",
);

const weeklyId = await functions.create._handler(ctx, {
  ...base,
  requestId: randomUUID(),
  recurrence: {
    frequency: "weekly",
    unit: "week",
    interval: 1,
    weekdays: [5],
    end: { type: "count", count: 3 },
  },
});
const originalWeekly = records.get(weeklyId);
await details.updateTask._handler(ctx, {
  ...base,
  id: weeklyId,
  requestId: randomUUID(),
  recurrence: originalWeekly.recurrence,
  schedule: series.occurrenceSchedule(base, "2030-03-09"),
  editScope: "this",
  stepKeys: [],
  expectedStepIds: [],
});
assert.equal(
  records.get(weeklyId).workDate,
  "2030-03-09",
  "a one-off exception can move outside selected weekdays",
);
assert.deepEqual(
  records.get(originalWeekly.seriesId).template.schedule,
  base.schedule,
  "one-off exception does not shift the series template",
);
console.log(
  "PASS: a one-off reschedule can move to Saturday without altering its Friday series.",
);
