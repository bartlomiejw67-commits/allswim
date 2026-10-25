import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, scheduleSignature, groupPoolName } from "./lib";
import { enqueueEmail, STAGGER_MS } from "./outbox";
import { tpl, EmailContent } from "./emails";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";

const DAY_NAMES = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

function formatTimes(
  times: { dayOfWeek: number; startTime: string; endTime: string }[],
): string {
  return times
    .map((t) => `${DAY_NAMES[t.dayOfWeek] ?? "?"} ${t.startTime}–${t.endTime}`)
    .join(", ");
}

type Category = "accepted" | "assigned" | "rejected" | "reserve" | "resigned" | "scheduleChanged" | "removed" | null;

// Wylicza, co zmieniło się w zgłoszeniu względem ostatnio opublikowanego stanu.
async function computeChange(
  ctx: QueryCtx,
  e: Doc<"enrollments">,
): Promise<{
  category: Category;
  dirty: boolean;
  currentHash: string;
  times: { dayOfWeek: number; startTime: string; endTime: string }[];
}> {
  const sig = await scheduleSignature(ctx, e.assignedGroupId);
  const pubStatus = e.publishedStatus ?? "pending";
  const groupChanged = (e.publishedGroupId ?? null) !== (e.assignedGroupId ?? null);
  const timesChanged = (e.publishedTimesHash ?? "") !== sig.hash;
  const dirty = pubStatus !== e.status || groupChanged || timesChanged;

  let category: Category = null;
  const hasTimes = sig.hash !== "";
  if (e.status === "rejected" && pubStatus !== "rejected") {
    category = "rejected";
  } else if (e.status === "resigned" && pubStatus !== "resigned") {
    category = "resigned"; // rezygnacja — opcjonalne potwierdzenie mailem
  } else if (e.status === "reserve" && pubStatus !== "reserve") {
    category = "reserve";
  } else if (e.status === "approved" && e.assignedGroupId) {
    if (pubStatus === "approved" && e.publishedGroupId) {
      // Dziecko już było w grupie: przeniesienie do innej grupy albo zmiana godzin/basenu
      // = „zmiana grafiku” (gdy nowa grupa nie ma jeszcze godzin — mail dopiero, gdy je dostanie).
      if ((groupChanged || timesChanged) && hasTimes) category = "scheduleChanged";
    } else {
      // Pierwszy przydział: z godzinami — pełne „przyjęcie”; bez godzin — sama akceptacja.
      category = hasTimes ? "assigned" : "accepted";
    }
  } else if (e.status === "pending" && pubStatus === "approved") {
    category = "removed"; // wcześniej opublikowany jako przydzielony, teraz cofnięty do oczekujących
  }

  return { category, dirty, currentHash: sig.hash, times: sig.times };
}

// Jednorazowa wysyłka: do KAŻDEJ zaakceptowanej osoby z przydzieloną grupą wysyła
// mail „przyjęcie na zajęcia" z grupą, basenem i godzinami — niezależnie od tego,
// czy było już opublikowane. Uruchamiane z CLI: `npx convex run publish:resendAllAssigned`.
// Opcjonalny dryRun: tylko liczy, nic nie wysyła.
export const resendAllAssigned = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const approved = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .take(1000);
    let sent = 0;
    let skippedNoGroup = 0;
    const recipients: string[] = [];
    for (const e of approved) {
      if (!e.email || !e.assignedGroupId) {
        skippedNoGroup++;
        continue;
      }
      const group = await ctx.db.get("groups", e.assignedGroupId);
      const poolName = await groupPoolName(ctx, e.assignedGroupId);
      const sig = await scheduleSignature(ctx, e.assignedGroupId);
      const times = formatTimes(sig.times);
      if (!dryRun) {
        await enqueueEmail(ctx, {
          to: e.email,
          kind: "assigned",
          enrollmentId: e._id,
          childName: e.name,
          content: tpl.participantAssigned({ childName: e.name, groupName: group?.name ?? "", poolName, times }),
          delayMs: sent * STAGGER_MS,
        });
      }
      sent++;
      recipients.push(`${e.name} → ${group?.name ?? "?"} (${times || "brak godzin"})`);
    }
    return { sent, skippedNoGroup, dryRun: !!dryRun, recipients };
  },
});

