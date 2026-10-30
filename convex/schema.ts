import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { domainFields } from "./domainFields";
import { taskFields } from "./taskFields";

export default defineSchema({
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
