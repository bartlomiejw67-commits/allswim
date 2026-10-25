import { query, mutation, internalQuery, internalMutation, internalAction, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib";
import { EmailContent, sendViaResend } from "./emails";

// Skrzynka nadawcza: każdy mail jest najpierw zapisywany (rejestr), potem wysyłany w tle.
// - wysyłka rozłożona w czasie (masowe wysyłki co ~0,7 s, poniżej limitu Resend),
// - automatyczne ponawianie przy limitach/awariach (coraz rzadziej, ~2 h; przy dziennym limicie co godzinę przez dobę),
// - klucz idempotencji: ponowienie po zerwanym połączeniu nie wyśle maila drugi raz,
// - admin widzi status każdego maila w panelu (zakładka „Wiadomości e-mail") i może ponowić nieudane.

export const STAGGER_MS = 700;

// Opóźnienia kolejnych ponowień (po 1., 2., … nieudanej próbie).
const BACKOFF_MS = [5_000, 15_000, 45_000, 120_000, 300_000, 900_000, 1_800_000, 3_600_000];
const QUOTA_RETRY_MS = 3_600_000; // przekroczony dzienny limit Resend — próbuj co godzinę
const MAX_QUOTA_ATTEMPTS = 26; // ~doba prób przy limicie dziennym

// Zapisuje mail w skrzynce i planuje jego wysyłkę. Wołane z mutacji (np. zgłoszenie, publikacja).
export async function enqueueEmail(
  ctx: MutationCtx,
  args: { to: string; kind: string; content: EmailContent; enrollmentId?: Id<"enrollments">; childName?: string; delayMs?: number },
): Promise<Id<"emailOutbox">> {
  const id = await ctx.db.insert("emailOutbox", {
    to: args.to,
    kind: args.kind,
    subject: args.content.subject,
    html: args.content.html,
    text: args.content.text,
    status: "queued",
    attempts: 0,
    keySeq: 0,
    enrollmentId: args.enrollmentId,
    childName: args.childName,
  });
  await ctx.scheduler.runAfter(args.delayMs ?? 0, internal.outbox.deliver, { id });
  return id;
}

export const get = internalQuery({
  args: { id: v.id("emailOutbox") },
  handler: async (ctx, { id }) => await ctx.db.get("emailOutbox", id),
});

// Właściwa wysyłka jednego maila (w tle).
export const deliver = internalAction({
  args: { id: v.id("emailOutbox") },
  handler: async (ctx, { id }) => {
    const row: Doc<"emailOutbox"> | null = await ctx.runQuery(internal.outbox.get, { id });
    if (!row || row.status !== "queued") return null; // wysłany, nieudany albo usunięty
    const r = await sendViaResend({
      to: row.to,
      subject: row.subject,
      html: row.html,
      text: row.text,
      idempotencyKey: `allswim-${id}-${row.keySeq ?? 0}`,
    });
    await ctx.runMutation(
      internal.outbox.record,
      r.ok
        ? { id, ok: true, resendId: r.id }
        : { id, ok: false, error: r.error, retryable: r.retryable, retryAfterMs: r.retryAfterMs, quota: r.quota, network: r.network },
    );
    return null;
  },
});

// Zapis wyniku próby + ewentualne zaplanowanie ponowienia (transakcyjnie).
export const record = internalMutation({
  args: {
    id: v.id("emailOutbox"),
    ok: v.boolean(),
    resendId: v.optional(v.string()),
    error: v.optional(v.string()),
    retryable: v.optional(v.boolean()),
    retryAfterMs: v.optional(v.number()),
    quota: v.optional(v.boolean()),
    network: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const row = await ctx.db.get("emailOutbox", a.id);
    if (!row || row.status !== "queued") return null;
    const attempts = row.attempts + 1;

    if (a.ok) {
      await ctx.db.patch("emailOutbox", a.id, { status: "sent", attempts, sentAt: Date.now(), resendId: a.resendId, lastError: undefined });
      return null;
    }

    // Po jednoznacznym odrzuceniu nowy klucz idempotencji (Resend mógł zapamiętać odpowiedź z błędem);
    // po zerwanym połączeniu ten sam klucz (nie wiemy, czy mail nie wyszedł).
    const keySeq = a.network ? (row.keySeq ?? 0) : (row.keySeq ?? 0) + 1;
    const canRetry = a.retryable && (a.quota ? attempts < MAX_QUOTA_ATTEMPTS : attempts <= BACKOFF_MS.length);

    if (canRetry) {
      const base = a.quota ? QUOTA_RETRY_MS : BACKOFF_MS[attempts - 1];
      const delay = Math.max(base, a.retryAfterMs ?? 0) + Math.floor(Math.random() * 2000);
      await ctx.db.patch("emailOutbox", a.id, { attempts, keySeq, lastError: a.error });
      await ctx.scheduler.runAfter(delay, internal.outbox.deliver, { id: a.id });
    } else {
      await ctx.db.patch("emailOutbox", a.id, { status: "failed", attempts, keySeq, lastError: a.error });
    }
    return null;
  },
});

// --- Panel admina ---

const statusV = v.union(v.literal("queued"), v.literal("sent"), v.literal("failed"));

export const list = query({
  args: { status: v.optional(statusV) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    const rows = status
      ? await ctx.db.query("emailOutbox").withIndex("by_status", (q) => q.eq("status", status)).order("desc").take(300)
      : await ctx.db.query("emailOutbox").order("desc").take(300);
    // Bez treści HTML (duża) — tylko dane do listy.
    return rows.map((r) => ({
      _id: r._id,
      _creationTime: r._creationTime,
      to: r.to,
      kind: r.kind,
      subject: r.subject,
      status: r.status,
      attempts: r.attempts,
      lastError: r.lastError ?? null,
      sentAt: r.sentAt ?? null,
      childName: r.childName ?? null,
    }));
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const count = async (s: "queued" | "sent" | "failed") =>
      (await ctx.db.query("emailOutbox").withIndex("by_status", (q) => q.eq("status", s)).take(5000)).length;
    const since = Date.now() - 24 * 3600 * 1000;
    const recentSent = (await ctx.db.query("emailOutbox").withIndex("by_status", (q) => q.eq("status", "sent")).order("desc").take(500))
      .filter((r) => (r.sentAt ?? 0) >= since).length;
    return { queued: await count("queued"), sent: await count("sent"), failed: await count("failed"), sentLast24h: recentSent };
  },
});

export const failedCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await ctx.db.query("emailOutbox").withIndex("by_status", (q) => q.eq("status", "failed")).take(1000)).length;
  },
});

