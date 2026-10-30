import { z } from "zod";

export const domainNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a domain name.")
  .max(80, "Use 80 characters or fewer.");

// Shared by the sheet and Convex mutation so both enforce the same rules.
export const domainDetailsSchema = z.object({
  name: domainNameSchema,
  purpose: z
    .string()
    .trim()
    .max(500, "Keep the purpose within 500 characters.")
    .optional(),
  color: z.enum([
    "green",
    "blue",
    "teal",
    "purple",
    "amber",
    "forest",
    "coral",
  ]),
  icon: z.enum([
    "briefcase",
    "layers",
    "compass",
    "sparkles",
    "list-checks",
    "heart",
    "panels",
    "target",
  ]),
});

export const createDomainSchema = domainDetailsSchema.extend({
  requestId: z.uuid("Please reopen the form and try again."),
});

export type CreateDomainValues = z.infer<typeof createDomainSchema>;
