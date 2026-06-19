import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getCurrentUser, requireUser, requireAdmin } from "./lib";

// Dane zalogowanego użytkownika (lub null).
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role ?? "user",
    };
  },
});

// Aktualizacja własnego profilu.
export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch("users", user._id, args);
  },
});

// Bootstrap: pierwszy zalogowany może przejąć rolę admina,
// dopóki żaden administrator nie istnieje.
export const claimAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .take(1);
    if (existingAdmin.length) {
      throw new ConvexError("Administrator już istnieje.");
    }
    await ctx.db.patch("users", user._id, { role: "admin" });
    return true;
  },
});

// Admin: zmiana roli użytkownika.
export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, { userId, role }) => {
    const me = await requireAdmin(ctx);
    if (userId === me._id) {
      throw new ConvexError("Nie możesz zmienić własnej roli.");
    }
    await ctx.db.patch("users", userId, { role });
  },
});

// Admin: usunięcie konta użytkownika (wraz z logowaniem i przydziałami).
export const remove = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await requireAdmin(ctx);
    if (userId === me._id) {
      throw new ConvexError("Nie możesz usunąć własnego konta.");
    }
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const a of accounts) await ctx.db.delete("authAccounts", a._id);

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const s of sessions) await ctx.db.delete("authSessions", s._id);

    // Zgłoszenia zostają (historia), ale odpinamy je od usuwanego konta.
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const e of enrollments) await ctx.db.patch("enrollments", e._id, { userId: undefined });

    await ctx.db.delete("users", userId);
  },
});

// Admin: lista użytkowników (podstawowe dane).
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(500);
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role ?? "user",
    }));
  },
});
