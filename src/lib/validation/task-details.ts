import { z } from "zod";
import { createTaskSchema } from "./task";

export const noteSchema = z.object({
  title: z
    .string()
    .trim()
    .max(180, "Keep the note title under 180 characters.")
    .optional(),
  content: z
    .string()
    .trim()
    .min(1, "Write a note before saving.")
    .max(20000, "Keep notes under 20,000 characters."),
  type: z.enum(["general", "research", "decision", "progress", "output"]),
});
export const threadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name the thread.")
    .max(120, "Keep the thread name under 120 characters."),
  description: z
    .string()
    .trim()
    .max(1000, "Keep the thread description under 1,000 characters.")
    .optional(),
});
export const subtaskDetailSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Add a subtask title.")
    .max(240, "Keep subtask titles under 240 characters."),
  dueDate: z.iso.date("Choose a valid due date.").optional(),
  scheduledDate: z.iso.date("Choose a valid scheduled date.").optional(),
});
export const taskMetadataSchema = z.object({
  title: createTaskSchema.shape.title,
  description: createTaskSchema.shape.description,
  priority: createTaskSchema.shape.priority,
  domainId: z.string().nullable(),
  estimatedMinutes: createTaskSchema.shape.estimatedMinutes.nullable(),
});
