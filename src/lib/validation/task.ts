import { z } from "zod";
import { recurrenceSchema } from "./recurrence";

export const calendarDateSchema = z.iso.date("Choose a valid date.");
export const durationInputSchema = z
  .object({
    hours: z.coerce
      .number()
      .int("Use whole hours.")
      .min(0, "Hours cannot be negative.")
      .max(24, "Use 24 hours or fewer."),
    minutes: z.coerce
      .number()
      .int("Use whole minutes.")
      .min(0, "Minutes cannot be negative.")
      .max(59, "Use 0–59 minutes; enter additional time in Hours."),
  })
  .superRefine((value, ctx) => {
    const total = value.hours * 60 + value.minutes;
    if (total < 1 || total > 1440)
      ctx.addIssue({
        code: "custom",
        message: "Enter an estimate between 1 minute and 24 hours.",
      });
  });
export const taskScheduleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("flexible"),
    dueDate: calendarDateSchema.optional(),
  }),
  z.object({
    type: z.literal("fixed"),
    startAt: z.number().min(-8640000000000000).max(8640000000000000),
    endAt: z.number().min(-8640000000000000).max(8640000000000000),
  }),
]);

type TaskDateInput = {
  timezone: string;
  schedule: z.infer<typeof taskScheduleSchema>;
  recurrence?: {
    frequency?: string;
    end:
      | { type: "date"; date: string }
      | { type: "never" }
      | { type: "count"; count: number };
  };
  subtasks: { dueDate?: string }[];
};

/** Fresh, timezone-aware checks shared by the form and authoritative mutation. */
export function taskDateIssues(task: TaskDateInput, now = new Date()) {
  const issues: { path: (string | number)[]; message: string }[] = [];
  let today: string;
  let firstDate: string;
  try {
    today = localDateKey(now, task.timezone);
    firstDate =
      task.schedule.type === "fixed"
        ? localDateKey(new Date(task.schedule.startAt), task.timezone)
        : (task.schedule.dueDate ?? today);
  } catch {
    return issues;
  }
  if (calendarDateSchema.safeParse(firstDate).success && firstDate < today) {
    issues.push({
      path: ["schedule"],
      message:
        "Task dates must be today or later. Choose today or a future date.",
    });
  } else if (
    task.recurrence &&
    task.schedule.type === "fixed" &&
    task.schedule.startAt < Math.floor(now.getTime() / 60000) * 60000
  ) {
    issues.push({
      path: ["schedule"],
      message: "The first repeating time slot must start now or in the future.",
    });
  }
  const minimumEnd = firstDate > today ? firstDate : today;
  if (
    task.recurrence?.frequency === "weekdays" &&
    [0, 6].includes(new Date(`${firstDate}T12:00:00Z`).getUTCDay())
  ) {
    issues.push({
      path: ["schedule"],
      message: "Choose Monday through Friday for the first weekday occurrence.",
    });
  }
  if (
    task.recurrence?.end.type === "date" &&
    calendarDateSchema.safeParse(task.recurrence.end.date).success &&
    task.recurrence.end.date < minimumEnd
  ) {
    issues.push({
      path: ["recurrence"],
      message:
        "Repeat end date must be today or later and on or after the first occurrence.",
    });
  }
  task.subtasks.forEach((step, index) => {
    if (
      step.dueDate &&
      calendarDateSchema.safeParse(step.dueDate).success &&
      step.dueDate < today
    )
      issues.push({
        path: ["subtasks", index, "dueDate"],
        message: `Subtask ${index + 1} has a past date. Choose today or a future date.`,
      });
  });
  return issues;
}
export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter a task title.")
      .max(200, "Use 200 characters or fewer."),
    description: z
      .string()
      .trim()
      .max(5000, "Keep the description within 5,000 characters.")
      .optional(),
    domainId: z.string().min(1).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    schedule: taskScheduleSchema,
    timezone: z.string().refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Choose a valid timezone."),
    estimatedMinutes: z
      .number()
      .int("Use whole minutes.")
      .min(1, "Enter an estimate of at least 1 minute.")
      .max(1440, "Keep the estimate within 24 hours.")
      .optional(),
    subtasks: z
      .array(
        z.object({
          title: z
            .string()
            .trim()
            .min(1, "Every subtask needs a title.")
            .max(200, "Keep each subtask within 200 characters."),
          dueDate: calendarDateSchema.optional(),
        }),
      )
      .max(30, "Add up to 30 subtasks."),
    requestId: z.uuid(),
    recurrence: recurrenceSchema.optional(),
  })
  .superRefine((task, ctx) => {
    for (const issue of taskDateIssues(task))
      ctx.addIssue({ code: "custom", ...issue });
    if (task.schedule.type === "fixed") {
      if (task.schedule.endAt <= task.schedule.startAt)
        ctx.addIssue({
          code: "custom",
          path: ["schedule"],
          message: "End time must be later than start time.",
        });
      else if (
        task.estimatedMinutes &&
        task.estimatedMinutes >
          (task.schedule.endAt - task.schedule.startAt) / 60000
      )
        ctx.addIssue({
          code: "custom",
          path: ["estimatedMinutes"],
          message: "The estimate cannot exceed the fixed time window.",
        });
    }
  });

export type CreateTaskValues = z.infer<typeof createTaskSchema>;

export function localDateKey(
  date = new Date(),
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
