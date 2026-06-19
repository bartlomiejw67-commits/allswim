import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib";

// Publiczny odczyt ustawień strony (zwraca null, jeśli jeszcze nie ustawione).
export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = (await ctx.db.query("siteSettings").take(1))[0];
    if (!row) return null;
    const regulationsPdfUrl = row.regulationsPdfId
      ? await ctx.storage.getUrl(row.regulationsPdfId)
      : null;
    const aboutImageUrl = row.aboutImageId
      ? await ctx.storage.getUrl(row.aboutImageId)
      : null;
    return { ...row, regulationsPdfUrl, aboutImageUrl };
  },
});

// Admin: ustawienie/usunięcie zdjęcia sekcji „O mnie" (pomiń storageId, by usunąć).
export const setAboutImage = mutation({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { storageId }) => {
    await requireAdmin(ctx);
    const existing = (await ctx.db.query("siteSettings").take(1))[0];
    if (existing) {
      if (existing.aboutImageId && existing.aboutImageId !== storageId) {
        await ctx.storage.delete(existing.aboutImageId);
      }
      await ctx.db.patch("siteSettings", existing._id, { aboutImageId: storageId });
    } else {
      await ctx.db.insert("siteSettings", { recruitmentOpen: false, aboutImageId: storageId });
    }
  },
});

// Admin: pokazanie / ukrycie grafiku (siatki grup i godzin) publicznie i dla rodziców.
export const setScheduleLive = mutation({
  args: { live: v.boolean() },
  handler: async (ctx, { live }) => {
    await requireAdmin(ctx);
    const existing = (await ctx.db.query("siteSettings").take(1))[0];
    if (existing) {
      await ctx.db.patch("siteSettings", existing._id, { scheduleLive: live });
    } else {
      await ctx.db.insert("siteSettings", {
        recruitmentOpen: false,
        scheduleLive: live,
      });
    }
  },
});

// Admin: ustawienie/usunięcie PDF regulaminu (pomiń storageId, by usunąć).
export const setRegulationsPdf = mutation({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { storageId }) => {
    await requireAdmin(ctx);
    const existing = (await ctx.db.query("siteSettings").take(1))[0];
    if (existing) {
      if (existing.regulationsPdfId && existing.regulationsPdfId !== storageId) {
        await ctx.storage.delete(existing.regulationsPdfId);
      }
      await ctx.db.patch("siteSettings", existing._id, { regulationsPdfId: storageId });
    } else {
      await ctx.db.insert("siteSettings", { recruitmentOpen: false, regulationsPdfId: storageId });
    }
  },
});

// Aktualizacja ustawień (tylko admin). Upsert pojedynczego dokumentu.
export const update = mutation({
  args: {
    recruitmentOpen: v.optional(v.boolean()),
    recruitmentOpensAt: v.optional(v.number()),
    recruitmentClosesAt: v.optional(v.number()),
    recruitmentInfo: v.optional(v.string()),
    scheduleLive: v.optional(v.boolean()),
    heroEyebrow: v.optional(v.string()),
    heroLine1: v.optional(v.string()),
    heroLine2: v.optional(v.string()),
    heroSubtitle: v.optional(v.string()),
    heroStat1Value: v.optional(v.string()),
    heroStat1Label: v.optional(v.string()),
    heroStat2Value: v.optional(v.string()),
    heroStat2Label: v.optional(v.string()),
    heroTagline: v.optional(v.string()),
    aboutEyebrow: v.optional(v.string()),
    aboutTitle: v.optional(v.string()),
    aboutRole: v.optional(v.string()),
    aboutText: v.optional(v.string()),
    aboutBadge: v.optional(v.string()),
    gridEyebrow: v.optional(v.string()),
    gridTitle: v.optional(v.string()),
    pricesEyebrow: v.optional(v.string()),
    pricesTitle: v.optional(v.string()),
    pricesIntro: v.optional(v.string()),
    siblingDiscounts: v.optional(v.string()),
    paymentAccount: v.optional(v.string()),
    paymentDeadline: v.optional(v.string()),
    paymentNote: v.optional(v.string()),
    galleryEyebrow: v.optional(v.string()),
    galleryTitle: v.optional(v.string()),
    regulationsEyebrow: v.optional(v.string()),
    regulationsTitle: v.optional(v.string()),
    campsBadge: v.optional(v.string()),
    campsTitle: v.optional(v.string()),
    campsDescription: v.optional(v.string()),
    campsUpcomingHeading: v.optional(v.string()),
    campsEmptyText: v.optional(v.string()),
    campsPhotosHeading: v.optional(v.string()),
    formTitle: v.optional(v.string()),
    formSubtitle: v.optional(v.string()),
    formBenefit1: v.optional(v.string()),
    formBenefit2: v.optional(v.string()),
    formBenefit3: v.optional(v.string()),
    formSuccessTitle: v.optional(v.string()),
    formSuccessText: v.optional(v.string()),
    footerAbout: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactAddress: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = (await ctx.db.query("siteSettings").take(1))[0];
    const wasOpen = existing?.recruitmentOpen ?? false;
    const willOpen = args.recruitmentOpen ?? wasOpen;

    let settingsId;
    if (existing) {
      await ctx.db.patch("siteSettings", existing._id, args);
      settingsId = existing._id;
    } else {
      settingsId = await ctx.db.insert("siteSettings", {
        recruitmentOpen: args.recruitmentOpen ?? false,
        ...args,
      });
    }

    // Nabór właśnie się otworzył (false → true) → powiadom osoby z listy oczekujących.
    if (!wasOpen && willOpen) {
      const waiting = (await ctx.db.query("waitlist").take(500)).filter((w) => !w.notified);
      for (const w of waiting) {
        await ctx.scheduler.runAfter(0, internal.emails.sendWaitlistOpened, { to: w.email });
        await ctx.db.patch("waitlist", w._id, { notified: true });
      }
    }

    return settingsId;
  },
});
