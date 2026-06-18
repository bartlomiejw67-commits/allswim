import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { requireAdmin, getCurrentUser } from "./lib";

// Czy nabór jest aktualnie otwarty (publiczne — front pokazuje/ukrywa formularz).
export const recruitmentStatus = query({
  args: {},
  handler: async (ctx) => {
    const settings = (await ctx.db.query("siteSettings").take(1))[0];
    return {
      open: settings?.recruitmentOpen ?? false,
      info: settings?.recruitmentInfo ?? null,
      opensAt: settings?.recruitmentOpensAt ?? null,
      closesAt: settings?.recruitmentClosesAt ?? null,
    };
  },
});

// Wysłanie zgłoszenia naboru (publiczne, działa też bez konta).
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    childAge: v.optional(v.string()),
    levelId: v.optional(v.id("levels")),
    isContinuing: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const settings = (await ctx.db.query("siteSettings").take(1))[0];
    if (!settings?.recruitmentOpen) {
      throw new ConvexError("Nabór jest obecnie zamknięty.");
    }

    let levelLabel: string | undefined;
    if (args.levelId) {
      const level = await ctx.db.get("levels", args.levelId);
      levelLabel = level?.name;
    }

    const userId = await getAuthUserId(ctx); // null jeśli niezalogowany

    const id = await ctx.db.insert("enrollments", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      childAge: args.childAge,
      levelId: args.levelId,
      levelLabel,
      isContinuing: args.isContinuing,
      note: args.note,
      userId: userId ?? undefined,
      status: "pending",
    });

    // Potwierdzenie mailowe (poza transakcją).
    await ctx.scheduler.runAfter(0, internal.emails.sendEnrollmentReceived, {
      to: args.email,
      name: args.name,
    });

    return id;
  },
});

// Zgłoszenia zalogowanego rodzica (panel /konto).
export const myEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const settings = (await ctx.db.query("siteSettings").take(1))[0];
    const published = settings?.schedulePublished ?? false;
    const rows = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
    return await Promise.all(
      rows.map(async (e) => {
        // Grupę pokazujemy rodzicowi dopiero po opublikowaniu grafiku.
        const group =
          published && e.assignedGroupId
            ? await ctx.db.get("groups", e.assignedGroupId)
            : null;
        return {
          _id: e._id,
          name: e.name,
          status: e.status,
          levelLabel: e.levelLabel ?? null,
          isContinuing: e.isContinuing,
          assignedGroupName: group?.name ?? null,
          published,
          decisionNote: e.decisionNote ?? null,
          createdAt: e._creationTime,
        };
      }),
    );
  },
});

// Powiązanie zgłoszeń (wysłanych bez konta) z kontem o tym samym e-mailu.
// Wołane po zalogowaniu/rejestracji. Tworzy też membership dla zatwierdzonych.
export const linkMine = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.email) return 0;
    const email = user.email.toLowerCase();
    const matches = await ctx.db
      .query("enrollments")
      .withIndex("by_email", (q) => q.eq("email", user.email!))
      .take(100);
    // dodatkowo dopasuj po wersji lowercase (gdyby różniła się wielkość liter)
    const all = matches.length
      ? matches
      : (await ctx.db.query("enrollments").take(1000)).filter(
          (e) => e.email.toLowerCase() === email,
        );
    let linked = 0;
    for (const e of all) {
      if (!e.userId) {
        await ctx.db.patch("enrollments", e._id, { userId: user._id });
        linked++;
      }
      if (e.status === "approved" && e.assignedGroupId) {
        const ms = await ctx.db
          .query("memberships")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        if (!ms.find((m) => m.groupId === e.assignedGroupId && m.active)) {
          await ctx.db.insert("memberships", {
            userId: user._id,
            groupId: e.assignedGroupId,
            active: true,
          });
        }
      }
    }
    return linked;
  },
});

