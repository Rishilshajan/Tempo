import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { domainFields } from "./domainFields";
import { taskFields } from "./taskFields";
import {
  subtaskFields,
  noteFields,
  threadFields,
  activityFields,
} from "./taskDetailFields";

export default defineSchema({
  subtasks: defineTable(subtaskFields)
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
  }).index("by_ownerId_and_date", ["ownerId", "date"]),
  tasks: defineTable({
    ...taskFields,
    ownerId: v.string(),
    requestId: v.string(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_requestId", ["ownerId", "requestId"])
    .index("by_ownerId_and_status_and_workDate", [
      "ownerId",
      "status",
      "workDate",
    ])
    .index("by_ownerId_and_domainId", ["ownerId", "domainId"])
    .index("by_ownerId_and_completedAt", ["ownerId", "completedAt"])
    .index("by_ownerId_and_schedule_type_and_schedule_endAt", [
      "ownerId",
      "schedule.type",
      "schedule.endAt",
    ])
    .index("by_ownerId_and_workDate", ["ownerId", "workDate"]),
  domains: defineTable({
    ...domainFields,
    ownerId: v.string(),
    requestId: v.string(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_requestId", ["ownerId", "requestId"]),
});
