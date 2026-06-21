import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib";

// Zbiera id zdjęć instruktora (nowe pole photoIds + zgodność ze starym photoId).
function photoIdsOf(row: { photoIds?: Id<"_storage">[]; photoId?: Id<"_storage"> }): Id<"_storage">[] {
  if (row.photoIds && row.photoIds.length) return row.photoIds.slice(0, 3);
  return row.photoId ? [row.photoId] : [];
}

// Publiczna lista instruktorów (sekcja „o nas”), posortowana, z URL-ami zdjęć (do 3).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("instructors").withIndex("by_order").collect();
    return await Promise.all(
      rows.map(async (r) => {
        const urls = (
          await Promise.all(photoIdsOf(r).map((id) => ctx.storage.getUrl(id)))
        ).filter((u): u is string => !!u);
        return {
          _id: r._id,
          name: r.name,
          role: r.role ?? null,
          bio: r.bio ?? null,
          order: r.order,
          photoUrls: urls,
        };
      }),
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

// Admin: dodanie zdjęcia do kolażu instruktora (maks. 3).
export const addPhoto = mutation({
  args: { id: v.id("instructors"), storageId: v.id("_storage") },
  handler: async (ctx, { id, storageId }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("instructors", id);
    if (!row) return;
    const ids = photoIdsOf(row);
    if (ids.length >= 3) {
      await ctx.storage.delete(storageId);
      throw new ConvexError("Maksymalnie 3 zdjęcia na osobę.");
    }
    await ctx.db.patch("instructors", id, { photoIds: [...ids, storageId], photoId: undefined });
  },
});

// Admin: usunięcie zdjęcia z kolażu (po indeksie).
export const removePhotoAt = mutation({
  args: { id: v.id("instructors"), index: v.number() },
  handler: async (ctx, { id, index }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("instructors", id);
    if (!row) return;
    const ids = photoIdsOf(row);
    const target = ids[index];
    if (!target) return;
    await ctx.storage.delete(target);
    await ctx.db.patch("instructors", id, {
      photoIds: ids.filter((_, i) => i !== index),
      photoId: undefined,
    });
  },
});

// Admin: usunięcie instruktora (wraz ze wszystkimi zdjęciami).
export const remove = mutation({
  args: { id: v.id("instructors") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("instructors", id);
    if (!row) return;
    for (const sid of photoIdsOf(row)) await ctx.storage.delete(sid);
    await ctx.db.delete("instructors", id);
  },
});