// Admin: lista zgłoszeń. Kontynuujący sortowani wyżej, potem wg daty.
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
  },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    const rows = status
      ? await ctx.db
          .query("enrollments")
          .withIndex("by_status", (q) => q.eq("status", status))
          .take(500)
      : await ctx.db.query("enrollments").order("desc").take(500);

    const enriched = await Promise.all(
      rows.map(async (e) => {
        const group = e.assignedGroupId
          ? await ctx.db.get("groups", e.assignedGroupId)
          : null;
        return {
          ...e,
          assignedGroupName: group?.name ?? null,
        };
      }),
    );

    // Kontynuujący (true) przed nowymi, dalej rosnąco wg czasu zgłoszenia.
    enriched.sort((a, b) => {
      if (a.isContinuing !== b.isContinuing) return a.isContinuing ? -1 : 1;
      return a._creationTime - b._creationTime;
    });
    return enriched;
  },
});

// Admin: liczba oczekujących (do oznaczeń w panelu).
export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pending = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(500);
    return pending.length;
  },
});

// Admin: decyzja o zgłoszeniu (akceptacja z przydziałem do grupy / odrzucenie).
export const decide = mutation({
  args: {
    id: v.id("enrollments"),
    approve: v.boolean(),
    assignedGroupId: v.optional(v.id("groups")),
    decisionNote: v.optional(v.string()),
  },
  handler: async (ctx, { id, approve, assignedGroupId, decisionNote }) => {
    await requireAdmin(ctx);
    const enrollment = await ctx.db.get("enrollments", id);
    if (!enrollment) throw new ConvexError("Nie znaleziono zgłoszenia.");

    let groupName: string | undefined;

    if (approve) {
      if (!assignedGroupId) {
        throw new ConvexError("Przy akceptacji wybierz grupę.");
      }
      const group = await ctx.db.get("groups", assignedGroupId);
      if (!group) throw new ConvexError("Nie znaleziono grupy.");
      groupName = group.name;

      // Kontrola limitu miejsc — liczymy zatwierdzone zgłoszenia w tej grupie
      // (obejmuje też zgłoszenia bez konta).
      const assignedApproved = await ctx.db
        .query("enrollments")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .take(1000);
      const inGroup = assignedApproved.filter(
        (x) => x.assignedGroupId === assignedGroupId && x._id !== id,
      ).length;
      if (inGroup >= group.capacity) {
        throw new ConvexError("Brak wolnych miejsc w wybranej grupie.");
      }

      await ctx.db.patch("enrollments", id, {
        status: "approved",
        assignedGroupId,
        decisionNote,
      });

      // Jeśli zgłoszenie powiązane z kontem — utwórz przydział (membership).
      if (enrollment.userId) {
        const existing = await ctx.db
          .query("memberships")
          .withIndex("by_group", (q) => q.eq("groupId", assignedGroupId))
          .collect();
        const has = existing.find((m) => m.userId === enrollment.userId && m.active);
        if (!has) {
          await ctx.db.insert("memberships", {
            userId: enrollment.userId,
            groupId: assignedGroupId,
            active: true,
          });
        }
      }
    } else {
      await ctx.db.patch("enrollments", id, {
        status: "rejected",
        decisionNote,
      });
    }

    // Powiadomienie o decyzji (poza transakcją).
    await ctx.scheduler.runAfter(0, internal.emails.sendEnrollmentDecision, {
      to: enrollment.email,
      name: enrollment.name,
      approved: approve,
      groupName,
      note: decisionNote,
    });

    return true;
  },
});

// Admin: wypisanie ze slotu (powrót do „oczekuje", zdjęcie przydziału).
export const unassign = mutation({
  args: { id: v.id("enrollments") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const e = await ctx.db.get("enrollments", id);
    if (!e) return;
    if (e.userId && e.assignedGroupId) {
      const ms = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", e.userId!))
        .collect();
      for (const m of ms) {
        if (m.groupId === e.assignedGroupId) await ctx.db.delete("memberships", m._id);
      }
    }
    await ctx.db.patch("enrollments", id, { status: "pending", assignedGroupId: undefined });
  },
});

export const remove = mutation({
  args: { id: v.id("enrollments") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("enrollments", id);
  },
});
