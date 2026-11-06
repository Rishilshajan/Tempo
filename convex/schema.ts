import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { domainFields } from "./domainFields";
import { taskFields, taskInputFields, storedSubtask } from "./taskFields";
import { notificationPreferences, pushPlatform } from "./notificationFields";
import {
  subtaskFields,
  noteFields,
  threadFields,
  activityFields,
} from "./taskDetailFields";

export default defineSchema({
  notificationAccounts: defineTable({
    ownerId: v.string(),
    preferences: notificationPreferences,
    clearedThrough: v.optional(v.number()),
    unreadCount: v.optional(v.number()),
    latestNotificationAt: v.optional(v.number()),
  }).index("by_owner", ["ownerId"]),
  notifications: defineTable({
    ownerId: v.string(),
    key: v.string(),
    title: v.string(),
    body: v.string(),
    taskId: v.optional(v.id("tasks")),
    createdAt: v.number(),
    visible: v.boolean(),
    read: v.boolean(),
  })
    .index("by_owner_key", ["ownerId", "key"])
    .index("by_owner_visible_created", ["ownerId", "visible", "createdAt"]),
  pushSubscriptions: defineTable({
    ownerId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    platform: pushPlatform,
  }).index("by_owner", ["ownerId"]).index("by_endpoint", ["endpoint"]),
  taskSeries: defineTable({
    lineageRootId: v.optional(v.id("tasks")),
    previousSeriesId: v.optional(v.id("taskSeries")),
    previousRootId: v.optional(v.id("tasks")),
    ownerId: v.string(),
    rootTaskId: v.id("tasks"),
    active: v.boolean(),
    anchor: v.string(),
    nextOrdinal: v.number(),
    template: v.object({
      ...taskInputFields,
      subtasks: v.array(storedSubtask),
    }),
  }).index("by_active", ["active"]),
  subtasks: defineTable(subtaskFields)
    .index("by_scheduledDate", ["scheduledDate"])
    .index("by_dueDate_and_scheduledDate", ["dueDate", "scheduledDate"])
    .index("by_parentTaskId_and_position", ["parentTaskId", "position"])
    .index("by_parentTaskId_and_requestId", ["parentTaskId", "requestId"]),
  notes: defineTable(noteFields)
    .index("by_taskId", ["taskId"])
    .index("by_taskId_and_requestId", ["taskId", "requestId"]),
  threads: defineTable(threadFields)
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_requestId", ["ownerId", "requestId"]),
  threadTasks: defineTable({
    threadId: v.id("threads"),
    taskId: v.id("tasks"),
    addedAt: v.number(),
    addedBy: v.string(),
  })
    .index("by_threadId_and_taskId", ["threadId", "taskId"])
    .index("by_taskId", ["taskId"]),
  activity: defineTable(activityFields)
    .index("by_taskId_and_eventType", ["taskId", "eventType"])
    .index("by_taskId_and_subtaskId_and_eventType", [
      "taskId",
      "metadata.subtaskId",
      "eventType",
    ])
    .index("by_taskId_and_timestamp", ["taskId", "timestamp"]),
  dailyFocus: defineTable({
    ownerId: v.string(),
    date: v.string(),
    taskId: v.id("tasks"),
  }).index("by_ownerId_and_date", ["ownerId", "date"]).index("by_taskId", ["taskId"]),
  tasks: defineTable({
    ...taskFields,
    ownerId: v.string(),
    requestId: v.string(),
  })
    .index("by_seriesId_and_recurrenceOrdinal", [
      "seriesId",
      "recurrenceOrdinal",
    ])
    .index("by_seriesId_and_workDate_and_status", [
      "seriesId",
      "workDate",
      "status",
    ])
    .index("by_recurrenceRootId_and_workDate_and_status", [
      "recurrenceRootId",
      "workDate",
      "status",
    ])
    .index("by_status", ["status"])
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_requestId", ["ownerId", "requestId"])
    .index("by_ownerId_and_status_and_workDate", [
      "ownerId",
      "status",
      "workDate",
    ])
    .index("by_ownerId_and_domainId", ["ownerId", "domainId"])
    .index("by_ownerId_and_completedAt", ["ownerId", "completedAt"])
    .index("by_ownerId_and_lastRolledOn", ["ownerId", "lastRolledOn"])
    .index("by_ownerId_and_schedule_type_and_schedule_endAt", [
      "ownerId",
      "schedule.type",
      "schedule.endAt",
    ])
    .index("by_ownerId_and_workDate", ["ownerId", "workDate"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["ownerId", "recurrenceCancelled"] }),
  domains: defineTable({
    ...domainFields,
    position: v.optional(v.number()),
    ownerId: v.string(),
    requestId: v.string(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_position", ["ownerId", "position"])
    .index("by_ownerId_and_requestId", ["ownerId", "requestId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["ownerId"] }),
});
