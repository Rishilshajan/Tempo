import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
// New-task defaults must remain future-facing in the task timezone, including
// midnight and daylight-saving changes. Explicit timeline picks stay exact.
const defaultsBundle = await build({
  entryPoints: ["src/lib/task-time-defaults.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { taskTimeDefaults } = await import(
  `data:text/javascript;base64,${Buffer.from(defaultsBundle.outputFiles[0].text).toString("base64")}`
);
const evening = taskTimeDefaults(Date.parse("2026-11-24T14:52:36Z"), "Asia/Kolkata");
assert.equal(evening.startAt, Date.parse("2026-11-24T15:00:00Z"));
assert.equal(evening.endAt - evening.startAt, 3600000);
const midnight = taskTimeDefaults(Date.parse("2026-11-24T18:26:00Z"), "Asia/Kolkata");
assert.equal(midnight.startAt, Date.parse("2026-11-24T18:30:00Z"));
assert.equal(midnight.endAt, Date.parse("2026-11-24T19:30:00Z"));
const quarter = taskTimeDefaults(Date.parse("2026-11-24T10:00:00Z"), "UTC");
assert.equal(quarter.startAt, Date.parse("2026-11-24T10:15:00Z"));
const futureDay = taskTimeDefaults(Date.parse("2026-11-24T14:52:36Z"), "Asia/Kolkata", "2026-11-26");
assert.equal(futureDay.startAt, Date.parse("2026-11-26T03:30:00Z"));
const explicit = Date.parse("2026-11-24T03:37:00Z");
assert.equal(taskTimeDefaults(Date.parse("2026-11-24T14:52:36Z"), "Asia/Kolkata", "2026-11-26", explicit).startAt, explicit);
const spring = taskTimeDefaults(Date.parse("2026-03-08T06:41:00Z"), "America/New_York");
assert.equal(spring.startAt, Date.parse("2026-03-08T06:45:00Z"));
assert.equal(spring.endAt, Date.parse("2026-03-08T07:45:00Z"));
const autumn = taskTimeDefaults(Date.parse("2026-11-01T05:56:00Z"), "America/New_York");
assert.equal(autumn.startAt, Date.parse("2026-11-01T06:00:00Z"));
assert.equal(autumn.endAt - autumn.startAt, 3600000);
console.log("PASS: future quarter-hour task defaults, date rollover, future-date prefills, explicit timeline picks and DST transitions.");
const RealDate = Date;
const clock = RealDate.parse("2026-01-01T12:00:00Z");
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [clock]));
  }
  static now() {
    return clock;
  }
};
const bundled = await build({
  entryPoints: ["src/lib/validation/task.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { createTaskSchema, localDateKey, taskDateIssues, durationInputSchema } =
  await import(
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
const weekdays = {
  frequency: "weekdays",
  interval: 1,
  unit: "day",
  end: { type: "never" },
};
assert.ok(
  !createTaskSchema.safeParse({
    ...base,
    schedule: { type: "flexible", dueDate: "2026-10-31" },
    recurrence: weekdays,
  }).success,
);
assert.ok(
  createTaskSchema.safeParse({
    ...base,
    schedule: { type: "flexible", dueDate: "2026-11-02" },
    recurrence: weekdays,
  }).success,
);
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
assert.ok(createTaskSchema.safeParse({...fixed,estimatedMinutes:61}).success,"Effort estimate is independent of booked time");
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
  taskDateIssues(
    {
      ...repeatingInput,
      schedule: { type: "flexible", dueDate: "2026-10-29" },
    },
    now,
  )[0].path[0],
  "schedule",
);
assert.equal(
  taskDateIssues(
    {
      ...repeatingInput,
      schedule: { type: "flexible", dueDate: "2026-10-30" },
    },
    now,
  ).length,
  0,
);
assert.ok(
  taskDateIssues(
    { ...repeatingInput, subtasks: [{ dueDate: "2026-10-29" }] },
    now,
  ).length,
);
assert.equal(
  taskDateIssues(
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
  taskDateIssues(
    {
      ...repeatingInput,
      schedule: { type: "flexible", dueDate: "2026-11-10" },
      recurrence: { end: { type: "date", date: "2026-11-09" } },
    },
    now,
  ).length,
);
assert.equal(
  taskDateIssues(
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
  taskDateIssues(
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
  taskDateIssues(
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
  taskDateIssues(
    { ...base, schedule: { type: "flexible", dueDate: "2026-10-01" } },
    now,
  ).length,
  1,
);
const boundary = new Date("2026-10-30T00:30:00Z");
assert.equal(
  taskDateIssues(
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
  taskDateIssues(
    {
      ...repeatingInput,
      timezone: "Asia/Kolkata",
      schedule: { type: "flexible", dueDate: "2026-10-29" },
    },
    boundary,
  ).length,
);
assert.equal(
  taskDateIssues(
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
  "PASS: past dates blocked for all tasks, repeat time limits, end bounds, optional subtasks, future planning steps, timezone midnight boundaries, and hours/minutes validation.",
);
assert.ok(
  taskDateIssues({ ...base, subtasks: [{ dueDate: "2026-10-29" }] }, now)
    .length,
);
assert.equal(
  taskDateIssues(
    { ...base, schedule: { type: "flexible", dueDate: "2026-10-30" } },
    now,
  ).length,
  0,
);
globalThis.Date = RealDate;

// Schema paths must reveal the matching task-form control after error rendering.
const focusBundle = await build({
  entryPoints: ["src/components/tasks/task-form-validation.ts"],
  bundle: true, platform: "node", format: "esm", write: false,
});
const { taskIssueSelector, focusTaskIssue } = await import(
  "data:text/javascript;base64," + Buffer.from(focusBundle.outputFiles[0].text).toString("base64")
);
assert.equal(taskIssueSelector({ path: ["title"], message: "Required" }), "#task-title");
assert.equal(taskIssueSelector({ path: ["schedule"], message: "The first repeating time slot must start now or in the future." }), '[aria-label="Start time"]');
assert.equal(taskIssueSelector({ path: ["schedule"], message: "End time must be later than start time." }), '[aria-label="End time"]');
assert.match(taskIssueSelector({ path: ["schedule"], message: "Choose a future date." }), /due-date/);
assert.equal(taskIssueSelector({ path: ["estimatedMinutes", "minutes"], message: "Invalid minutes" }), '[aria-label="Estimated minutes"]');
assert.equal(taskIssueSelector({ path: ["recurrence"], message: "Repeat end date must be today or later." }), '[aria-label="Repeat end date"]');
assert.equal(taskIssueSelector({ path: ["subtasks", 2, "title"], message: "Required" }), '[aria-label="Subtask 3 title"]');
assert.equal(taskIssueSelector({ path: ["subtasks", 2, "dueDate"], message: "Past date" }), '[aria-label="Subtask 3 date (Optional)"]');
const previousAnimationFrame = globalThis.requestAnimationFrame;
try {
  let frame;
  globalThis.requestAnimationFrame = (callback) => { frame = callback; return 1; };
  const focusCalls = [];
  const control = {
    scrollIntoView: (options) => focusCalls.push(["scroll", options.block]),
    focus: (options) => focusCalls.push(["focus", options.preventScroll]),
  };
  const form = { isConnected: true, querySelector: (selector) => selector === "#task-title" ? control : null };
  focusTaskIssue(form, { path: ["title"], message: "Required" });
  assert.deepEqual(focusCalls, []);
  frame();
  assert.deepEqual(focusCalls, [["scroll", "center"], ["focus", true]]);
  focusCalls.length = 0;
  focusTaskIssue({ ...form, isConnected: false }, { path: ["title"], message: "Required" });
  frame();
  assert.deepEqual(focusCalls, []);
} finally {
  if (previousAnimationFrame === undefined) delete globalThis.requestAnimationFrame;
  else globalThis.requestAnimationFrame = previousAnimationFrame;
}
console.log("PASS: task-form first-error selectors, minutes/subtask-date targeting, deferred focus/scroll and detached-form guard.");

// Render the real schedule section with its state hook to guard progressive
// duration disclosure; this does not connect to a backend or create records.
const estimateBundle = await build({
  stdin: {
    contents: `
      import React from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import { TaskFormSchedule } from "./src/components/tasks/task-form-schedule";
      import { useTaskFormState } from "./src/components/tasks/use-task-form-state";
      function Harness({ duration }) {
        const model = useTaskFormState({
          open: true, onOpenChange: () => {}, domains: [], canSubmit: true,
          onCreate: async () => {}, saving: false, setSaving: () => {},
          inFlightRef: { current: false },
        });
        return <TaskFormSchedule model={{ ...model, duration }} />;
      }
      export const renderEstimate = (duration) => renderToStaticMarkup(<Harness duration={duration} />);
    `,
    resolveDir: process.cwd(), loader: "tsx",
  },
  bundle: true, platform: "node", format: "cjs", packages: "external",
  jsx: "automatic", write: false,
});
const estimateModule = { exports: {} };
new Function("require", "module", "exports", estimateBundle.outputFiles[0].text)(
  createRequire(import.meta.url), estimateModule, estimateModule.exports,
);
for (const duration of ["none", "15", "60"])
  assert.doesNotMatch(estimateModule.exports.renderEstimate(duration), /aria-label="Estimated (hours|minutes)"/);
const customEstimate = estimateModule.exports.renderEstimate("custom");
assert.match(customEstimate, /aria-label="Estimated hours"/);
assert.match(customEstimate, /aria-label="Estimated minutes"/);
console.log("PASS: real schedule section hides custom duration inputs for no estimate/presets and reveals them for Custom.");