// Jednorazowa wysyłka: mail „lista rezerwowa" do KAŻDEJ osoby ze statusem reserve.
// Uruchamiane z CLI: `npx convex run publish:resendAllReserve`. dryRun = tylko liczy.
export const resendAllReserve = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const reserve = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "reserve"))
      .take(1000);
    let sent = 0;
    const recipients: string[] = [];
    for (const e of reserve) {
      if (!e.email) continue;
      if (!dryRun) {
        await enqueueEmail(ctx, {
          to: e.email,
          kind: "reserve",
          enrollmentId: e._id,
          childName: e.name,
          content: tpl.participantReserve({ childName: e.name }),
          delayMs: sent * STAGGER_MS,
        });
      }
      sent++;
      recipients.push(`${e.name} <${e.email}>`);
    }
    return { sent, dryRun: !!dryRun, recipients };
  },
});

// Jednorazowo z CLI: zeruje licznik niezapublikowanych zmian BEZ wysyłania maili i BEZ cofania
// stanu roboczego — przesuwa snapshot „opublikowanego" stanu do bieżącego dla zmienionych zgłoszeń.
// Nie zmienia widoczności grafiku. `npx convex run publish:acknowledgeSilently '{"dryRun":true}'`.
export const acknowledgeSilently = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const all = await ctx.db.query("enrollments").take(2000);
    const touched: string[] = [];
    for (const e of all) {
      const c = await computeChange(ctx, e);
      if (!c.dirty) continue;
      touched.push(`${e.name} (${e.publishedStatus ?? "pending"} → ${e.status}${c.category ? `, ${c.category}` : ""})`);
      if (!dryRun) {
        await ctx.db.patch("enrollments", e._id, {
          publishedStatus: e.status,
          publishedGroupId: e.assignedGroupId,
          publishedTimesHash: c.currentHash,
        });
      }
    }
    return { count: touched.length, dryRun: !!dryRun, touched };
  },
});

// Admin: podsumowanie niezapublikowanych zmian (do przycisku i popupu).
export const pendingChanges = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("enrollments").take(2000);

    const assigned: { name: string; groupName: string; poolName: string | null }[] = [];
    const rejected: { name: string }[] = [];
    const reserved: { name: string }[] = [];
    const resigned: { name: string }[] = [];
    const scheduleChanged: { name: string; groupName: string; poolName: string | null; moved: boolean }[] = [];
    const removed: { name: string }[] = [];
    let dirtyCount = 0;

    for (const e of all) {
      const c = await computeChange(ctx, e);
      if (c.dirty) dirtyCount++;
      if (!c.category) continue;
      if (c.category === "rejected") {
        rejected.push({ name: e.name });
      } else if (c.category === "reserve") {
        reserved.push({ name: e.name });
      } else if (c.category === "resigned") {
        resigned.push({ name: e.name });
      } else if (c.category === "removed") {
        removed.push({ name: e.name });
      } else {
        const group = e.assignedGroupId
          ? await ctx.db.get("groups", e.assignedGroupId)
          : null;
        const item = {
          name: e.name,
          groupName: group?.name ?? "—",
          poolName: await groupPoolName(ctx, e.assignedGroupId),
        };
        if (c.category === "assigned" || c.category === "accepted") assigned.push(item);
        else scheduleChanged.push({ ...item, moved: (e.publishedGroupId ?? null) !== (e.assignedGroupId ?? null) });
      }
    }

    return { dirtyCount, assigned, rejected, reserved, resigned, scheduleChanged, removed };
  },
});

