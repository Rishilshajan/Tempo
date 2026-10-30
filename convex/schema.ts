import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { domainFields } from "./domainFields";
import { taskFields } from "./taskFields";

export default defineSchema({
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
    .index("by_ownerId_and_domainId", ["ownerId", "domainId"]),
  domains: defineTable({
    ...domainFields,
    ownerId: v.string(),
    requestId: v.string(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_requestId", ["ownerId", "requestId"]),
});
