import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

const category = v.union(v.literal("gallery"), v.literal("camps"), v.literal("about"));

async function withUrl(ctx: QueryCtx, img: Doc<"images">) {
  return {
    _id: img._id,
    caption: img.caption,
    category: img.category,
    kind: img.kind ?? "image",
    featured: img.featured,
    order: img.order,
    url: await ctx.storage.getUrl(img.storageId),
  };
}

// Zdjęcia danej kategorii (publiczne), posortowane.
export const list = query({
  args: { category },
  handler: async (ctx, { category }) => {
    const imgs = await ctx.db
      .query("images")
      .withIndex("by_category_and_order", (q) => q.eq("category", category))
      .collect();
    return await Promise.all(imgs.map((i) => withUrl(ctx, i)));
  },
});

// Wyróżnione zdjęcia na stronę główną.
export const listFeatured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const imgs = await ctx.db
      .query("images")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .take(limit ?? 6);
    return await Promise.all(imgs.map((i) => withUrl(ctx, i)));
  },
});

// Admin: adres do wgrania pliku do Convex storage.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Admin: zapis rekordu zdjęcia po wgraniu pliku.
export const add = mutation({
  args: {
    storageId: v.id("_storage"),
    category,
    kind: v.optional(v.union(v.literal("image"), v.literal("video"))),
    caption: v.optional(v.string()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db
      .query("images")
      .withIndex("by_category_and_order", (q) =>
        q.eq("category", args.category),
      )
      .order("desc")
      .take(1);
    const order = last.length ? last[0].order + 1 : 0;
    return await ctx.db.insert("images", {
      storageId: args.storageId,
      category: args.category,
      kind: args.kind ?? "image",
      caption: args.caption,
      featured: args.featured ?? false,
      order,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("images"),
    caption: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("images", id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("images") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const img = await ctx.db.get("images", id);
    if (img) {
      await ctx.storage.delete(img.storageId);
      await ctx.db.delete("images", id);
    }
  },
});
