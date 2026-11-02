import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { domainFields, domainView } from "./domainFields";
import {
  createDomainSchema,
  domainDetailsSchema,
} from "../src/lib/validation/domain";

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(domainView),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to view your domains.");
    const result = await ctx.db
      .query("domains")
      .withIndex("by_ownerId_and_position", (q) =>
        q.eq("ownerId", user.tokenIdentifier),
      )
      .order("asc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 50),
      });
    return {
      ...result,
      page: result.page.map(
        ({ _id, _creationTime, name, purpose, color, icon }) => ({
          _id,
          _creationTime,
          name,
          ...(purpose ? { purpose } : {}),
          color,
          icon,
        }),
      ),
    };
  },
});

export const create = mutation({
  args: { ...domainFields, requestId: v.string() },
  returns: v.id("domains"),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to create a domain.");
    const parsed = createDomainSchema.safeParse(args);
    if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
    const { name, purpose } = parsed.data;
    const ownerId = user.tokenIdentifier;
    // A retry of the same submission must not create a second domain.
    const existing = await ctx.db
      .query("domains")
      .withIndex("by_ownerId_and_requestId", (q) =>
        q.eq("ownerId", ownerId).eq("requestId", args.requestId),
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("domains", {
      name,
      ...(purpose ? { purpose } : {}),
      color: args.color,
      icon: args.icon,
      ownerId,
      requestId: args.requestId,
      position: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("domains"), ...domainFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to edit a domain.");
    const domain = await ctx.db.get(args.id);
    if (!domain || domain.ownerId !== user.tokenIdentifier)
      throw new ConvexError("This domain is not available.");
    const parsed = domainDetailsSchema.safeParse(args);
    if (!parsed.success) throw new ConvexError(parsed.error.issues[0].message);
    await ctx.db.patch(args.id, {
      ...parsed.data,
      purpose: parsed.data.purpose || undefined,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("domains") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in to delete a domain.");
    const domain = await ctx.db.get(args.id);
    if (!domain || domain.ownerId !== user.tokenIdentifier)
      throw new ConvexError("This domain is not available.");
    await ctx.db.delete(args.id);
    await ctx.scheduler.runAfter(0, internal.domains.clearClassification, {
      id: args.id,
      ownerId: user.tokenIdentifier,
    });
    return null;
  },
});

export const reorder = mutation({
  args: { ids: v.array(v.id("domains")) },
  returns: v.null(),
  handler: async (ctx, { ids }) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Please sign in.");
    if (ids.length > 1000 || new Set(ids).size !== ids.length)
      throw new ConvexError("Invalid domain order.");
    const domains = await Promise.all(ids.map((id) => ctx.db.get(id)));
    if (domains.some((d) => !d || d.ownerId !== user.tokenIdentifier))
      throw new ConvexError(
        "A domain is no longer available. Refresh and try again.",
      );
    await Promise.all(
      ids.map((id, position) => ctx.db.patch(id, { position })),
    );
    return null;
  },
});
export const clearClassification = internalMutation({
  args: { id: v.id("domains"), ownerId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_ownerId_and_domainId", (q) =>
        q.eq("ownerId", args.ownerId).eq("domainId", args.id),
      )
      .take(100);
    await Promise.all(
      tasks.map((t) => ctx.db.patch(t._id, { domainId: undefined })),
    );
    if (tasks.length === 100)
      await ctx.scheduler.runAfter(
        0,
        internal.domains.clearClassification,
        args,
      );
    return null;
  },
});
