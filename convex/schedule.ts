import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireUser } from "./lib";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

// Buduje wiersz harmonogramu do wyświetlenia (z nazwami grupy/poziomu/basenu).
async function toDisplay(ctx: QueryCtx, entry: Doc<"scheduleEntries">) {
  const group = await ctx.db.get("groups", entry.groupId);
  const level = group ? await ctx.db.get("levels", group.levelId) : null;
  const pool = await ctx.db.get("pools", entry.poolId);
  return {
    _id: entry._id,
    groupId: entry.groupId,
    poolId: entry.poolId,
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
    groupName: group?.name ?? null,
    levelName: level?.name ?? null,
    poolName: pool?.name ?? null,
    instructor: group?.instructor ?? null,
  };
}

// Publiczny harmonogram (tylko do odczytu), opcjonalnie filtrowany po basenie.
export const list = query({
  args: { poolId: v.optional(v.id("pools")) },
  handler: async (ctx, { poolId }) => {
    const entries = poolId
      ? await ctx.db
          .query("scheduleEntries")
          .withIndex("by_pool", (q) => q.eq("poolId", poolId))
          .collect()
      : await ctx.db.query("scheduleEntries").withIndex("by_day").collect();
    return await Promise.all(entries.map((e) => toDisplay(ctx, e)));
  },
});

// Harmonogram zalogowanego użytkownika (jego grupy).
export const mySchedule = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    // Grafik widoczny dla rodzica dopiero po opublikowaniu przez admina.
    const settings = (await ctx.db.query("siteSettings").take(1))[0];
    if (!settings?.schedulePublished) return [];
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const activeGroupIds = memberships
      .filter((m) => m.active)
      .map((m) => m.groupId);
    const rows: Awaited<ReturnType<typeof toDisplay>>[] = [];
    for (const groupId of activeGroupIds) {
      const entries = await ctx.db
        .query("scheduleEntries")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect();
      for (const e of entries) {
        rows.push(await toDisplay(ctx, e));
      }
    }
    return rows;
  },
});

// Admin: sloty kalendarza tygodniowego (grupa + termin razem) z obłożeniem.
export const adminSlots = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const entries = await ctx.db.query("scheduleEntries").withIndex("by_day").collect();
    const approved = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .take(1000);
    const byGroup: Record<string, { id: string; name: string }[]> = {};
    for (const en of approved) {
      if (en.assignedGroupId) {
        (byGroup[en.assignedGroupId] ??= []).push({ id: en._id, name: en.name });
      }
    }
    return await Promise.all(
      entries.map(async (e) => {
        const group = await ctx.db.get("groups", e.groupId);
        const level = group ? await ctx.db.get("levels", group.levelId) : null;
        const roster = byGroup[e.groupId] ?? [];
        return {
          entryId: e._id,
          groupId: e.groupId,
          dayOfWeek: e.dayOfWeek,
          startTime: e.startTime,
          endTime: e.endTime,
          name: group?.name ?? "",
          levelId: group?.levelId ?? null,
          levelName: level?.name ?? null,
          instructor: group?.instructor ?? null,
          capacity: group?.capacity ?? 0,
          activeCount: roster.length,
          roster,
        };
      }),
    );
  },
});

// Admin: utworzenie slotu (zakłada grupę o danym poziomie/limicie + termin).
export const createSlot = mutation({
  args: {
    name: v.string(),
    levelId: v.id("levels"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    capacity: v.number(),
    instructor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const pool = (await ctx.db.query("pools").withIndex("by_order").take(1))[0];
    if (!pool) throw new ConvexError("Najpierw dodaj basen (zakładka Baseny).");
    const last = await ctx.db.query("groups").withIndex("by_order").order("desc").take(1);
    const order = last.length ? last[0].order + 1 : 0;
    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      levelId: args.levelId,
      poolId: pool._id,
      instructor: args.instructor,
      capacity: args.capacity,
      order,
    });
    await ctx.db.insert("scheduleEntries", {
      groupId,
      poolId: pool._id,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
    });
    return groupId;
  },
});

// Admin: edycja slotu (grupa + termin).
export const updateSlot = mutation({
  args: {
    entryId: v.id("scheduleEntries"),
    groupId: v.id("groups"),
    name: v.optional(v.string()),
    levelId: v.optional(v.id("levels")),
    capacity: v.optional(v.number()),
    instructor: v.optional(v.string()),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const g: Record<string, unknown> = {};
    if (args.name !== undefined) g.name = args.name;
    if (args.levelId !== undefined) g.levelId = args.levelId;
    if (args.capacity !== undefined) g.capacity = args.capacity;
    if (args.instructor !== undefined) g.instructor = args.instructor;
    if (Object.keys(g).length) await ctx.db.patch("groups", args.groupId, g);
    const e: Record<string, unknown> = {};
    if (args.dayOfWeek !== undefined) e.dayOfWeek = args.dayOfWeek;
    if (args.startTime !== undefined) e.startTime = args.startTime;
    if (args.endTime !== undefined) e.endTime = args.endTime;
    if (Object.keys(e).length) await ctx.db.patch("scheduleEntries", args.entryId, e);
  },
});

// Admin: usunięcie slotu (termin + członkostwa + grupa).
export const deleteSlot = mutation({
  args: { entryId: v.id("scheduleEntries"), groupId: v.id("groups") },
  handler: async (ctx, { entryId, groupId }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("scheduleEntries", entryId);
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const m of members) await ctx.db.delete("memberships", m._id);
    const remaining = await ctx.db
      .query("scheduleEntries")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .take(1);
    if (remaining.length === 0) await ctx.db.delete("groups", groupId);
  },
});

export const create = mutation({
  args: {
    groupId: v.id("groups"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const group = await ctx.db.get("groups", args.groupId);
    if (!group) throw new ConvexError("Nie znaleziono grupy.");
    return await ctx.db.insert("scheduleEntries", {
      ...args,
      poolId: group.poolId, // basen pobierany z grupy
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("scheduleEntries"),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("scheduleEntries", id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("scheduleEntries") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("scheduleEntries", id);
  },
});
