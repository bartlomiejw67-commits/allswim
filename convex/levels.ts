import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib";

// Lista poziomów zaawansowania (publiczna), posortowana.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("levels").withIndex("by_order").collect();
  },
});

export const create = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db
      .query("levels")
      .withIndex("by_order")
      .order("desc")
      .take(1);
    const order = last.length ? last[0].order + 1 : 0;
    return await ctx.db.insert("levels", { ...args, order });
  },
});

export const update = mutation({
  args: {
    id: v.id("levels"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("levels", id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("levels") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const inUse = await ctx.db
      .query("groups")
      .withIndex("by_level", (q) => q.eq("levelId", id))
      .take(1);
    if (inUse.length) {
      throw new ConvexError(
        "Nie można usunąć poziomu — jest przypisany do grupy.",
      );
    }
    await ctx.db.delete("levels", id);
  },
});
