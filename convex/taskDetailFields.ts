import { v } from "convex/values";
import { taskSchedule } from "./taskFields";

export const noteType = v.union(
  v.literal("general"),
  v.literal("research"),
  v.literal("decision"),
  v.literal("progress"),
  v.literal("output"),
);
export const subtaskFields = {
  parentTaskId: v.id("tasks"),
  title: v.string(),
  dueDate: v.optional(v.string()),
  scheduledDate: v.optional(v.string()),
  completedAt: v.optional(v.number()),
  position: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  requestId: v.string(),
  legacyId: v.optional(v.string()),
};
export const noteFields = {
  taskId: v.id("tasks"),
  title: v.optional(v.string()),
  content: v.string(),
  type: noteType,
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  requestId: v.string(),
};
export const threadFields = {
  name: v.string(),
  description: v.optional(v.string()),
  ownerId: v.string(),
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  taskCount: v.number(),
  requestId: v.string(),
};
export const activityMetadata = v.object({
  before: v.optional(v.string()),
  after: v.optional(v.string()),
  previousSchedule: v.optional(taskSchedule),
  schedule: v.optional(taskSchedule),
  subtaskId: v.optional(v.id("subtasks")),
  threadId: v.optional(v.id("threads")),
  noteId: v.optional(v.id("notes")),
  previousTaskId: v.optional(v.id("tasks")),
  previousDomainId: v.optional(v.id("domains")),
  domainId: v.optional(v.id("domains")),
  beforeDueDate: v.optional(v.string()),
  afterDueDate: v.optional(v.string()),
  beforeScheduledDate: v.optional(v.string()),
  afterScheduledDate: v.optional(v.string()),
});
export const activityType = v.union(
  v.literal("task_created"),
  v.literal("title_changed"),
  v.literal("description_changed"),
  v.literal("status_changed"),
  v.literal("priority_changed"),
  v.literal("domain_changed"),
  v.literal("estimate_changed"),
  v.literal("schedule_changed"),
  v.literal("due_date_changed"),
  v.literal("task_completed"),
  v.literal("task_reopened"),
  v.literal("subtask_created"),
  v.literal("subtask_updated"),
  v.literal("subtask_completed"),
  v.literal("subtask_reopened"),
  v.literal("subtask_deleted"),
  v.literal("subtasks_reordered"),
  v.literal("thread_created"),
  v.literal("task_linked"),
  v.literal("task_unlinked"),
  v.literal("note_created"),
  v.literal("note_updated"),
  v.literal("note_deleted"),
);
export const activityFields = {
  taskId: v.id("tasks"),
  eventType: activityType,
  description: v.string(),
  actorId: v.optional(v.string()),
  actorName: v.optional(v.string()),
  timestamp: v.number(),
  metadata: v.optional(activityMetadata),
};
export const noteView = v.object({
  _id: v.id("notes"),
  _creationTime: v.number(),
  ...noteFields,
});
export const threadView = v.object({
  _id: v.id("threads"),
  _creationTime: v.number(),
  ...threadFields,
});
export const activityView = v.object({
  _id: v.id("activity"),
  _creationTime: v.number(),
  ...activityFields,
});
