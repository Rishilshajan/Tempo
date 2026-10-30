import assert from "node:assert/strict";
import { build } from "esbuild";
const bundled = await build({
  entryPoints: ["src/lib/validation/task.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const {
  createTaskSchema,
  localDateKey,
  recurringDateIssues,
  durationInputSchema,
} = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);

const base = {
  title: "  Prepare proposal  ",
  priority: "medium",
  schedule: { type: "flexible" },
  timezone: "Asia/Kolkata",
  subtasks: [],
  requestId: "ea2ff0cf-5af8-43ef-ab9b-eb5314855a58",
};
assert.equal(createTaskSchema.parse(base).title, "Prepare proposal");
assert.ok(
  createTaskSchema.safeParse({
    ...base,
    description: "",
    subtasks: [
      { title: "Research" },
      { title: "Outline", dueDate: "2026-10-30" },
    ],
  }).success,
);
const startAt = Date.UTC(2026, 9, 29, 3, 30);
const fixed = {
  ...base,
  schedule: { type: "fixed", startAt, endAt: startAt + 3600000 },
  estimatedMinutes: 60,
};
assert.ok(createTaskSchema.safeParse(fixed).success);
for (const task of [
  { ...base, title: "   " },
  { ...base, title: "a".repeat(201) },
  { ...base, priority: "invalid" },
  { ...base, timezone: "invalid" },
  { ...base, schedule: { type: "flexible", dueDate: "2026-02-30" } },
  { ...base, subtasks: [{ title: " " }] },
  { ...base, subtasks: Array.from({ length: 31 }, () => ({ title: "Step" })) },
  { ...base, estimatedMinutes: 0 },
  { ...base, estimatedMinutes: 1.5 },
  { ...fixed, estimatedMinutes: 61 },
  { ...fixed, schedule: { type: "fixed", startAt, endAt: startAt } },
  { ...fixed, schedule: { type: "fixed", startAt, endAt: startAt - 1 } },
])
  assert.equal(createTaskSchema.safeParse(task).success, false);
assert.equal(
  localDateKey(new Date("2026-10-29T20:00:00Z"), "Asia/Kolkata"),
  "2026-10-30",
);
assert.equal(
  localDateKey(new Date("2026-10-29T20:00:00Z"), "America/New_York"),
  "2026-10-29",
);
console.log(
  "PASS: task validation, optional domain/description/dates, schedule ordering, duration limits, subtasks, and timezone day boundaries.",
);

const now = new Date("2026-10-30T09:45:00Z");
const repeatingInput = { ...base, recurrence: { end: { type: "never" } } };
assert.equal(
  recurringDateIssues(
    {
      ...repeatingInput,
      schedule: { type: "flexible", dueDate: "2026-10-29" },
    },
    now,
  )[0].path[0],
  "schedule",
);
assert.equal(
  recurringDateIssues(
    {
      ...repeatingInput,
      schedule: { type: "flexible", dueDate: "2026-10-30" },
    },
    now,
  ).length,
  0,
);
assert.ok(
  recurringDateIssues(
    { ...repeatingInput, subtasks: [{ dueDate: "2026-10-29" }] },
    now,
  ).length,
);
assert.equal(
  recurringDateIssues(
    {
      ...repeatingInput,
      schedule: { type: "flexible", dueDate: "2026-11-10" },
      subtasks: [{ dueDate: "2026-11-01" }],
    },
    now,
  ).length,
  0,
);
assert.ok(
  recurringDateIssues(
    {
      ...repeatingInput,
      schedule: { type: "flexible", dueDate: "2026-11-10" },
      recurrence: { end: { type: "date", date: "2026-11-09" } },
    },
    now,
  ).length,
);
assert.equal(
  recurringDateIssues(
    {
      ...repeatingInput,
      schedule: { type: "flexible", dueDate: "2026-11-10" },
      recurrence: { end: { type: "date", date: "2026-11-10" } },
    },
    now,
  ).length,
  0,
);
assert.ok(
  recurringDateIssues(
    {
      ...repeatingInput,
      schedule: {
        type: "fixed",
        startAt: now.getTime() - 3600000,
        endAt: now.getTime() + 3600000,
      },
    },
    now,
  ).length,
);
assert.equal(
  recurringDateIssues(
    {
      ...repeatingInput,
      schedule: {
        type: "fixed",
        startAt: now.getTime(),
        endAt: now.getTime() + 3600000,
      },
    },
    now,
  ).length,
  0,
);
assert.equal(
  recurringDateIssues(
    { ...base, schedule: { type: "flexible", dueDate: "2026-10-01" } },
    now,
  ).length,
  0,
);
const boundary = new Date("2026-10-30T00:30:00Z");
assert.equal(
  recurringDateIssues(
    {
      ...repeatingInput,
      timezone: "America/New_York",
      schedule: { type: "flexible", dueDate: "2026-10-29" },
    },
    boundary,
  ).length,
  0,
);
assert.ok(
  recurringDateIssues(
    {
      ...repeatingInput,
      timezone: "Asia/Kolkata",
      schedule: { type: "flexible", dueDate: "2026-10-29" },
    },
    boundary,
  ).length,
);
assert.equal(
  recurringDateIssues(
    {
      ...repeatingInput,
      schedule: { type: "flexible", dueDate: "2026-10-30" },
    },
    new Date("2026-10-30T20:00:00Z"),
  ).length,
  1,
);
for (const duration of [
  { hours: 0, minutes: 0 },
  { hours: 24, minutes: 1 },
  { hours: -1, minutes: 0 },
  { hours: 1, minutes: 60 },
  { hours: 1.5, minutes: 0 },
])
  assert.equal(durationInputSchema.safeParse(duration).success, false);
assert.ok(durationInputSchema.safeParse({ hours: 1, minutes: 28 }).success);
console.log(
  "PASS: repeat past dates/times, end bounds, optional subtasks, future planning steps, timezone midnight boundaries, unchanged nonrepeat dates, and hours/minutes validation.",
);
