import { z } from "zod";

export const IMPORTANCE = ["important", "medium", "flexible"] as const;
export const TASK_STATUS = [
  "not_started",
  "in_progress",
  "done",
  "rolled_forward",
] as const;

const hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, "Use a 6-digit hex colour, e.g. #4C9A78");

/** Shared field validators. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const time24 = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");

/** Max task/subtask length: 10,000 hours (large, long-running work). */
const MAX_DURATION_MIN = 10_000 * 60;

/* ------------------------------- domains ------------------------------- */

export const createDomainSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  color: hex,
  glyph: z.string().trim().max(40).optional().nullable(),
  emoji: z.string().trim().max(8).optional().nullable(),
  purpose: z.string().trim().max(1000).optional().nullable(),
  morningBias: z.boolean().optional(),
  allowElastic: z.boolean().optional(),
  // tag is optional on input; derived from name when omitted
  tag: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]+$/, "Lowercase letters, numbers, - and _ only")
    .max(15, "Tag can be at most 15 characters")
    .optional(),
});

export const updateDomainSchema = createDomainSchema.partial().extend({
  id: z.string().min(1),
});

export const reorderDomainsSchema = z
  .array(z.string().uuid())
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, "Domain IDs must be unique");

/* -------------------------------- tasks -------------------------------- */

const baseTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  domainId: z.string().min(1).optional().nullable(),
  importance: z.enum(IMPORTANCE).default("flexible"),
  status: z.enum(TASK_STATUS).default("not_started"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .nullable(),
  scheduledEndDate: isoDate.optional().nullable(),
  timeHint: z.string().trim().max(60).optional().nullable(),
  // Structured time window (24h "HH:MM"). scheduledEnd is the "finish by".
  scheduledStart: time24.optional().nullable(),
  scheduledEnd: time24.optional().nullable(),
  durationMin: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_DURATION_MIN)
    .optional()
    .nullable(),
  minDurationMin: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_DURATION_MIN)
    .optional()
    .nullable(),
  isElastic: z.boolean().optional(),
  // Thread continuity.
  threadId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
});

/** A scheduled end must be strictly after its start. */
const timeWindowOk = (d: {
  date?: string | null;
  scheduledEndDate?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}) => {
  if (d.date && d.scheduledEndDate) {
    if (d.scheduledEndDate < d.date) return false;
    if (d.scheduledEndDate > d.date) return true;
  }
  return (
    !d.scheduledStart ||
    !d.scheduledEnd ||
    d.scheduledEnd > d.scheduledStart
  );
};
const TIME_WINDOW_ERR = {
  message: "End date and time must be after the start date and time",
  path: ["scheduledEndDate"] as PropertyKey[],
};

export const milestoneInputSchema = z.object({
  title: z.string().trim().min(1, "Step title is required").max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  date: isoDate.optional().nullable(),
  scheduledTime: time24.optional().nullable(),
  durationEstMin: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_DURATION_MIN)
    .default(15),
  isCompleted: z.boolean().optional(),
});

export const saveMilestonesSchema = z
  .array(
    milestoneInputSchema.extend({
      id: z.string().uuid().optional(),
      isCompleted: z.boolean(),
    }),
  )
  .max(50)
  .refine(
    (items) => {
      const ids = items.flatMap((item) => (item.id ? [item.id] : []));
      return new Set(ids).size === ids.length;
    },
    "Subtask IDs must be unique",
  );

export const taskNoteInputSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  body: z.string().trim().min(1, "Note can't be empty").max(5000),
});

export const TASK_OUTPUT_TYPES = [
  "document",
  "report",
  "code",
  "link",
  "other",
] as const;

export const taskOutputInputSchema = z.object({
  title: z.string().trim().min(1, "Output title is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  outputType: z.enum(TASK_OUTPUT_TYPES),
  referenceUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .refine((value) => /^https?:\/\//i.test(value), "URL must use http or https")
    .optional()
    .nullable(),
});

export const createTaskSchema = baseTaskSchema
  .extend({
    milestones: z.array(milestoneInputSchema).max(50).optional(),
    scheduleMode: z.enum(["flexible", "fixed"]).default("flexible"),
  })
  .superRefine((data, ctx) => {
    if (data.scheduleMode === "fixed") {
      const required: (keyof typeof data)[] = [
        "date",
        "scheduledStart",
        "scheduledEndDate",
        "scheduledEnd",
      ];
      for (const key of required) {
        if (!data[key]) {
          ctx.addIssue({
            code: "custom",
            message: "Start and end date and time are required for fixed tasks",
            path: [key],
          });
        }
      }
      if (
        data.date &&
        data.scheduledStart &&
        data.scheduledEndDate &&
        data.scheduledEnd &&
        !timeWindowOk(data)
      ) {
        ctx.addIssue({ code: "custom", ...TIME_WINDOW_ERR });
      }
    } else if (
      data.scheduledStart ||
      data.scheduledEnd ||
      data.scheduledEndDate
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Flexible tasks cannot reserve a fixed time window",
        path: ["scheduleMode"],
      });
    }
  });

export const updateTaskSchema = baseTaskSchema
  .partial()
  .extend({ id: z.string().min(1) })
  .refine(timeWindowOk, TIME_WINDOW_ERR);

export type MilestoneInput = z.input<typeof milestoneInputSchema>;
export type SaveMilestonesInput = z.input<typeof saveMilestonesSchema>;
export type TaskNoteInput = z.input<typeof taskNoteInputSchema>;
export type TaskOutputInput = z.input<typeof taskOutputInputSchema>;

export const moveStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(TASK_STATUS),
});

/** Re-date a task (manual reschedule, e.g. "move to tomorrow"). */
export const moveDateSchema = z.object({
  id: z.string().min(1),
  date: isoDate,
});

/* ------------------------------ settings ------------------------------ */

export const PRODUCTIVITY_WINDOWS = [
  "morning",
  "afternoon",
  "evening",
  "flexible",
] as const;

export const updateSettingsSchema = z.object({
  productivityWindow: z.enum(PRODUCTIVITY_WINDOWS).optional(),
  elasticCushionMin: z.coerce.number().int().min(0).max(240).optional(),
  alertTimes: z
    .array(z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"))
    .max(12)
    .optional(),
});

export type UpdateSettingsInput = z.input<typeof updateSettingsSchema>;
export type CreateDomainInput = z.input<typeof createDomainSchema>;
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
