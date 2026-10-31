import { v } from "convex/values";
import { domainColor, domainIcon } from "./domainFields";

export const recurrenceRule = v.object({
  frequency: v.union(
    v.literal("daily"),
    v.literal("weekdays"),
    v.literal("weekly"),
    v.literal("monthly"),
    v.literal("custom"),
  ),
  interval: v.number(),
  unit: v.union(v.literal("day"), v.literal("week"), v.literal("month")),
  end: v.union(
    v.object({ type: v.literal("never") }),
    v.object({ type: v.literal("date"), date: v.string() }),
    v.object({ type: v.literal("count"), count: v.number() }),
  ),
});

export const taskSchedule = v.union(
  v.object({ type: v.literal("flexible"), dueDate: v.optional(v.string()) }),
  v.object({
    type: v.literal("fixed"),
    startAt: v.number(),
    endAt: v.number(),
  }),
);
export const subtaskInput = v.object({
  title: v.string(),
  dueDate: v.optional(v.string()),
});
export const storedSubtask = v.object({
  id: v.string(),
  title: v.string(),
  dueDate: v.optional(v.string()),
  scheduledDate: v.optional(v.string()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
});
export const taskInputFields = {
  title: v.string(),
  description: v.optional(v.string()),
  domainId: v.optional(v.id("domains")),
  priority: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("urgent"),
  ),
  schedule: taskSchedule,
  timezone: v.string(),
  estimatedMinutes: v.optional(v.number()),
  recurrence: v.optional(recurrenceRule),
};
export const taskFields = {
  boardPosition: v.optional(v.number()),
  continuedOn: v.optional(v.string()),
  ...taskInputFields,
  subtasks: v.array(storedSubtask),
  subtasksNormalized: v.optional(v.boolean()),
  lastEditRequestId: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  notesCount: v.optional(v.number()),
  threadCount: v.optional(v.number()),
  status: v.union(v.literal("open"), v.literal("completed")),
  progress: v.optional(
    v.union(v.literal("not_started"), v.literal("in_progress")),
  ),
  completedAt: v.optional(v.number()),
  workDate: v.string(),
  recurrenceAnchorDate: v.optional(v.string()),
  recurrenceOrdinal: v.optional(v.number()),
  recurrenceSlot: v.optional(v.number()),
  recurrenceRootId: v.optional(v.id("tasks")),
  recurrenceStartAt: v.optional(v.number()),
  nextOccurrenceId: v.optional(v.id("tasks")),
};
export const taskView = v.object({
  _id: v.id("tasks"),
  _creationTime: v.number(),
  ...taskFields,
  domain: v.union(
    v.null(),
    v.object({ name: v.string(), color: domainColor, icon: domainIcon }),
  ),
});
