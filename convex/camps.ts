import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib";

// Obozy letnie (publiczne), posortowane.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("camps").withIndex("by_order").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    period: v.optional(v.string()),
    location: v.optional(v.string()),
    price: v.optional(v.string()),
    contactNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db
      .query("camps")
      .withIndex("by_order")
      .order("desc")
      .take(1);
    const order = last.length ? last[0].order + 1 : 0;
    return await ctx.db.insert("camps", { ...args, order });
  },
});

export const update = mutation({
  args: {
    id: v.id("camps"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    period: v.optional(v.string()),
    location: v.optional(v.string()),
    price: v.optional(v.string()),
    contactNote: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("camps", id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("camps") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("camps", id);
  },
});
