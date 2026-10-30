import assert from "node:assert/strict";
import { build } from "esbuild";
const bundle = await build({
  entryPoints: ["src/lib/validation/recurrence.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const {
  recurrenceSchema,
  occurrenceDate,
  recurrenceAllows,
  moveStartToDate,
  weekdayDistance,
} = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const rule = {
  frequency: "monthly",
  interval: 1,
  unit: "month",
  end: { type: "never" },
};
const weekdays = {
  frequency: "weekdays",
  interval: 1,
  unit: "day",
  end: { type: "never" },
};
assert.ok(recurrenceSchema.safeParse(weekdays).success);
assert.ok(!recurrenceSchema.safeParse({ ...weekdays, unit: "week" }).success);
assert.ok(!recurrenceSchema.safeParse({ ...weekdays, interval: 2 }).success);
assert.equal(occurrenceDate("2026-10-30", weekdays, 2), "2026-11-02");
assert.equal(occurrenceDate("2026-10-30", weekdays, 6), "2026-11-06");
assert.equal(occurrenceDate("2026-10-30", weekdays, 7), "2026-11-09");
assert.equal(weekdayDistance("2026-10-30", "2026-11-06"), 5);
assert.equal(weekdayDistance("2026-10-30", "2026-11-08"), 5);
for (const anchor of [
  "2026-10-26",
  "2026-10-27",
  "2026-10-28",
  "2026-10-29",
  "2026-10-30",
  "2028-02-28",
]) {
  let previous = null;
  for (let ordinal = 1; ordinal <= 100; ordinal++) {
    const date = occurrenceDate(anchor, weekdays, ordinal);
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    assert.ok(day >= 1 && day <= 5);
    if (previous) assert.ok(date > previous);
    assert.equal(weekdayDistance(anchor, date), ordinal - 1);
    previous = date;
  }
}
assert.ok(recurrenceSchema.safeParse(rule).success);
assert.equal(occurrenceDate("2026-01-31", rule, 2), "2026-02-28");
assert.equal(occurrenceDate("2026-01-31", rule, 3), "2026-03-31");
assert.equal(occurrenceDate("2024-01-31", rule, 2), "2024-02-29");
assert.equal(
  occurrenceDate(
    "2026-12-28",
    { ...rule, frequency: "custom", unit: "week", interval: 2 },
    2,
  ),
  "2027-01-11",
);
assert.equal(
  recurrenceAllows(
    { ...rule, end: { type: "count", count: 2 } },
    2,
    "2026-02-28",
  ),
  true,
);
assert.equal(
  recurrenceAllows(
    { ...rule, end: { type: "count", count: 2 } },
    3,
    "2026-03-31",
  ),
  false,
);
assert.equal(
  recurrenceAllows(
    { ...rule, end: { type: "date", date: "2026-02-28" } },
    2,
    "2026-02-28",
  ),
  true,
);
assert.equal(
  recurrenceAllows(
    { ...rule, end: { type: "date", date: "2026-02-28" } },
    3,
    "2026-03-31",
  ),
  false,
);
assert.equal(
  recurrenceSchema.safeParse({ ...rule, interval: 2 }).success,
  false,
);
assert.equal(
  recurrenceSchema.safeParse({ ...rule, frequency: "custom", interval: 0 })
    .success,
  false,
);
assert.equal(
  recurrenceSchema.safeParse({ ...rule, end: { type: "count", count: 0 } })
    .success,
  false,
);
assert.equal(
  moveStartToDate(
    Date.parse("2026-03-07T14:00:00Z"),
    "2026-03-08",
    "America/New_York",
  ),
  Date.parse("2026-03-08T13:00:00Z"),
);
assert.equal(
  moveStartToDate(
    Date.parse("2026-03-07T07:30:00Z"),
    "2026-03-08",
    "America/New_York",
  ),
  Date.parse("2026-03-08T07:30:00Z"),
);
assert.equal(
  moveStartToDate(
    Date.parse("2026-10-31T05:30:00Z"),
    "2026-11-01",
    "America/New_York",
  ),
  Date.parse("2026-11-01T05:30:00Z"),
);
console.log(
  "PASS: daily/weekly/monthly/custom recurrence rules, count/date endings, month-end anchoring, leap years, DST gaps and folds.",
);
