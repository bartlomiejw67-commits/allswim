import { query, mutation, internalQuery, internalMutation, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib";
import { enqueueEmail, STAGGER_MS } from "./outbox";
import { tpl } from "./emails";

// Płatności miesięczne. Rodzina = e-mail rodzica (małe litery); dzieci = zgłoszenia przyjęte do grup.
// Na stronie są tylko daty i kwoty wpłat (bez numerów kont i tytułów przelewów).
// Dane wpłat wgrywane po rozliczeniu wyciągu (importMonth, z CLI).

const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
}

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
const zl = (gr: number) => `${(gr / 100).toLocaleString("pl-PL", { minimumFractionDigits: gr % 100 ? 2 : 0, maximumFractionDigits: 2 })} zł`;

type Config = { base: number; sibling: number; third: number }; // w zł

async function getConfig(ctx: QueryCtx): Promise<Config> {
  const s = (await ctx.db.query("siteSettings").take(1))[0];
  return { base: s?.payBase ?? 220, sibling: s?.paySibling ?? 200, third: s?.payThird ?? 195 };
}

// Należność rodziny (w groszach): 1 dziecko = base; 2 = 2×sibling; każde kolejne = third.
function expectedFor(n: number, c: Config): number {
  if (n <= 0) return 0;
  if (n === 1) return c.base * 100;
  return (2 * c.sibling + Math.max(0, n - 2) * c.third) * 100;
}

type Status = "paid" | "partial" | "unpaid" | "cash" | "exempt";

// Wiersze miesiąca: rodziny z aktualnej listy przyjętych dzieci + rodziny, które mają zapis za ten miesiąc.
async function buildMonth(ctx: QueryCtx, month: string) {
  const cfg = await getConfig(ctx);
  const approved = await ctx.db.query("enrollments").withIndex("by_status", (q) => q.eq("status", "approved")).take(2000);
  const families = new Map<string, { email: string; children: string[] }>();
  for (const e of approved) {
    if (!e.assignedGroupId) continue;
    const key = norm(e.email);
    const f = families.get(key) ?? { email: e.email.trim(), children: [] };
    if (!f.children.includes(e.name)) f.children.push(e.name);
    families.set(key, f);
  }
  const records = await ctx.db.query("paymentRecords").withIndex("by_month", (q) => q.eq("month", month)).take(2000);
  const recByFamily = new Map(records.map((r) => [r.family, r]));
  for (const r of records) if (!families.has(r.family)) families.set(r.family, { email: r.family, children: [] });

  const rows = [...families.entries()].map(([family, f]) => {
    const rec = recByFamily.get(family);
    const transfers = rec?.transfers ?? [];
    const paid = transfers.reduce((s, t) => s + t.amount, 0);
    const expected = expectedFor(f.children.length, cfg);
    let status: Status = rec?.override === "cash" ? "cash" : rec?.override === "exempt" ? "exempt" : "unpaid";
    if (!rec?.override) status = paid <= 0 ? "unpaid" : expected > 0 && paid < expected ? "partial" : "paid";
    const lastDate = transfers.length ? [...transfers].sort((a, b) => b.date.localeCompare(a.date))[0].date : null;
    return {
      family,
      email: f.email,
      children: [...f.children].sort((a, b) => a.localeCompare(b, "pl")),
      inRoster: f.children.length > 0,
      expected,
      paid,
      transfers,
      lastDate,
      status,
      note: rec?.note ?? null,
      reminderSentAt: rec?.reminderSentAt ?? null,
    };
  });
  rows.sort((a, b) => (a.children[0] ?? a.email).localeCompare(b.children[0] ?? b.email, "pl"));
  const imports = await ctx.db.query("paymentImports").withIndex("by_month", (q) => q.eq("month", month)).take(50);
  const lastImport = imports.sort((a, b) => b.coveredUntil.localeCompare(a.coveredUntil))[0] ?? null;
  return { rows, cfg, lastImport: lastImport ? { coveredUntil: lastImport.coveredUntil, at: lastImport._creationTime } : null };
}

// --- Panel admina ---

export const month = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    await requireAdmin(ctx);
    return await buildMonth(ctx, month);
  },
});

export const setOverride = mutation({
  args: { month: v.string(), family: v.string(), override: v.union(v.literal("cash"), v.literal("exempt"), v.null()), note: v.optional(v.string()) },
  handler: async (ctx, { month, family, override, note }) => {
    await requireAdmin(ctx);
    const rec = await ctx.db.query("paymentRecords").withIndex("by_month_family", (q) => q.eq("month", month).eq("family", family)).unique();
    if (rec) await ctx.db.patch("paymentRecords", rec._id, { override: override ?? undefined, note: note ?? rec.note });
    else await ctx.db.insert("paymentRecords", { month, family, transfers: [], override: override ?? undefined, note });
  },
});

