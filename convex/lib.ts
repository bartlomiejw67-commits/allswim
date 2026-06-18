import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

// Zwraca zalogowanego użytkownika lub null.
export async function getCurrentUser(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get("users", userId);
}

// Wymaga zalogowania — w przeciwnym razie rzuca błąd.
export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (user === null) {
    throw new ConvexError("Musisz być zalogowany.");
  }
  return user;
}

// Wymaga roli administratora.
export async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("Brak uprawnień administratora.");
  }
  return user;
}
