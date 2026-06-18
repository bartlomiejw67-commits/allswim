import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib";

// Lista basenów (publiczna), posortowana.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pools").withIndex("by_order").collect();
  },
});

export const create = mutation({
  args: { name: v.string(), address: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db
      .query("pools")
      .withIndex("by_order")
      .order("desc")
      .take(1);
    const order = last.length ? last[0].order + 1 : 0;
    return await ctx.db.insert("pools", { ...args, order });
  },
});

export const update = mutation({
  args: {
    id: v.id("pools"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("pools", id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("pools") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const inUse = await ctx.db
      .query("groups")
      .withIndex("by_pool", (q) => q.eq("poolId", id))
      .take(1);
    if (inUse.length) {
      throw new ConvexError(
        "Nie można usunąć basenu — jest przypisany do grupy.",
      );
    }
    await ctx.db.delete("pools", id);
  },
});
