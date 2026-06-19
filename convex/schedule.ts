import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireUser } from "./lib";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

// Buduje wiersz harmonogramu do wyświetlenia (z nazwami grupy/basenu).
async function toDisplay(ctx: QueryCtx, entry: Doc<"scheduleEntries">) {
  const group = await ctx.db.get("groups", entry.groupId);
  const pool = await ctx.db.get("pools", entry.poolId);
  return {
    _id: entry._id,
    groupId: entry.groupId,
    poolId: entry.poolId,
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
    groupName: group?.name ?? null,
    poolName: pool?.name ?? null,
    instructor: group?.instructor ?? null,
  };
}

// Publiczny harmonogram (tylko do odczytu). Widoczny dopiero po publikacji grafiku.
export const list = query({
  args: { poolId: v.optional(v.id("pools")) },
  handler: async (ctx, { poolId }) => {
    const settings = (await ctx.db.query("siteSettings").take(1))[0];
    if (!settings?.scheduleLive) return [];
    const entries = poolId
      ? await ctx.db
          .query("scheduleEntries")
          .withIndex("by_pool", (q) => q.eq("poolId", poolId))
          .collect()
      : await ctx.db.query("scheduleEntries").withIndex("by_day").collect();
    return await Promise.all(entries.map((e) => toDisplay(ctx, e)));
  },
});

// Harmonogram zalogowanego rodzica — wg OPUBLIKOWANEGO przydziału (grupa + basen).
export const mySchedule = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const mine = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const active = mine.filter(
      (e) => e.publishedStatus === "approved" && e.publishedGroupId,
    );
    const rows: Awaited<ReturnType<typeof toDisplay>>[] = [];
    for (const e of active) {
      const entries = await ctx.db
        .query("scheduleEntries")
        .withIndex("by_group", (q) => q.eq("groupId", e.publishedGroupId!))
        .collect();
      for (const entry of entries) {
        rows.push(await toDisplay(ctx, entry));
      }
    }
    return rows;
  },
});

// Admin: pełny widok do panelu grafiku — grupy z rosterem, baseny i terminy.
export const adminBoard = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const pools = await ctx.db.query("pools").withIndex("by_order").collect();
    const groupsRaw = await ctx.db.query("groups").withIndex("by_order").collect();

    const groups = await Promise.all(
      groupsRaw.map(async (g) => {
        const assigned = await ctx.db
          .query("enrollments")
          .withIndex("by_assigned_group", (q) => q.eq("assignedGroupId", g._id))
          .collect();
        const roster = assigned
          .filter((e) => e.status === "approved")
          .map((e) => ({
            enrollmentId: e._id,
            name: e.name,
            childAge: e.childAge ?? null,
          }));
        return {
          _id: g._id,
          name: g.name,
          instructor: g.instructor ?? null,
          capacity: g.capacity,
          activeCount: roster.length,
          roster,
        };
      }),
    );

    const entries = await ctx.db
      .query("scheduleEntries")
      .withIndex("by_day")
      .collect();
    const sessions = entries.map((e) => ({
      _id: e._id,
      groupId: e.groupId,
      poolId: e.poolId,
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
    }));

    return {
      pools: pools.map((p) => ({ _id: p._id, name: p.name })),
      groups,
      sessions,
    };
  },
});

// Admin: dodanie terminu (sesja grupy na basenie w danym dniu/godzinie).
export const createSession = mutation({
  args: {
    groupId: v.id("groups"),
    poolId: v.id("pools"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const group = await ctx.db.get("groups", args.groupId);
    if (!group) throw new ConvexError("Nie znaleziono grupy.");
    const pool = await ctx.db.get("pools", args.poolId);
    if (!pool) throw new ConvexError("Nie znaleziono basenu.");
    return await ctx.db.insert("scheduleEntries", args);
  },
});

// Admin: edycja terminu (dzień / godziny / basen).
export const updateSession = mutation({
  args: {
    id: v.id("scheduleEntries"),
    poolId: v.optional(v.id("pools")),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("scheduleEntries", id, rest);
  },
});

// Admin: usunięcie terminu.
export const deleteSession = mutation({
  args: { id: v.id("scheduleEntries") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("scheduleEntries", id);
  },
});
