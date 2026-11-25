import assert from "node:assert/strict";
import { build } from "esbuild";
import { getFunctionName } from "convex/server";
import { context, db, records } from "./check-task-handlers.mjs";

const RealDate = Date;
let clock = RealDate.parse("2026-11-07T12:00:00Z");
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [clock])); }
  static now() { return clock; }
};
const priorEnabled = process.env.TEMPO_BACKGROUND_JOBS_ENABLED;
const vapidNames = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
const priorVapid = vapidNames.map(name => [name, process.env[name]]);
process.env.TEMPO_BACKGROUND_JOBS_ENABLED = "true";
const compile = async (file) => {
  const result = await build({ entryPoints: [file], bundle: true, platform: "node", format: "esm", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
};
const scheduled = await compile("convex/notificationScheduling.ts");
const notifications = await compile("convex/notifications.ts");
const jobs = new Map();
const pushes = [];
let nextJob = 0;
const schedule = (at, fn, args) => {
  const id = `scheduled-${++nextJob}`;
  jobs.set(id, { id, at, name: getFunctionName(fn), args: structuredClone(args) });
  return id;
};
const worker = {
  ...context(null),
  scheduler: {
    runAfter: async (delay, fn, args) => schedule(clock + delay, fn, args),
    runAt: async (at, fn, args) => schedule(at, fn, args),
    cancel: async (id) => jobs.delete(id),
  },
};
const owner = "scheduled-reminder-owner";
const account = { ...worker, auth: context(owner).auth };
async function execute(job) {
  if (job.name === "notificationPush:send") { pushes.push(job); return; }
  const [module, name] = job.name.split(":");
  assert.equal(module, "notificationScheduling", `Unexpected scheduled function: ${job.name}`);
  assert.ok(scheduled[name], `Missing scheduled handler ${name}`);
  await scheduled[name]._handler(worker, job.args);
}
async function drain(until, limit = 200) {
  let count = 0;
  for (;;) {
    const job = [...jobs.values()].filter(job => job.at <= until).sort((a,b) => a.at-b.at)[0];
    if (!job) break;
    assert.ok(++count <= limit, "scheduler must converge instead of looping");
    jobs.delete(job.id);
    clock = Math.max(clock, job.at);
    await execute(job);
  }
  clock = until;
}
const inbox = () => notifications.inbox._handler(account, {});
const addFixed = (title, startAt, fields = {}) => db.insert("tasks", {
  ownerId: owner, title, status: "open", progress: "not_started", priority: "medium",
  workDate: "2026-11-07", timezone: "UTC", subtasks: [],
  schedule: { type: "fixed", startAt, endAt: startAt + 3600000 }, ...fields,
});

try {
  await notifications.ensurePreferences._handler(account, { timezone: "UTC" });
  const preferences = await notifications.preferences._handler(account, {});
  await notifications.savePreferences._handler(account, { preferences: {
    ...preferences, rollForward: false, briefing: false, upcoming: true,
    deadlines: false, overdue: false, recurring: false, subtasks: false,
    upcomingMinutes: [15],
  } });
  const startAt = clock + 45 * 60000;
  const taskId = await addFixed("Scheduled exact lead", startAt);
  await scheduled.syncTaskNotifications(worker, taskId);
  await drain(startAt - 16 * 60000);
  assert.equal((await inbox()).items.length, 0, "no delivery before exact reminder lead");
  await drain(startAt - 15 * 60000);
  assert.equal((await inbox()).items.filter(item => item.taskId === taskId).length, 1, "delivery occurs at the selected lead without owner polling");
  await scheduled.syncTaskNotifications(worker, taskId);
  await drain(clock);
  assert.equal((await inbox()).items.filter(item => item.taskId === taskId).length, 1, "rebuild/delivery retries are deduplicated");

  for (const transition of ["rescheduled", "completed", "deleted", "preferences-disabled"]) {
    const before = (await inbox()).items.length;
    const dueAt = clock + 60 * 60000;
    const id = await addFixed(`Stale ${transition}`, dueAt);
    await scheduled.syncTaskNotifications(worker, id);
    await drain(clock);
    const stale = [...jobs.values()].find(job => job.name === "notificationScheduling:wake" && job.at === dueAt - 15 * 60000);
    assert.ok(stale, `${transition} task must have an exact wake`);
    if (transition === "rescheduled") {
      await db.patch(id, { schedule: { type: "fixed", startAt: dueAt + 86400000, endAt: dueAt + 86400000 + 3600000 } });
      await scheduled.syncTaskNotifications(worker, id);
    } else if (transition === "completed") {
      await db.patch(id, { status: "completed" });
      await scheduled.syncTaskNotifications(worker, id);
    } else if (transition === "deleted") {
      await db.delete(id);
      await scheduled.syncTaskNotifications(worker, id);
    } else {
      await notifications.savePreferences._handler(account, { preferences: { ...preferences, inApp: false, upcoming: false, rollForward: false } });
    }
    clock = stale.at;
    await execute(stale);
    assert.equal((await inbox()).items.length, before, `${transition} invalidates old pending reminders`);
  }
  console.log("PASS: scheduled exact leads, duplicate retry suppression and stale edit/complete/delete/preference guards.");

  const legacyOwner = "legacy-scheduled-owner";
  await db.insert("notificationAccounts", { ownerId: legacyOwner, preferences: { ...preferences, rollForward: false } });
  const legacyTask = await addFixed("Existing task migration", clock + 90 * 60000, { ownerId: legacyOwner });
  await scheduled.bootstrapOwners._handler(worker, {});
  await drain(clock);
  const migrated = [...records.values()].filter(row => row._id.startsWith("notificationSchedules-") && row.ownerId === legacyOwner);
  assert.ok(migrated.some(row => row.taskId === legacyTask), "existing owner/task data receives an exact schedule during bootstrap");
  await scheduled.bootstrapOwners._handler(worker, {});
  await drain(clock);
  assert.equal([...records.values()].filter(row => row._id.startsWith("notificationSchedules-") && row.ownerId === legacyOwner).length, migrated.length, "retrying bootstrap does not duplicate durable schedules");
  console.log("PASS: existing-data bootstrap creates schedules and is retry-safe.");

  for (const name of vapidNames) process.env[name] = "test-only";
  const deliveryPreferences = { ...preferences, rollForward: false, briefing: false, upcoming: true, deadlines: false, overdue: false, recurring: false, subtasks: false, upcomingMinutes: [15] };
  await notifications.savePreferences._handler(account, { preferences: deliveryPreferences });
  await notifications.registerPush._handler(account, {
    endpoint: "https://fcm.googleapis.com/fcm/send/scheduled-test", p256dh: "a".repeat(87), auth: "b".repeat(22), platform: "desktop",
  });
  const guardedTask = await addFixed("Guarded queued push", clock + 15 * 60000);
  await scheduled.syncTaskNotifications(worker, guardedTask);
  await drain(clock);
  const push = pushes.find(job => job.args.taskId === guardedTask);
  assert.ok(push, "scheduled delivery queues a push with invalidation guards");
  const guard = {
    ownerId: owner, taskId: guardedTask, notificationGeneration: push.args.notificationGeneration,
    notificationPreferences: push.args.notificationPreferences,
  };
  assert.equal((await notifications.deliveryDevices._handler(worker, guard)).length, 1, "valid current job can resolve its owner's device");
  assert.equal((await notifications.deliveryDevices._handler(worker, { ...guard, ownerId: "foreign-owner" })).length, 0, "push job cannot resolve a foreign owner's task/device");
  await db.patch(guardedTask, { status: "completed" });
  await scheduled.syncTaskNotifications(worker, guardedTask);
  assert.equal((await notifications.deliveryDevices._handler(worker, guard)).length, 0, "completion invalidates already queued pushes");
  await db.patch(guardedTask, { status: "open" });
  await scheduled.syncTaskNotifications(worker, guardedTask);
  assert.equal((await notifications.deliveryDevices._handler(worker, guard)).length, 0, "complete/reopen cannot reuse an old push generation");
  const reopenedJob = [...records.values()].find(row => row._id.startsWith("notificationSchedules-") && row.taskId === guardedTask);
  assert.ok(reopenedJob.generation > guard.notificationGeneration, "task generation remains monotonic across completion/reopen");
  await notifications.savePreferences._handler(account, { preferences: { ...deliveryPreferences, upcoming: false } });
  assert.equal((await notifications.deliveryDevices._handler(worker, { ...guard, notificationGeneration: reopenedJob.generation })).length, 0, "changed preferences invalidate a push before its network delivery");
  console.log("PASS: current push authorization, owner isolation, preference snapshots and completion/reopen generation safety.");

  const quietOwner = "scheduled-quiet-owner";
  const quietAccount = { ...worker, auth: context(quietOwner).auth };
  clock = RealDate.parse("2026-11-08T01:00:00Z");
  await notifications.ensurePreferences._handler(quietAccount, { timezone: "UTC" });
  await notifications.savePreferences._handler(quietAccount, { preferences: {
    ...deliveryPreferences, quietEnabled: true, quietDays: [6], quietPolicy: "digest",
  } });
  await notifications.registerPush._handler(quietAccount, {
    endpoint: "https://fcm.googleapis.com/fcm/send/scheduled-quiet-test", p256dh: "c".repeat(87), auth: "d".repeat(22), platform: "desktop",
  });
  for (const title of ["Quiet first", "Quiet second"]) {
    const id = await addFixed(title, clock + 10 * 60000, { ownerId: quietOwner, workDate: "2026-11-08" });
    await scheduled.syncTaskNotifications(worker, id);
  }
  await drain(clock);
  const digestJobs = [...jobs.values()].filter(job => job.name === "notificationPush:send" && job.args.ownerId === quietOwner && job.args.digestSettings);
  assert.equal(digestJobs.length, 1, "scheduled quiet reminders coalesce into one digest");
  assert.equal(digestJobs[0].at, RealDate.parse("2026-11-08T07:00:00Z"));
  assert.ok(digestJobs[0].args.notificationPreferences, "quiet digest carries the same preference snapshot guard as direct pushes");
  assert.equal((await notifications.inbox._handler(quietAccount, {})).unreadCount, 2, "quiet hours preserve in-app reminders");
  await notifications.savePreferences._handler(quietAccount, { preferences: { ...deliveryPreferences, upcoming: false, quietEnabled: true, quietDays: [6], quietPolicy: "digest" } });
  assert.equal((await notifications.deliveryDevices._handler(worker, {
    ownerId: quietOwner, digestSettings: digestJobs[0].args.digestSettings,
    notificationPreferences: digestJobs[0].args.notificationPreferences,
  })).length, 0, "a queued quiet digest is suppressed after reminder preferences change");
  await notifications.savePreferences._handler(quietAccount, { preferences: {
    ...deliveryPreferences, upcomingMinutes: [10], quietEnabled: true, quietDays: [6], quietPolicy: "digest",
  } });
  await drain(clock);
  const updatedDigests = [...jobs.values()].filter(job => job.name === "notificationPush:send" && job.args.ownerId === quietOwner && job.args.digestSettings);
  assert.equal(updatedDigests.length, 2, "changed preferences can schedule a new valid digest in the same quiet window");
  assert.equal(new Set(updatedDigests.map(job => job.args.key)).size, 2, "old digest dedupe marker does not suppress the new preference generation");
  console.log("PASS: exact scheduled reminders preserve overnight quiet-hour inbox delivery, digest dedupe and preference-change suppression.");

  const dailyOwner = "scheduled-daily-owner";
  const dailyAccount = { ...worker, auth: context(dailyOwner).auth };
  await notifications.ensurePreferences._handler(dailyAccount, { timezone: "UTC" });
  await notifications.savePreferences._handler(dailyAccount, { preferences: {
    ...deliveryPreferences, upcoming: false, recurring: true, subtasks: true, overdue: true,
  } });
  const dailyTask = await db.insert("tasks", {
    ownerId: dailyOwner, title: "Scheduled recurring work", status: "open", priority: "medium", timezone: "UTC", workDate: "2026-11-09",
    schedule: { type: "flexible", dueDate: "2026-11-09" }, subtasks: [], subtasksNormalized: true,
    recurrence: { frequency: "daily", interval: 1, unit: "day", end: { type: "never" } },
  });
  await db.insert("subtasks", { parentTaskId: dailyTask, title: "Scheduled normalized step", position: 0, dueDate: "2026-11-09", requestId: "scheduled-step" });
  await scheduled.syncTaskNotifications(worker, dailyTask);
  await drain(clock);
  assert.equal((await notifications.inbox._handler(dailyAccount, {})).items.length, 0, "future recurring/subtask daily reminders do not arrive early");
  await drain(RealDate.parse("2026-11-09T00:00:00Z"));
  const firstDaily = await notifications.inbox._handler(dailyAccount, {});
  assert.equal(firstDaily.items.filter(item => item.title === "Recurring task today").length, 1);
  assert.equal(firstDaily.items.filter(item => item.title === "Subtask due today").length, 1, "normalized subtasks are delivered on their scheduled local day");
  await scheduled.syncTaskNotifications(worker, dailyTask);
  await drain(clock);
  assert.equal((await notifications.inbox._handler(dailyAccount, {})).items.length, 2, "same-day rebuild does not duplicate daily reminders");
  await drain(RealDate.parse("2026-11-10T00:00:00Z"));
  assert.equal((await notifications.inbox._handler(dailyAccount, {})).items.filter(item => item.title === "Overdue task").length, 1);
  await scheduled.syncTaskNotifications(worker, dailyTask);
  await drain(clock);
  assert.equal((await notifications.inbox._handler(dailyAccount, {})).items.filter(item => item.title === "Overdue task").length, 1, "overdue reminder runs once per day instead of per minute");
  console.log("PASS: scheduled recurring, normalized-subtask and overdue daily reminders with same-day dedupe.");

  const briefingOwner = "scheduled-briefing-owner";
  const briefingAccount = { ...worker, auth: context(briefingOwner).auth };
  await notifications.ensurePreferences._handler(briefingAccount, { timezone: "UTC" });
  await notifications.savePreferences._handler(briefingAccount, { preferences: {
    ...deliveryPreferences, upcoming: false, briefing: true, briefingDays: [0,1,2,3,4,5,6], briefingTime: "08:00", rollForward: true,
  } });
  await addFixed("Today's planned item", clock + 10 * 3600000, { ownerId: briefingOwner, workDate: "2026-11-10" });
  await drain(RealDate.parse("2026-11-10T07:59:00Z"));
  assert.equal((await notifications.inbox._handler(briefingAccount, {})).items.length, 0, "briefing does not send before its configured time");
  await drain(RealDate.parse("2026-11-10T08:00:00Z"));
  assert.equal((await notifications.inbox._handler(briefingAccount, {})).items.filter(item => item.title === "Daily briefing").length, 1);
  await scheduled.syncOwnerDailyNotifications(worker, briefingOwner);
  await drain(clock);
  assert.equal((await notifications.inbox._handler(briefingAccount, {})).items.length, 1, "briefing remains daily after owner refresh");
  const rolled = await addFixed("Maintenance rolled work", clock + 3600000, { ownerId: briefingOwner, workDate: "2026-11-10", lastRolledOn: "2026-11-10" });
  await scheduled.syncOwnerDailyNotifications(worker, briefingOwner);
  await drain(clock);
  assert.ok((await notifications.inbox._handler(briefingAccount, {})).items.some(item => item.title === "Tasks rolled forward" && item.taskId === rolled), "maintenance refresh delivers roll-forward notification even after a prior empty midnight wake");
  console.log("PASS: exact daily briefing, daily dedupe and post-maintenance roll-forward owner refresh.");

  const recoverTask = await addFixed("Lost timer recovery", clock + 60 * 60000, { ownerId: legacyOwner });
  await scheduled.syncTaskNotifications(worker, recoverTask);
  await drain(clock);
  const recoverRow = [...records.values()].find(row => row._id.startsWith("notificationSchedules-") && row.taskId === recoverTask);
  for (const [key, job] of jobs) if (job.name === "notificationScheduling:wake" && job.args.id === recoverRow._id) jobs.delete(key);
  clock += 45 * 60000;
  await scheduled.reconcile._handler(worker, {});
  await drain(clock);
  assert.ok((await notifications.inbox._handler({ ...worker, auth: context(legacyOwner).auth }, {})).items.some(item => item.taskId === recoverTask), "hourly recovery repairs a lost due timer while its lead remains valid");
  console.log("PASS: due-queue reconciliation repairs a lost delivery timer without a task-table scan.");

  const deadlineOwner = "scheduled-deadline-owner";
  const deadlineAccount = { ...worker, auth: context(deadlineOwner).auth };
  await notifications.ensurePreferences._handler(deadlineAccount, { timezone: "UTC" });
  await notifications.savePreferences._handler(deadlineAccount, { preferences: {
    ...deliveryPreferences, upcoming: false, deadlines: true, deadlineMinutes: [60],
  } });
  const deadlineTask = await db.insert("tasks", {
    ownerId: deadlineOwner, title: "Exact deadline reminder", status: "open", priority: "medium", timezone: "UTC",
    workDate: "2026-11-10", schedule: { type: "flexible", dueDate: "2026-11-10" }, subtasks: [],
  });
  await scheduled.syncTaskNotifications(worker, deadlineTask);
  await drain(RealDate.parse("2026-11-10T22:59:00Z"));
  assert.equal((await notifications.inbox._handler(deadlineAccount, {})).items.length, 0);
  await drain(RealDate.parse("2026-11-10T23:00:00Z"));
  assert.ok((await notifications.inbox._handler(deadlineAccount, {})).items.some(item => item.taskId === deadlineTask && item.title === "Deadline approaching"), "deadline reminder is scheduled relative to the stored due-date end, not the next hourly scan");
  console.log("PASS: flexible deadline reminder is delivered at its exact configured lead.");

  const queried = [];
  const originalQuery = db.query;
  const originalGet = db.get;
  db.get = async function(id) { queried.push({ get: id }); return originalGet.call(this, id); };
  db.query = function(table) {
    const result = originalQuery.call(this, table);
    const originalIndex = result.withIndex;
    result.withIndex = function(name, constrain) {
      const constraints = [];
      queried.push({ table, index: name, constraints });
      return originalIndex.call(this, name, (q) => {
        const capture = {};
        for (const operation of ["eq", "gt", "gte", "lt", "lte"])
          capture[operation] = (...args) => { constraints.push({operation, args}); q[operation](...args); return capture; };
        return constrain(capture);
      });
    };
    queried.push({table});
    return result;
  };
  try {
    await scheduled.reconcile._handler(worker, {});
    assert.ok(!queried.some(row => row.table === "tasks"), "hourly recovery must not scan all tasks");
    assert.ok(queried.some(row => row.table === "notificationSchedules" && row.index === "by_nextRunAt"
      && row.constraints.some(clause => clause.operation === "gte" && clause.args[0] === "nextRunAt" && clause.args[1] === 0)
      && row.constraints.some(clause => clause.operation === "lte" && clause.args[0] === "nextRunAt")),
      "recovery index is bounded on both sides so undefined idle jobs are excluded under Convex ordering");
    queried.length = 0;
    process.env.TEMPO_BACKGROUND_JOBS_ENABLED = "false";
    const before = jobs.size;
    await scheduled.reconcile._handler(worker, {});
    await scheduled.syncTaskNotifications(worker, taskId);
    assert.equal(queried.length, 0, "disabled background jobs do not read schedule/task tables");
    assert.equal(jobs.size, before, "disabled development scans do not schedule work");
  } finally { db.query = originalQuery; db.get = originalGet; }
  console.log("PASS: indexed bounded recovery and opt-in disabled-background no-I/O gate.");
} finally {
  globalThis.Date = RealDate;
  for (const [name, value] of priorVapid) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  if (priorEnabled === undefined) delete process.env.TEMPO_BACKGROUND_JOBS_ENABLED;
  else process.env.TEMPO_BACKGROUND_JOBS_ENABLED = priorEnabled;
}
