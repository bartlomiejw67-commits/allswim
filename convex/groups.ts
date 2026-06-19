import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib";

// Publiczna lista grup (bez poziomu i basenu).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("groups").withIndex("by_order").collect();
    return groups.map((g) => ({
      _id: g._id,
      name: g.name,
      instructor: g.instructor ?? null,
    }));
  },
});

// Admin: grupy z limitem i liczbą przydzielonych (z zatwierdzonych zgłoszeń).
export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const groups = await ctx.db.query("groups").withIndex("by_order").collect();
    return await Promise.all(
      groups.map(async (g) => {
        const assigned = await ctx.db
          .query("enrollments")
          .withIndex("by_assigned_group", (q) => q.eq("assignedGroupId", g._id))
          .collect();
        const activeCount = assigned.filter((e) => e.status === "approved").length;
        return {
          ...g,
          activeCount,
          freeSpots: Math.max(0, g.capacity - activeCount),
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    instructor: v.optional(v.string()),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db
      .query("groups")
      .withIndex("by_order")
      .order("desc")
      .take(1);
    const order = last.length ? last[0].order + 1 : 0;
    return await ctx.db.insert("groups", { ...args, order });
  },
});

export const update = mutation({
  args: {
    id: v.id("groups"),
    name: v.optional(v.string()),
    instructor: v.optional(v.string()),
    capacity: v.optional(v.number()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("groups", id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("groups") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const entries = await ctx.db
      .query("scheduleEntries")
      .withIndex("by_group", (q) => q.eq("groupId", id))
      .take(1);
    if (entries.length) {
      throw new ConvexError("Usuń najpierw terminy tej grupy z grafiku.");
    }
    const assigned = await ctx.db
      .query("enrollments")
      .withIndex("by_assigned_group", (q) => q.eq("assignedGroupId", id))
      .take(1);
    if (assigned.length) {
      throw new ConvexError("Nie można usunąć grupy — ma przypisane dzieci.");
    }
    await ctx.db.delete("groups", id);
  },
});