export const setConfig = mutation({
  args: { base: v.number(), sibling: v.number(), third: v.number() },
  handler: async (ctx, { base, sibling, third }) => {
    await requireAdmin(ctx);
    if ([base, sibling, third].some((n) => !(n >= 0 && n < 100000))) throw new ConvexError("Nieprawidłowa kwota.");
    const s = (await ctx.db.query("siteSettings").take(1))[0];
    if (s) await ctx.db.patch("siteSettings", s._id, { payBase: base, paySibling: sibling, payThird: third });
    else await ctx.db.insert("siteSettings", { recruitmentOpen: false, payBase: base, paySibling: sibling, payThird: third });
  },
});

// Przypomnienia do wybranych rodzin. Serwer sam pilnuje: tylko rodziny bez pełnej wpłaty,
// bez wyjątku (gotówka/zwolniony) i tylko gdy za ten miesiąc jest rozliczony wyciąg.
export const sendReminders = mutation({
  args: { month: v.string(), families: v.array(v.string()), allowRepeat: v.optional(v.boolean()) },
  handler: async (ctx, { month, families, allowRepeat }) => {
    await requireAdmin(ctx);
    const data = await buildMonth(ctx, month);
    if (!data.lastImport) throw new ConvexError("Za ten miesiąc nie ma jeszcze rozliczonego wyciągu — przypomnienia zablokowane.");
    const settings = (await ctx.db.query("siteSettings").take(1))[0];
    const wanted = new Set(families);
    let sent = 0;
    const skipped: string[] = [];
    for (const r of data.rows) {
      if (!wanted.has(r.family)) continue;
      if (!(r.status === "unpaid" || r.status === "partial") || !r.inRoster) { skipped.push(`${r.email} (opłacone/wyjątek)`); continue; }
      if (r.reminderSentAt && !allowRepeat) { skipped.push(`${r.email} (przypomnienie już wysłane)`); continue; }
      const due = r.expected - r.paid;
      await enqueueEmail(ctx, {
        to: r.email,
        kind: "paymentReminder",
        childName: r.children.join(", "),
        content: tpl.paymentReminder({
          children: r.children.join(" i "),
          monthLabel: monthLabel(month),
          amount: zl(due > 0 ? due : r.expected),
          account: settings?.paymentAccount ?? null,
          deadline: settings?.paymentDeadline ?? null,
        }),
        delayMs: sent * STAGGER_MS,
      });
      const rec = await ctx.db.query("paymentRecords").withIndex("by_month_family", (q) => q.eq("month", month).eq("family", r.family)).unique();
      if (rec) await ctx.db.patch("paymentRecords", rec._id, { reminderSentAt: Date.now() });
      else await ctx.db.insert("paymentRecords", { month, family: r.family, transfers: [], reminderSentAt: Date.now() });
      sent++;
    }
    return { sent, skipped };
  },
});

// --- Import rozliczenia wyciągu (CLI, po dopasowaniu wpłat do rodzin) ---
// `npx convex run payments:importMonth '{"month":"2026-11","coveredUntil":"2026-11-11","entries":[{"family":"x@y.pl","transfers":[{"date":"2026-11-09","amount":22000}]}]}'`
// Wpłaty się nie dublują (ta sama data+kwota u rodziny = ten sam przelew), więc wyciągi mogą na siebie zachodzić.
export const importMonth = internalMutation({
  args: {
    month: v.string(),
    coveredUntil: v.string(),
    entries: v.array(v.object({ family: v.string(), transfers: v.array(v.object({ date: v.string(), amount: v.number() })) })),
  },
  handler: async (ctx, { month, coveredUntil, entries }) => {
    let added = 0;
    for (const e of entries) {
      const family = norm(e.family);
      const rec = await ctx.db.query("paymentRecords").withIndex("by_month_family", (q) => q.eq("month", month).eq("family", family)).unique();
      const existing = rec?.transfers ?? [];
      const merged = [...existing];
      for (const t of e.transfers) {
        if (!merged.some((x) => x.date === t.date && x.amount === t.amount)) { merged.push(t); added++; }
      }
      if (rec) await ctx.db.patch("paymentRecords", rec._id, { transfers: merged });
      else await ctx.db.insert("paymentRecords", { month, family, transfers: merged });
    }
    await ctx.db.insert("paymentImports", { month, coveredUntil, transfersCount: added });
    return { added, families: entries.length };
  },
});

// Lista rodzin (e-mail + dzieci) do dopasowania wyciągu — CLI, dla procedury rozliczeń.
export const roster = internalQuery({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    const { rows, cfg } = await buildMonth(ctx, month);
    return { cfg, families: rows.filter((r) => r.inRoster).map((r) => ({ family: r.family, children: r.children, expected: r.expected / 100, paid: r.paid / 100 })) };
  },
});

// Usunięcie danych miesiąca (CLI) — np. po testach albo przy ponownym rozliczeniu od zera.
export const clearMonth = internalMutation({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    const recs = await ctx.db.query("paymentRecords").withIndex("by_month", (q) => q.eq("month", month)).take(2000);
    for (const r of recs) await ctx.db.delete("paymentRecords", r._id);
    const imps = await ctx.db.query("paymentImports").withIndex("by_month", (q) => q.eq("month", month)).take(200);
    for (const i of imps) await ctx.db.delete("paymentImports", i._id);
    return { records: recs.length, imports: imps.length };
  },
});

