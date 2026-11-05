import assert from "node:assert/strict";
import { build } from "esbuild";
import { context, db } from "./check-task-handlers.mjs";

const compiled = await build({
  entryPoints: ["convex/notifications.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const notifications = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const alice = context("reminder-alice");
const bob = context("reminder-bob");
const now = Date.parse("2026-11-07T12:00:00Z");
const minute = 60_000;
const ownerId = "reminder-alice";
const otherOwner = "reminder-bob";
const readInbox = (ctx = alice) => notifications.inbox._handler(ctx, {});
const processOwner = (owner = ownerId, timestamp = now) =>
  notifications.processOwner._handler(context(null), { ownerId: owner, now: timestamp });

await notifications.ensurePreferences._handler(alice, { timezone: "UTC" });
await notifications.ensurePreferences._handler(bob, { timezone: "UTC" });
assert.deepEqual(await readInbox(context(null)), { items: [], unreadCount: 0 });
const preferences = await notifications.preferences._handler(alice, {});
await assert.rejects(() =>
  notifications.savePreferences._handler(alice, {
    preferences: { ...preferences, timezone: "Invalid/Zone" },
  }),
);
for (const ctx of [alice, bob]) {
  await notifications.savePreferences._handler(ctx, {
    preferences: { ...preferences, deadlines: false },
  });
}

async function fixedTask(title, minutesUntilStart, overrides = {}) {
  const startAt = now + minutesUntilStart * minute;
  return db.insert("tasks", {
    ownerId,
    title,
    status: "open",
    priority: "medium",
    timezone: "UTC",
    workDate: "2026-11-07",
    schedule: { type: "fixed", startAt, endAt: startAt + 60 * minute },
    subtasks: [],
    ...overrides,
  });
}

const due = await fixedTask("Fixed block", 15);
const future = await fixedTask("Future block", 45);
await fixedTask("Started block", -1);
await fixedTask("Completed block", 15, { status: "completed" });
const foreign = await fixedTask("Another person's block", 15, { ownerId: otherOwner });

await processOwner(ownerId, now - minute);
assert.equal((await readInbox()).items.length, 0, "no reminder before its lead window");
await processOwner();
await processOwner();
const aliceInbox = await readInbox();
assert.deepEqual(aliceInbox.items.map((item) => item.taskId), [due]);
assert.equal(aliceInbox.unreadCount, 1);
assert.equal((await readInbox(bob)).items.length, 0);

await processOwner(otherOwner);
const bobInbox = await readInbox(bob);
assert.deepEqual(bobInbox.items.map((item) => item.taskId), [foreign]);
const aliceId = aliceInbox.items[0]._id;
await assert.rejects(() => notifications.markRead._handler(bob, { id: aliceId }));
await notifications.markRead._handler(alice, { id: aliceId });
assert.equal((await readInbox()).unreadCount, 0);
assert.equal((await readInbox()).items[0].read, true);

await notifications.clearAll._handler(alice, {});
await processOwner();
assert.equal((await readInbox()).items.length, 0, "cleared reminder stays cleared after a retry");
assert.equal((await readInbox(bob)).unreadCount, 1, "clear all affects only its owner");
await notifications.dismiss._handler(bob, { id: bobInbox.items[0]._id });
await processOwner(otherOwner);
assert.equal((await readInbox(bob)).items.length, 0, "dismissed reminder stays dismissed after a retry");
await processOwner(ownerId, now + 30 * minute);
assert.deepEqual(
  (await readInbox()).items.map((item) => item.taskId),
  [future],
  "clear all leaves subsequent reminders visible",
);
await notifications.clearAll._handler(alice, {});
assert.deepEqual(
  await readInbox(),
  { items: [], unreadCount: 0 },
  "a second clear in the same clock tick removes newly delivered reminders",
);
console.log("PASS: reminder lead window, open task eligibility, retry dedupe, owner isolation, read, dismiss and clear all.");

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/mock",
  p256dh: "a".repeat(87),
  auth: "b".repeat(22),
  platform: "desktop",
};
const registerPush = (ctx, fields = {}) =>
  notifications.registerPush._handler(ctx, { ...subscription, ...fields });
const getDevices = (ctx) => notifications.pushDevices._handler(ctx, {});
await assert.rejects(() => registerPush(alice, { endpoint: "https://localhost/private" }));
await registerPush(alice);
assert.deepEqual(await getDevices(alice), [
  { endpoint: subscription.endpoint, platform: "desktop" },
]);
await assert.rejects(() => registerPush(bob, { auth: "c".repeat(22) }));
await registerPush(bob);
assert.deepEqual(await getDevices(alice), []);
assert.equal((await getDevices(bob)).length, 1);
await notifications.unregisterPush._handler(alice, { endpoint: subscription.endpoint });
assert.equal((await getDevices(bob)).length, 1);
console.log("PASS: push endpoint validation, account switching, and device ownership.");

const pending = [];
const pushContext = {
  ...context(null),
  scheduler: {
    runAt: async (time, _fn, args) => pending.push({ time, args }),
    runAfter: async (delay, _fn, args) => pending.push({ delay, args }),
  },
};
const vapidVariables = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
const previousVapidValues = vapidVariables.map((key) => [key, process.env[key]]);
for (const key of vapidVariables) process.env[key] = "test-only";
try {
  const night = Date.parse("2026-11-08T01:00:00Z");
  const starts = night + 10 * minute;
  await notifications.savePreferences._handler(bob, {
    preferences: {
      ...preferences,
      deadlines: false,
      quietEnabled: true,
      quietDays: [6],
      quietPolicy: "digest",
    },
  });
  for (const title of ["First nighttime reminder", "Second nighttime reminder"]) {
    await fixedTask(title, 0, {
      ownerId: otherOwner,
      workDate: "2026-11-08",
      schedule: { type: "fixed", startAt: starts, endAt: starts + minute },
    });
  }
  await notifications.processOwner._handler(pushContext, { ownerId: otherOwner, now: night });
  await notifications.processOwner._handler(pushContext, { ownerId: otherOwner, now: night });
  assert.equal((await readInbox(bob)).unreadCount, 2);
  assert.equal(pending.length, 1, "a Saturday quiet window continues into Sunday and sends one digest");
  assert.equal(pending[0].time, Date.parse("2026-11-08T07:00:00Z"));
} finally {
  for (const [key, value] of previousVapidValues) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
console.log("PASS: overnight quiet hours preserve in-app delivery and coalesce push into a digest.");

const toggleOwner = "reminder-toggle";
const toggleContext = context(toggleOwner);
const deadline = await db.insert("tasks", {
  ownerId: toggleOwner,
  title: "Submit the report",
  status: "open",
  priority: "medium",
  timezone: "UTC",
  workDate: "2026-11-07",
  schedule: { type: "flexible", dueDate: "2026-11-07" },
  subtasks: [],
});
const deadlineWindow = Date.parse("2026-11-07T23:00:00Z");
const saveTogglePreferences = (inApp, deadlines) =>
  notifications.savePreferences._handler(toggleContext, {
    preferences: { ...preferences, inApp, deadlines, upcoming: false, rollForward: false, deadlineMinutes: [60] },
  });

await saveTogglePreferences(false, true);
await processOwner(toggleOwner, deadlineWindow);
assert.equal((await readInbox(toggleContext)).items.length, 0);
await saveTogglePreferences(true, false);
await processOwner(toggleOwner, deadlineWindow);
assert.equal((await readInbox(toggleContext)).items.length, 0);
await saveTogglePreferences(true, true);
await processOwner(toggleOwner, deadlineWindow - minute);
assert.equal((await readInbox(toggleContext)).items.length, 0);
await processOwner(toggleOwner, deadlineWindow);
assert.deepEqual(
  (await readInbox(toggleContext)).items.map(({ taskId, body }) => ({ taskId, body })),
  [{ taskId: deadline, body: "Submit the report" }],
);
console.log("PASS: saved channel and trigger toggles gate delivery from the stored due date and title.");
