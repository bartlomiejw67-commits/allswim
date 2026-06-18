import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib";

// Publiczna lista grup z nazwami poziomu i basenu (bez limitu miejsc).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("groups").withIndex("by_order").collect();
    return await Promise.all(
      groups.map(async (g) => {
        const level = await ctx.db.get("levels", g.levelId);
        const pool = await ctx.db.get("pools", g.poolId);
        return {
          _id: g._id,
          name: g.name,
          instructor: g.instructor,
          levelId: g.levelId,
          poolId: g.poolId,
          levelName: level?.name ?? null,
          poolName: pool?.name ?? null,
        };
      }),
    );
  },
});

// Admin: grupy z limitem i liczbą przydzielonych (aktywnych) uczniów.
export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const groups = await ctx.db.query("groups").withIndex("by_order").collect();
    return await Promise.all(
      groups.map(async (g) => {
        const level = await ctx.db.get("levels", g.levelId);
        const pool = await ctx.db.get("pools", g.poolId);
        const members = await ctx.db
          .query("memberships")
          .withIndex("by_group", (q) => q.eq("groupId", g._id))
          .collect();
        const activeCount = members.filter((m) => m.active).length;
        return {
          ...g,
          levelName: level?.name ?? null,
          poolName: pool?.name ?? null,
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
    levelId: v.id("levels"),
    poolId: v.id("pools"),
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
    levelId: v.optional(v.id("levels")),
    poolId: v.optional(v.id("pools")),
    instructor: v.optional(v.string()),
    capacity: v.optional(v.number()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("groups", id, rest);
    // Jeśli zmieniono basen grupy, zsynchronizuj poolId w jej terminach.
    if (rest.poolId !== undefined) {
      const entries = await ctx.db
        .query("scheduleEntries")
        .withIndex("by_group", (q) => q.eq("groupId", id))
        .collect();
      for (const e of entries) {
        await ctx.db.patch("scheduleEntries", e._id, { poolId: rest.poolId });
      }
    }
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
      throw new ConvexError(
        "Usuń najpierw terminy tej grupy z harmonogramu.",
      );
    }
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", id))
      .take(1);
    if (members.length) {
      throw new ConvexError(
        "Nie można usunąć grupy — ma przypisanych uczniów.",
      );
    }
    await ctx.db.delete("groups", id);
  },
});
