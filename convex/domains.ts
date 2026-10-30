import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user.tokenIdentifier))
      .order("desc")
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
    return null;
  },
});
