import { v, type Infer } from "convex/values";

export const notificationPreferences = v.object({
  inApp: v.boolean(),
  upcoming: v.boolean(),
  deadlines: v.boolean(),
  overdue: v.boolean(),
  briefing: v.boolean(),
  rollForward: v.boolean(),
  recurring: v.boolean(),
  subtasks: v.boolean(),
  upcomingMinutes: v.array(v.number()),
  deadlineMinutes: v.array(v.number()),
  briefingTime: v.string(),
  briefingDays: v.array(v.number()),
  timezone: v.string(),
  quietEnabled: v.boolean(),
  quietStart: v.string(),
  quietEnd: v.string(),
  quietDays: v.array(v.number()),
  quietPolicy: v.union(v.literal("digest"), v.literal("inbox")),
});

export type NotificationPreferences = Infer<typeof notificationPreferences>;
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: true, upcoming: true, deadlines: true, overdue: false,
  briefing: false, rollForward: true, recurring: false, subtasks: false,
  upcomingMinutes: [15], deadlineMinutes: [60],
  briefingTime: "08:00", briefingDays: [1, 2, 3, 4, 5], timezone: "UTC",
  quietEnabled: false, quietStart: "22:00", quietEnd: "07:00",
  quietDays: [0, 1, 2, 3, 4, 5, 6], quietPolicy: "inbox",
};
export const pushPlatform = v.union(v.literal("desktop"), v.literal("mobile"));
