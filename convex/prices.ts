import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib";

// Cennik (publiczny), posortowany.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("prices").withIndex("by_order").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    amount: v.string(),
    unit: v.optional(v.string()),
    description: v.optional(v.string()),
    popular: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db
      .query("prices")
      .withIndex("by_order")
      .order("desc")
      .take(1);
    const order = last.length ? last[0].order + 1 : 0;
    return await ctx.db.insert("prices", { ...args, order });
  },
});

export const update = mutation({
  args: {
    id: v.id("prices"),
    name: v.optional(v.string()),
    amount: v.optional(v.string()),
    unit: v.optional(v.string()),
    description: v.optional(v.string()),
    popular: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("prices", id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("prices") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("prices", id);
  },
});