// Admin: publikacja zmian. Wysyła maile wg zaznaczonych kategorii, a następnie
// przesuwa snapshot opublikowanego stanu. Pierwsza publikacja odsłania grafik.
export const publish = mutation({
  args: {
    notifyAssigned: v.boolean(),
    notifyRejected: v.boolean(),
    notifyReserve: v.boolean(),
    notifyScheduleChanged: v.boolean(),
    notifyRemoved: v.boolean(),
    notifyResigned: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { notifyAssigned, notifyRejected, notifyReserve, notifyScheduleChanged, notifyRemoved, notifyResigned },
  ) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("enrollments").take(2000);

    let publishedCount = 0;
    let mailsQueued = 0;

    for (const e of all) {
      const c = await computeChange(ctx, e);
      if (!c.dirty) continue;
      publishedCount++;

      // Mail za realną zmianę (jeśli zaznaczona kategoria i jest adres).
      if (c.category && e.email) {
        const group = e.assignedGroupId
          ? await ctx.db.get("groups", e.assignedGroupId)
          : null;
        const poolName = await groupPoolName(ctx, e.assignedGroupId);
        const timesText = formatTimes(c.times);

        // Maile do skrzynki nadawczej, rozsunięte w czasie (kolejny co STAGGER_MS) — bez zderzeń z limitem Resend.
        const send = async (kind: string, content: EmailContent) => {
          await enqueueEmail(ctx, { to: e.email, kind, content, enrollmentId: e._id, childName: e.name, delayMs: mailsQueued * STAGGER_MS });
          mailsQueued++;
        };
        if (c.category === "accepted" && notifyAssigned) {
          await send("accepted", tpl.participantAccepted({ childName: e.name }));
        } else if (c.category === "assigned" && notifyAssigned) {
          await send("assigned", tpl.participantAssigned({ childName: e.name, groupName: group?.name ?? "", poolName, times: timesText }));
        } else if (c.category === "rejected" && notifyRejected) {
          await send("rejected", tpl.participantRejected({ childName: e.name, note: e.decisionNote ?? null }));
        } else if (c.category === "reserve" && notifyReserve) {
          await send("reserve", tpl.participantReserve({ childName: e.name }));
        } else if (c.category === "resigned" && notifyResigned) {
          await send("resigned", tpl.participantResigned({ childName: e.name }));
        } else if (c.category === "scheduleChanged" && notifyScheduleChanged) {
          await send("scheduleChanged", tpl.participantScheduleChanged({ childName: e.name, groupName: group?.name ?? "", poolName, times: timesText }));
        } else if (c.category === "removed" && notifyRemoved) {
          const oldGroup = e.publishedGroupId
            ? await ctx.db.get("groups", e.publishedGroupId)
            : null;
          await send("removed", tpl.participantRemoved({ childName: e.name, groupName: oldGroup?.name ?? null }));
        }
      }

      // Przesuń snapshot opublikowanego stanu do bieżącego.
      await ctx.db.patch("enrollments", e._id, {
        publishedStatus: e.status,
        publishedGroupId: e.assignedGroupId,
        publishedTimesHash: c.currentHash,
      });
    }

    // Tylko PIERWSZA publikacja (gdy widoczność nie była jeszcze ustalona)
    // odsłania grafik — ręczne ukrycie przez admina jest odtąd respektowane.
    const settings = (await ctx.db.query("siteSettings").take(1))[0];
    if (settings && settings.scheduleLive === undefined) {
      await ctx.db.patch("siteSettings", settings._id, { scheduleLive: true });
    } else if (!settings) {
      await ctx.db.insert("siteSettings", {
        recruitmentOpen: false,
        scheduleLive: true,
      });
    }

    return { publishedCount, mailsQueued };
  },
});

// Jednorazowo po zmianie formatu podpisu grafiku (dodany basen): przelicza zapisany podpis
// u dzieci, których grafik się NIE zmienił — żeby najbliższa publikacja nie wysłała
// wszystkim „zmiany grafiku”. CLI: npx convex run publish:migrateSignatures '{"dryRun":true}'
export const migrateSignatures = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const all = await ctx.db.query("enrollments").take(3000);
    let upgraded = 0;
    let differs = 0;
    for (const e of all) {
      if (!e.publishedGroupId || !e.publishedTimesHash) continue;
      const entries = await ctx.db
        .query("scheduleEntries")
        .withIndex("by_group", (q) => q.eq("groupId", e.publishedGroupId!))
        .collect();
      const oldHash = entries
        .map((x) => ({ d: x.dayOfWeek, s: x.startTime, t: x.endTime }))
        .sort((a, b) => a.d - b.d || a.s.localeCompare(b.s))
        .map((x) => x.d + "|" + x.s + "|" + x.t)
        .join(",");
      if (e.publishedTimesHash !== oldHash) { differs++; continue; } // realna, nieopublikowana zmiana — zostaje
      const sig = await scheduleSignature(ctx, e.publishedGroupId);
      if (!dryRun) await ctx.db.patch("enrollments", e._id, { publishedTimesHash: sig.hash });
      upgraded++;
    }
    return { upgraded, differs, dryRun: !!dryRun };
  },
});
