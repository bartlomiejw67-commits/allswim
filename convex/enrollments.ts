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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    consent: v.boolean(), // zgoda RODO
    hp: v.optional(v.string()), // honeypot — wypełniony tylko przez boty
  },
  handler: async (ctx, args) => {
    // Honeypot: jeśli ukryte pole jest wypełnione, udajemy sukces bez zapisu.
    if (args.hp && args.hp.trim() !== "") return null;

    const settings = (await ctx.db.query("siteSettings").take(1))[0];
    if (!settings?.recruitmentOpen) {
      throw new ConvexError("Nabór jest obecnie zamknięty.");
    }
    if (!args.consent) {
      throw new ConvexError("Wymagana jest zgoda na przetwarzanie danych.");
    }

    const name = args.name.trim();
    const email = args.email.trim();
    if (!name) throw new ConvexError("Podaj imię i nazwisko dziecka.");
    if (!EMAIL_RE.test(email)) throw new ConvexError("Podaj poprawny adres e-mail.");

    // Blokada duplikatów: identyczne oczekujące zgłoszenie (ten sam e-mail + dziecko).
    const sameEmail = await ctx.db
      .query("enrollments")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(50);
    if (
      sameEmail.some(
        (d) => d.status === "pending" && d.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new ConvexError("To zgłoszenie już do nas trafiło — czeka na rozpatrzenie.");
    }

    let levelLabel: string | undefined;
    if (args.levelId) {
      const level = await ctx.db.get("levels", args.levelId);
      levelLabel = level?.name;
    }

    const userId = await getAuthUserId(ctx); // null jeśli niezalogowany

    const id = await ctx.db.insert("enrollments", {
      name,
      email,
      phone: args.phone,
      childAge: args.childAge,
      levelId: args.levelId,
      levelLabel,
      isContinuing: args.isContinuing,
      note: args.note,
      userId: userId ?? undefined,
      consentAt: Date.now(),
      status: "pending",
    });

    // Powiadomienie administratora o nowym zgłoszeniu (poza transakcją).
    const adminEmail = settings?.contactEmail;
    if (adminEmail) {
      await ctx.scheduler.runAfter(0, internal.emails.sendAdminNewEnrollment, {
        to: adminEmail,
        childName: name,
        levelLabel: levelLabel ?? null,
        parentEmail: email,
        parentPhone: args.phone ?? null,
        isContinuing: args.isContinuing,
      });
    }
    // Potwierdzenie otrzymania zgłoszenia dla rodzica (szkielet pod Resend).
    await ctx.scheduler.runAfter(0, internal.emails.sendParticipantReceived, {
      to: email,
      childName: name,
    });

    return id;
  },
});

// Zgłoszenia zalogowanego rodzica (panel /konto) — wg OPUBLIKOWANEGO stanu.
export const myEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
    return await Promise.all(
      rows.map(async (e) => {
        // Rodzic widzi tylko to, co opublikowane (status, grupa).
        const status = e.publishedStatus ?? "pending";
        const group = e.publishedGroupId
          ? await ctx.db.get("groups", e.publishedGroupId)
          : null;
        return {
          _id: e._id,
          name: e.name,
          status,
          levelLabel: e.levelLabel ?? null,
          isContinuing: e.isContinuing,
          assignedGroupName: group?.name ?? null,
          decisionNote:
            status === "rejected" || status === "approved"
              ? e.decisionNote ?? null
              : null,
          createdAt: e._creationTime,
        };
      }),
    );
  },
});

// Powiązanie zgłoszeń (wysłanych bez konta) z kontem o tym samym e-mailu.
// Wołane po zalogowaniu/rejestracji. Tylko spina userId — bez osobnej tabeli przydziałów.
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
        // Czy stan roboczy = stan opublikowany (informacyjnie w panelu).
        const isPublished =
          (e.publishedStatus ?? "pending") === e.status &&
          (e.publishedGroupId ?? null) === (e.assignedGroupId ?? null);
        return {
          ...e,
          assignedGroupName: group?.name ?? null,
          isPublished,
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

// Admin: decyzja o zgłoszeniu (akceptacja z wyborem grupy / odrzucenie).
// NIE wysyła maili — powiadomienia idą dopiero przy publikacji zmian.
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

    if (approve) {
      if (!assignedGroupId) {
        throw new ConvexError("Przy akceptacji wybierz grupę.");
      }
      const group = await ctx.db.get("groups", assignedGroupId);
      if (!group) throw new ConvexError("Nie znaleziono grupy.");

      // Kontrola limitu miejsc grupy — liczymy zatwierdzone zgłoszenia w grupie.
      const inGroup = await ctx.db
        .query("enrollments")
        .withIndex("by_assigned_group", (q) =>
          q.eq("assignedGroupId", assignedGroupId),
        )
        .collect();
      const taken = inGroup.filter(
        (x) => x.status === "approved" && x._id !== id,
      ).length;
      if (taken >= group.capacity) {
        throw new ConvexError("Brak wolnych miejsc w wybranej grupie.");
      }

      await ctx.db.patch("enrollments", id, {
        status: "approved",
        assignedGroupId,
        decisionNote,
      });
    } else {
      await ctx.db.patch("enrollments", id, {
        status: "rejected",
        assignedGroupId: undefined,
        decisionNote,
      });
    }

    return true;
  },
});

// Admin: cofnięcie do "oczekuje" (zdjęcie przydziału grupy).
export const unassign = mutation({
  args: { id: v.id("enrollments") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const e = await ctx.db.get("enrollments", id);
    if (!e) return;
    await ctx.db.patch("enrollments", id, {
      status: "pending",
      assignedGroupId: undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("enrollments") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete("enrollments", id);
  },
});
