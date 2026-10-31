// Real Convex handlers, isolated in memory; no customer or sample data is written.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import {
  db,
  records,
  context,
  functions as tasks,
  steps,
} from "./check-task-handlers.mjs";

const bundle = await build({
  entryPoints: ["convex/taskDetails.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const details = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const alice = context("details-alice");
const bob = context("details-bob");
const rows = (table) =>
  [...records.values()].filter((row) => row._id.startsWith(`${table}-`));
const events = (taskId) =>
  rows("activity").filter((row) => row.taskId === taskId);
const future = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
const input = {
  title: "Drawer checks",
  priority: "medium",
  schedule: { type: "flexible", dueDate: future },
  timezone: "UTC",
  subtasks: [],
  requestId: randomUUID(),
};
const id = await tasks.create._handler(alice, input);
const other = await tasks.create._handler(alice, {
  ...input,
  title: "Related task",
  requestId: randomUUID(),
});
const foreign = await tasks.create._handler(bob, {
  ...input,
  title: "Private task",
  requestId: randomUUID(),
});
// Convex mutations are atomic: reproduce rollback when testing handlers directly.
async function invoke(fn, ctx, args) {
  const snapshot = structuredClone([...records.entries()]);
  try {
    return await fn._handler(ctx, args);
  } catch (error) {
    records.clear();
    for (const [key, value] of snapshot) records.set(key, value);
    throw error;
  }
}
const page = { numItems: 1000, cursor: null };
for (const fn of [
  details.listNotes,
  details.listActivity,
  details.threadsForTask,
]) {
  await assert.rejects(() =>
    invoke(fn, bob, { taskId: id, paginationOpts: page }),
  );
  await assert.rejects(() =>
    invoke(fn, context(null), { taskId: id, paginationOpts: page }),
  );
}
await assert.rejects(() =>
  invoke(details.listThreads, context(null), { paginationOpts: page }),
);
assert.equal(
  (
    await details.listNotes._handler(alice, {
      taskId: id,
      paginationOpts: page,
    })
  ).page.length,
  0,
);

const stepRequest = randomUUID();
const first = await invoke(details.addSubtask, alice, {
  taskId: id,
  title: "  First step  ",
  dueDate: future,
  scheduledDate: future,
  requestId: stepRequest,
});
assert.equal(
  await invoke(details.addSubtask, alice, {
    taskId: id,
    title: "First step",
    requestId: stepRequest,
  }),
  first,
);
assert.equal(steps(id).length, 1);
assert.equal(steps(id)[0].title, "First step");
const second = await invoke(details.addSubtask, alice, {
  taskId: id,
  title: "Second step",
  requestId: randomUUID(),
});
await invoke(details.moveSubtask, alice, {
  taskId: id,
  subtaskId: second,
  direction: "up",
});
assert.deepEqual(
  steps(id).map((row) => row._id),
  [second, first],
);
const beforeBoundary = events(id).length;
await invoke(details.moveSubtask, alice, {
  taskId: id,
  subtaskId: second,
  direction: "up",
});
assert.equal(events(id).length, beforeBoundary);
await invoke(details.updateSubtask, alice, {
  taskId: id,
  subtaskId: first,
  title: "Renamed step",
});
assert.equal(records.get(first).dueDate, undefined);
await assert.rejects(() =>
  invoke(details.updateSubtask, alice, {
    taskId: other,
    subtaskId: first,
    title: "Wrong parent",
  }),
);
await assert.rejects(() =>
  invoke(details.addSubtask, bob, {
    taskId: id,
    title: "Unauthorized",
    requestId: randomUUID(),
  }),
);
await assert.rejects(() =>
  invoke(details.addSubtask, alice, {
    taskId: id,
    title: " ",
    requestId: randomUUID(),
  }),
);
await assert.rejects(() =>
  invoke(details.addSubtask, alice, {
    taskId: id,
    title: "Past",
    dueDate: "2020-01-01",
    requestId: randomUUID(),
  }),
);
await invoke(tasks.setCompleted, alice, {
  id,
  subtaskId: first,
  completed: true,
});
const completedAt = records.get(first).completedAt;
assert.equal(typeof completedAt, "number");
const count = events(id).length;
await invoke(tasks.setCompleted, alice, {
  id,
  subtaskId: first,
  completed: true,
});
assert.equal(events(id).length, count);
assert.equal(records.get(first).completedAt, completedAt);
assert.equal(records.get(id).status, "open");
await invoke(tasks.setCompleted, alice, {
  id,
  subtaskId: first,
  completed: false,
});
assert.equal(records.get(first).completedAt, undefined);
await invoke(details.deleteSubtask, alice, { taskId: id, subtaskId: second });
assert.equal(records.has(second), false);
assert.deepEqual(
  steps(id).map((row) => row.position),
  [0],
);
for (let index = 1; index < 30; index++)
  await invoke(details.addSubtask, alice, {
    taskId: id,
    title: `Step ${index}`,
    requestId: randomUUID(),
  });
await assert.rejects(() =>
  invoke(details.addSubtask, alice, {
    taskId: id,
    title: "31st",
    requestId: randomUUID(),
  }),
);
assert.equal(steps(id).length, 30);
assert.equal((await tasks.get._handler(alice, { id })).subtasks.length, 30);
console.log(
  "PASS: normalized subtask CRUD, ordering, dates, 30-step bound, live DTOs, completion idempotency, and ownership.",
);

const legacy = await db.insert("tasks", {
  ...input,
  ownerId: "details-alice",
  status: "open",
  workDate: future,
  requestId: randomUUID(),
  subtasks: [
    {
      id: "legacy-first",
      title: "Keep completed history",
      dueDate: "2020-01-01",
      completedAt: 1234,
    },
    { id: "legacy-second", title: "Keep order" },
  ],
});
let cursor = null;
do {
  const result = await invoke(details.migrateSubtasks, alice, { cursor });
  cursor = result.isDone ? null : result.cursor;
} while (cursor);
assert.equal(records.get(legacy).subtasks.length, 0);
assert.equal(steps(legacy)[0].completedAt, 1234);
assert.equal(steps(legacy)[0].dueDate, "2020-01-01");
assert.equal(steps(legacy)[0].legacyId, "legacy-first");
assert.deepEqual(
  steps(legacy).map((row) => row.title),
  ["Keep completed history", "Keep order"],
);
assert.equal(events(legacy).length, 0);
await invoke(details.updateSubtask, alice, {
  taskId: legacy,
  subtaskId: steps(legacy)[0]._id,
  title: "Rename without losing historical date",
  dueDate: "2020-01-01",
});
await invoke(tasks.setCompleted, alice, {
  id: legacy,
  subtaskId: "legacy-first",
  completed: false,
});
assert.equal(steps(legacy)[0].completedAt, undefined);
const normalizedCount = rows("subtasks").length;
cursor = null;
do {
  const result = await invoke(details.migrateSubtasks, alice, { cursor });
  assert.equal(result.migrated, 0);
  cursor = result.isDone ? null : result.cursor;
} while (cursor);
assert.equal(rows("subtasks").length, normalizedCount);
console.log(
  "PASS: resumable migration preserves dates, order, completion timestamps, and old-client step references without fabricated history.",
);

const noteRequest = randomUUID();
const noteArgs = {
  taskId: id,
  title: "Design decision",
  content:
    "## Decision\nUse **indexed references**.\n\n[Reference](https://example.com)",
  type: "decision",
  requestId: noteRequest,
};
const noteId = await invoke(details.saveNote, alice, noteArgs);
assert.equal(await invoke(details.saveNote, alice, noteArgs), noteId);
assert.equal(records.get(id).notesCount, 1);
await assert.rejects(() =>
  invoke(details.saveNote, bob, { ...noteArgs, requestId: randomUUID() }),
);
await assert.rejects(() =>
  invoke(details.saveNote, alice, { ...noteArgs, taskId: other, noteId }),
);
await assert.rejects(() =>
  invoke(details.saveNote, alice, {
    ...noteArgs,
    content: " ",
    requestId: randomUUID(),
  }),
);
await assert.rejects(() =>
  invoke(details.saveNote, alice, {
    ...noteArgs,
    content: "x".repeat(20001),
    requestId: randomUUID(),
  }),
);
await assert.rejects(() =>
  invoke(details.saveNote, alice, {
    ...noteArgs,
    type: "invalid",
    requestId: randomUUID(),
  }),
);
await invoke(details.saveNote, alice, {
  ...noteArgs,
  noteId,
  title: "Output",
  type: "output",
  content: "Completed deliverable.",
});
const unchanged = events(id).length;
await invoke(details.saveNote, alice, {
  ...noteArgs,
  noteId,
  title: "Output",
  type: "output",
  content: "Completed deliverable.",
});
assert.equal(events(id).length, unchanged);
assert.equal(records.get(noteId).type, "output");
await assert.rejects(() =>
  invoke(details.deleteNote, alice, { taskId: other, noteId }),
);
await invoke(details.deleteNote, alice, { taskId: id, noteId });
await invoke(details.deleteNote, alice, { taskId: id, noteId });
assert.equal(records.get(id).notesCount, 0);
for (let index = 0; index < 35; index++)
  await invoke(details.saveNote, alice, {
    ...noteArgs,
    title: `Note ${index}`,
    requestId: randomUUID(),
  });
const notes = await details.listNotes._handler(alice, {
  taskId: id,
  paginationOpts: page,
});
assert.equal(notes.page.length, 30);
assert.equal(notes.isDone, false);
assert.equal(
  (
    await details.listNotes._handler(alice, {
      taskId: id,
      paginationOpts: { numItems: 30, cursor: notes.continueCursor },
    })
  ).page.length,
  5,
);
assert.equal(records.get(id).notesCount, 35);
console.log(
  "PASS: notes validation, Markdown persistence, output category, CRUD, counts, idempotency, pagination, and cross-task isolation.",
);

const threadArgs = {
  taskId: id,
  relatedTaskId: other,
  name: "Release stream",
  description: "Connected work",
  requestId: randomUUID(),
};
const threadId = await invoke(details.createThread, alice, threadArgs);
assert.equal(await invoke(details.createThread, alice, threadArgs), threadId);
assert.equal(records.get(threadId).taskCount, 2);
assert.equal(records.get(id).threadCount, 1);
const beforeDuplicate = events(other).length;
await invoke(details.linkTask, alice, { taskId: other, threadId });
assert.equal(records.get(threadId).taskCount, 2);
assert.equal(events(other).length, beforeDuplicate);
await assert.rejects(() =>
  invoke(details.linkTask, alice, { taskId: foreign, threadId }),
);
await assert.rejects(() =>
  invoke(details.linkTask, bob, { taskId: foreign, threadId }),
);
await assert.rejects(() =>
  invoke(details.threadTasks, bob, {
    taskId: foreign,
    threadId,
    paginationOpts: page,
  }),
);
await assert.rejects(() =>
  invoke(details.unlinkTask, bob, { taskId: id, threadId }),
);
const beforeFailedThread = rows("threads").length;
await assert.rejects(() =>
  invoke(details.createThread, alice, {
    ...threadArgs,
    relatedTaskId: foreign,
    requestId: randomUUID(),
  }),
);
assert.equal(rows("threads").length, beforeFailedThread);
assert.equal(
  (
    await details.threadTasks._handler(alice, {
      taskId: id,
      threadId,
      paginationOpts: page,
    })
  ).page.length,
  2,
);
await invoke(details.unlinkTask, alice, { taskId: other, threadId });
assert.ok(records.has(other));
assert.ok(records.has(threadId));
assert.equal(records.get(threadId).taskCount, 1);
assert.equal(records.get(other).threadCount, 0);
for (let index = 1; index < 20; index++)
  await invoke(details.createThread, alice, {
    taskId: id,
    name: `Stream ${index}`,
    requestId: randomUUID(),
  });
assert.equal(
  (await details.threadsForTask._handler(alice, { taskId: id })).length,
  20,
);
await assert.rejects(() =>
  invoke(details.createThread, alice, {
    taskId: id,
    name: "21st membership",
    requestId: randomUUID(),
  }),
);
assert.equal(
  (await details.threadsForTask._handler(alice, { taskId: id })).length,
  20,
);
console.log(
  "PASS: normalized many-to-many threads, live linked tasks, idempotent links, ownership on both ends, atomic rollback, membership bound, and unlink without task deletion.",
);

const domainId = await db.insert("domains", {
  ownerId: "details-alice",
  name: "Own domain",
  color: "green",
  icon: "layers",
});
const foreignDomain = await db.insert("domains", {
  ownerId: "details-bob",
  name: "Private domain",
  color: "blue",
  icon: "layers",
});
const metadata = {
  id,
  title: "Updated title",
  description: "Markdown **description**",
  domainId,
  priority: "high",
  estimatedMinutes: 90,
};
await invoke(details.updateMetadata, alice, metadata);
assert.equal(records.get(id).estimatedMinutes, 90);
assert.equal(records.get(id).domainId, domainId);
const afterEdit = events(id).length;
await invoke(details.updateMetadata, alice, metadata);
assert.equal(events(id).length, afterEdit);
await assert.rejects(() =>
  invoke(details.updateMetadata, alice, {
    ...metadata,
    domainId: foreignDomain,
  }),
);
await assert.rejects(() =>
  invoke(details.updateMetadata, alice, { ...metadata, title: " " }),
);
await assert.rejects(() =>
  invoke(details.updateMetadata, alice, { ...metadata, estimatedMinutes: 0 }),
);
await assert.rejects(() => invoke(details.updateMetadata, bob, metadata));
await invoke(details.updateMetadata, alice, {
  ...metadata,
  domainId: null,
  estimatedMinutes: null,
});
assert.equal(records.get(id).domainId, undefined);
assert.equal(records.get(id).estimatedMinutes, undefined);
await invoke(tasks.setProgress, alice, { id, progress: "in_progress" });
const afterProgress = events(id).length;
await invoke(tasks.setProgress, alice, { id, progress: "in_progress" });
assert.equal(events(id).length, afterProgress);
await invoke(tasks.setCompleted, alice, { id, completed: true });
await invoke(tasks.setCompleted, alice, { id, completed: false });
await invoke(tasks.reschedule, alice, { id, schedule: { type: "flexible" } });
assert.ok(events(id).some((row) => row.eventType === "due_date_changed"));
const startAt = Date.now() + 86400000;
await invoke(tasks.reschedule, alice, {
  id,
  schedule: { type: "fixed", startAt, endAt: startAt + 3600000 },
});
assert.ok(
  events(id).some(
    (row) =>
      row.eventType === "schedule_changed" &&
      row.metadata.schedule.type === "fixed",
  ),
);
const activityCount = events(id).length;
const activity = await details.listActivity._handler(alice, {
  taskId: id,
  paginationOpts: page,
});
assert.equal(activity.page.length, 30);
assert.equal(events(id).length, activityCount);
for (const event of [
  "task_created",
  "title_changed",
  "description_changed",
  "domain_changed",
  "estimate_changed",
  "priority_changed",
  "subtask_created",
  "subtask_updated",
  "subtask_completed",
  "subtask_reopened",
  "subtask_deleted",
  "subtasks_reordered",
  "note_created",
  "note_updated",
  "note_deleted",
  "thread_created",
  "task_linked",
  "status_changed",
  "task_completed",
  "task_reopened",
])
  assert.ok(
    events(id).some((row) => row.eventType === event),
    `Missing real audit event: ${event}`,
  );
assert.ok(events(other).some((row) => row.eventType === "task_unlinked"));
console.log(
  "PASS: task editing, optional-field clearing, owner checks, no-op suppression, bounded activity reads, and actual audit events without recursive writes.",
);

const editId = await db.insert("tasks", {
  ...input,
  schedule: { dueDate: "2020-01-01", type: "flexible" },
  ownerId: "details-alice",
  status: "open",
  workDate: "2020-01-01",
  requestId: randomUUID(),
  subtasks: [
    {
      id: "keep-id",
      title: "Completed step",
      dueDate: "2020-01-01",
      completedAt: 1234,
      scheduledDate: future,
    },
    { id: "remove-id", title: "Remove this step" },
  ],
});
await invoke(tasks.setCompleted, alice, {
  id: editId,
  subtaskId: "keep-id",
  completed: true,
});
const oldSteps = steps(editId);
const preservedNote = await invoke(details.saveNote, alice, {
  taskId: editId,
  content: "Keep this note",
  type: "general",
  requestId: randomUUID(),
});
const preservedThread = await invoke(details.createThread, alice, {
  taskId: editId,
  name: "Keep this relationship",
  requestId: randomUUID(),
});
const editArgs = {
  ...input,
  id: editId,
  title: "Edited through shared task form",
  schedule: { type: "flexible", dueDate: "2020-01-01" },
  subtasks: [
    { title: "Completed step renamed", dueDate: "2020-01-01" },
    { title: "New step", dueDate: future },
  ],
  stepKeys: [oldSteps[0]._id, randomUUID()],
  expectedStepIds: oldSteps.map((row) => row._id),
  requestId: randomUUID(),
};
await invoke(details.updateTask, alice, editArgs);
assert.equal(records.get(editId).title, editArgs.title);
assert.equal(records.get(oldSteps[0]._id).completedAt, 1234);
assert.equal(records.get(oldSteps[0]._id).scheduledDate, future);
assert.equal(records.has(oldSteps[1]._id), false);
assert.equal(steps(editId).length, 2);
assert.ok(records.has(preservedNote) && records.has(preservedThread));
const afterFullEdit = events(editId).length;
await invoke(details.updateTask, alice, editArgs);
assert.equal(events(editId).length, afterFullEdit);
assert.equal(steps(editId).length, 2);
await assert.rejects(() =>
  invoke(details.updateTask, bob, { ...editArgs, requestId: randomUUID() }),
);
await assert.rejects(() =>
  invoke(details.updateTask, alice, {
    ...editArgs,
    expectedStepIds: [],
    requestId: randomUUID(),
  }),
);
await assert.rejects(() =>
  invoke(details.updateTask, alice, {
    ...editArgs,
    schedule: { type: "flexible", dueDate: "2019-01-01" },
    expectedStepIds: steps(editId).map((row) => row._id),
    requestId: randomUUID(),
  }),
);
console.log(
  "PASS: shared-form edits preserve historical dates, subtask IDs/completion/scheduled dates, notes and threads; reject stale subtask lists and new past dates; retries do not duplicate steps.",
);

const eventCountBefore = rows("activity").length;
cursor = null;
do {
  const result = await invoke(details.backfillKnownActivity, alice, { cursor });
  cursor = result.isDone ? null : result.cursor;
} while (cursor);
const historicalCreation = events(editId).find(
  (row) => row.eventType === "task_created",
);
assert.equal(historicalCreation.timestamp, records.get(editId)._creationTime);
assert.equal(historicalCreation.actorId, undefined);
assert.ok(
  events(editId).some(
    (row) => row.eventType === "subtask_completed" && row.timestamp === 1234,
  ),
);
const backfilledCount = rows("activity").length;
assert.ok(backfilledCount > eventCountBefore);
cursor = null;
do {
  const result = await invoke(details.backfillKnownActivity, alice, { cursor });
  assert.equal(result.created, 0);
  cursor = result.isDone ? null : result.cursor;
} while (cursor);
assert.equal(rows("activity").length, backfilledCount);
const dateBundle = await build({
  entryPoints: ["src/lib/task-datetime.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { taskTimestamp } = await import(
  `data:text/javascript;base64,${Buffer.from(dateBundle.outputFiles[0].text).toString("base64")}`
);
assert.equal(
  taskTimestamp(Date.parse("2026-10-26T09:12Z"), "UTC"),
  "26 Oct 2026, 09:12",
);
assert.equal(
  taskTimestamp(Date.parse("2026-01-02T00:05Z"), "UTC"),
  "02 Jan 2026, 00:05",
);
assert.equal(
  taskTimestamp(Date.parse("2026-09-02T23:05Z"), "UTC"),
  "02 Sep 2026, 23:05",
);
console.log(
  "PASS: known creation/completion timestamps backfill once without invented actors; DD MMM YYYY, HH:mm formatting uses a 24-hour clock.",
);
