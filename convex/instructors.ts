import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib";

// Publiczna lista instruktorów (sekcja „o nas”), posortowana, z URL zdjęcia.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("instructors").withIndex("by_order").collect();
    return await Promise.all(
      rows.map(async (r) => ({
        _id: r._id,
        name: r.name,
        role: r.role ?? null,
        bio: r.bio ?? null,
        order: r.order,
        photoUrl: r.photoId ? await ctx.storage.getUrl(r.photoId) : null,
      })),
    );
  },
});

// Admin: dodanie instruktora (na koniec listy).
export const create = mutation({
  args: { name: v.string(), role: v.optional(v.string()), bio: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db.query("instructors").withIndex("by_order").order("desc").take(1);
    const order = last.length ? last[0].order + 1 : 0;
    return await ctx.db.insert("instructors", {
      name: args.name,
      role: args.role,
      bio: args.bio,
      order,
    });
  },
});

// Admin: edycja danych tekstowych instruktora.
export const update = mutation({
  args: {
    id: v.id("instructors"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    bio: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("instructors", id, rest);
  },
});

// Admin: ustawienie/usunięcie zdjęcia instruktora (pomiń storageId, by usunąć).
export const setPhoto = mutation({
  args: { id: v.id("instructors"), storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { id, storageId }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("instructors", id);
    if (!row) return;
    if (row.photoId && row.photoId !== storageId) {
      await ctx.storage.delete(row.photoId);
    }
    await ctx.db.patch("instructors", id, { photoId: storageId });
  },
});

// Admin: usunięcie instruktora (wraz ze zdjęciem).
export const remove = mutation({
  args: { id: v.id("instructors") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("instructors", id);
    if (row?.photoId) await ctx.storage.delete(row.photoId);
    await ctx.db.delete("instructors", id);
  },
});
