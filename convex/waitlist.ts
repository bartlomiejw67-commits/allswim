import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Publiczne: zapis na listę powiadomień o starcie naboru ("Powiadom mnie").
export const join = mutation({
  args: { email: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { email, note }) => {
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      throw new ConvexError("Podaj poprawny adres e-mail.");
    }
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", clean))
      .take(1);
    if (existing.length) return existing[0]._id; // już zapisany — bez duplikatu
    return await ctx.db.insert("waitlist", {
      email: clean,
      note: note?.trim() || undefined,
      notified: false,
    });
  },
});

// Admin: lista oczekujących (najnowsi na górze).
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("waitlist").order("desc").take(500);
  },
});

// Admin: usunięcie wpisu z listy.
export const remove = mutation({
  args: { id: v.id("waitlist") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("waitlist", id);
  },
});
