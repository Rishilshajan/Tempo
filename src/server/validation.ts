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
  durationMin: z.coerce.number().int().positive().max(1440).optional().nullable(),
  minDurationMin: z.coerce
    .number()
    .int()
    .positive()
    .max(1440)
    .optional()
    .nullable(),
  isElastic: z.boolean().optional(),
});

export const milestoneInputSchema = z.object({
  title: z.string().trim().min(1, "Step title is required").max(200),
  durationEstMin: z.coerce.number().int().positive().max(1440).default(15),
});

export const createTaskSchema = baseTaskSchema.extend({
  milestones: z.array(milestoneInputSchema).max(20).optional(),
});

export const updateTaskSchema = baseTaskSchema.partial().extend({
  id: z.string().min(1),
});

export type MilestoneInput = z.input<typeof milestoneInputSchema>;

export const moveStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(TASK_STATUS),
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
