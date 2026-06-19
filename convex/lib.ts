import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
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

// Posortowane terminy danej grupy + ich deterministyczny podpis.
// Podpis służy do wykrywania zmian godzin między publikacjami (diff → mail).
export async function scheduleSignature(
  ctx: QueryCtx,
  groupId: Id<"groups"> | undefined,
): Promise<{
  times: { dayOfWeek: number; startTime: string; endTime: string }[];
  hash: string;
}> {
  if (!groupId) return { times: [], hash: "" };
  const entries = await ctx.db
    .query("scheduleEntries")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();
  const times = entries
    .map((e) => ({
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
    }))
    .sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
    );
  const hash = times.map((t) => `${t.dayOfWeek}|${t.startTime}|${t.endTime}`).join(",");
  return { times, hash };
}

// Nazwa basenu grupy (cała grupa = jeden basen) — z jej pierwszego terminu.
export async function groupPoolName(
  ctx: QueryCtx,
  groupId: Id<"groups"> | undefined,
): Promise<string | null> {
  if (!groupId) return null;
  const entry = (
    await ctx.db
      .query("scheduleEntries")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .take(1)
  )[0];
  if (!entry) return null;
  const pool = await ctx.db.get("pools", entry.poolId);
  return pool?.name ?? null;
}
