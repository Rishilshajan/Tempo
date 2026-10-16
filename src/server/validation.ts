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

/** Finish must be strictly after start when both are set (HH:MM sorts correctly). */
const timeWindowOk = (d: {
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}) => !d.scheduledStart || !d.scheduledEnd || d.scheduledEnd > d.scheduledStart;
const TIME_WINDOW_ERR = {
  message: "Finish time must be after the start time",
  path: ["scheduledEnd"] as PropertyKey[],
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

export const createTaskSchema = baseTaskSchema
  .extend({
    milestones: z.array(milestoneInputSchema).max(50).optional(),
  })
  .refine(timeWindowOk, TIME_WINDOW_ERR);

export const updateTaskSchema = baseTaskSchema
  .partial()
  .extend({ id: z.string().min(1) })
  .refine(timeWindowOk, TIME_WINDOW_ERR);

export type MilestoneInput = z.input<typeof milestoneInputSchema>;

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
