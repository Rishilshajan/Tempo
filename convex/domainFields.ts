import { v } from "convex/values";

export const domainColor = v.union(
  v.literal("green"),
  v.literal("blue"),
  v.literal("teal"),
  v.literal("purple"),
  v.literal("amber"),
  v.literal("forest"),
  v.literal("coral"),
);
export const domainIcon = v.union(
  v.literal("briefcase"),
  v.literal("layers"),
  v.literal("compass"),
  v.literal("sparkles"),
  v.literal("list-checks"),
  v.literal("heart"),
  v.literal("panels"),
  v.literal("target"),
);
export const domainFields = {
  name: v.string(),
  purpose: v.optional(v.string()),
  color: domainColor,
  icon: domainIcon,
};
export const domainView = v.object({
  _id: v.id("domains"),
  _creationTime: v.number(),
  ...domainFields,
});