// Ponów jeden mail (nieudany lub utknięty w kolejce).
export const retry = mutation({
  args: { id: v.id("emailOutbox") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("emailOutbox", id);
    if (!row || row.status === "sent") return false;
    await ctx.db.patch("emailOutbox", id, { status: "queued", attempts: 0, keySeq: (row.keySeq ?? 0) + 1, lastError: undefined });
    await ctx.scheduler.runAfter(0, internal.outbox.deliver, { id });
    return true;
  },
});

// Ponów wszystkie nieudane (rozłożone w czasie).
export const retryAllFailed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const failed = await ctx.db.query("emailOutbox").withIndex("by_status", (q) => q.eq("status", "failed")).take(500);
    let i = 0;
    for (const row of failed) {
      await ctx.db.patch("emailOutbox", row._id, { status: "queued", attempts: 0, keySeq: (row.keySeq ?? 0) + 1, lastError: undefined });
      await ctx.scheduler.runAfter(i * STAGGER_MS, internal.outbox.deliver, { id: row._id });
      i++;
    }
    return failed.length;
  },
});

// Test z CLI (bez prawdziwego odbiorcy): `npx convex run outbox:sendTest '{}'` — adres testowy Resend symuluje doręczenie.
export const sendTest = internalMutation({
  args: { to: v.optional(v.string()), count: v.optional(v.number()) },
  handler: async (ctx, { to, count }) => {
    // count > 1 = celowy „wybuch” naraz (test zachowania przy limicie Resend).
    for (let i = 1; i < (count ?? 1); i++) await enqueueEmail(ctx, { to: to ?? "delivered@resend.dev", kind: "received", childName: "TEST "+i, content: { subject: "Test limitu "+i, html: "<p>Test limitu</p>", text: "Test limitu" } });
    return await enqueueEmail(ctx, {
      to: to ?? "delivered@resend.dev",
      kind: "received",
      childName: "TEST (skrzynka nadawcza)",
      content: { subject: "Test skrzynki nadawczej — ALL SWIM", html: "<p>Test wysyłki przez skrzynkę nadawczą.</p>", text: "Test wysyłki przez skrzynkę nadawczą." },
    });
  },
});

// Sprzątanie maili testowych z rejestru (CLI): `npx convex run outbox:purgeTests '{}'`.
export const purgeTests = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("emailOutbox").order("desc").take(200);
    let n = 0;
    for (const r of rows) {
      if ((r.childName ?? "").startsWith("TEST") || r.to === "to-nie-jest-adres") {
        await ctx.db.delete("emailOutbox", r._id);
        n++;
      }
    }
    return n;
  },
});
