import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib";

// Sekcje regulaminu (publiczne), posortowane.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("regulationSections")
      .withIndex("by_order")
      .collect();
  },
});

export const create = mutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db
      .query("regulationSections")
      .withIndex("by_order")
      .order("desc")
      .take(1);
    const order = last.length ? last[0].order + 1 : 0;
    return await ctx.db.insert("regulationSections", { ...args, order });
  },
});

export const update = mutation({
  args: {
    id: v.id("regulationSections"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("regulationSections", id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("regulationSections") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("regulationSections", id);
  },
});
