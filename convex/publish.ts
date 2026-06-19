import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin, scheduleSignature, groupPoolName } from "./lib";
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

type Category = "assigned" | "rejected" | "scheduleChanged" | "removed" | null;

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
  if (e.status === "rejected" && pubStatus !== "rejected") {
    category = "rejected";
  } else if (e.status === "approved" && e.assignedGroupId) {
    const sameAssignment = pubStatus === "approved" && !groupChanged;
    if (!sameAssignment) {
      // Nowy/zmieniony przydział — powiadamiamy od razu po akceptacji (nawet bez
      // ustalonych godzin). Gdy później dodasz terminy, rodzic dostanie „zmianę grafiku”.
      category = "assigned";
    } else if (timesChanged) {
      category = "scheduleChanged";
    }
  } else if (e.status === "pending" && pubStatus === "approved") {
    category = "removed"; // wcześniej opublikowany jako przydzielony, teraz cofnięty
  }

  return { category, dirty, currentHash: sig.hash, times: sig.times };
}

// Admin: podsumowanie niezapublikowanych zmian (do przycisku i popupu).
export const pendingChanges = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("enrollments").take(2000);

    const assigned: { name: string; groupName: string; poolName: string | null }[] = [];
    const rejected: { name: string }[] = [];
    const scheduleChanged: { name: string; groupName: string; poolName: string | null }[] = [];
    const removed: { name: string }[] = [];
    let dirtyCount = 0;

    for (const e of all) {
      const c = await computeChange(ctx, e);
      if (c.dirty) dirtyCount++;
      if (!c.category) continue;
      if (c.category === "rejected") {
        rejected.push({ name: e.name });
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
        if (c.category === "assigned") assigned.push(item);
        else scheduleChanged.push(item);
      }
    }

    return { dirtyCount, assigned, rejected, scheduleChanged, removed };
  },
});

// Admin: publikacja zmian. Wysyła maile wg zaznaczonych kategorii, a następnie
// przesuwa snapshot opublikowanego stanu. Pierwsza publikacja odsłania grafik.
export const publish = mutation({
  args: {
    notifyAssigned: v.boolean(),
    notifyRejected: v.boolean(),
    notifyScheduleChanged: v.boolean(),
    notifyRemoved: v.boolean(),
  },
  handler: async (
    ctx,
    { notifyAssigned, notifyRejected, notifyScheduleChanged, notifyRemoved },
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

        if (c.category === "assigned" && notifyAssigned) {
          await ctx.scheduler.runAfter(0, internal.emails.sendParticipantAssigned, {
            to: e.email,
            childName: e.name,
            groupName: group?.name ?? "",
            poolName,
            times: timesText,
          });
          mailsQueued++;
        } else if (c.category === "rejected" && notifyRejected) {
          await ctx.scheduler.runAfter(0, internal.emails.sendParticipantRejected, {
            to: e.email,
            childName: e.name,
            note: e.decisionNote ?? null,
          });
          mailsQueued++;
        } else if (c.category === "scheduleChanged" && notifyScheduleChanged) {
          await ctx.scheduler.runAfter(0, internal.emails.sendParticipantScheduleChanged, {
            to: e.email,
            childName: e.name,
            groupName: group?.name ?? "",
            poolName,
            times: timesText,
          });
          mailsQueued++;
        } else if (c.category === "removed" && notifyRemoved) {
          const oldGroup = e.publishedGroupId
            ? await ctx.db.get("groups", e.publishedGroupId)
            : null;
          await ctx.scheduler.runAfter(0, internal.emails.sendParticipantRemoved, {
            to: e.email,
            childName: e.name,
            groupName: oldGroup?.name ?? null,
          });
          mailsQueued++;
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
