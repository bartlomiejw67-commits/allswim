import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Walidator roli użytkownika.
const role = v.union(v.literal("admin"), v.literal("user"));

// Status zgłoszenia naboru.
const enrollmentStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

export default defineSchema({
  // --- Tabele wymagane przez Convex Auth (rozszerzony users) ---
  ...authTables,
  users: defineTable({
    // Pola standardowe Convex Auth:
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Pola własne:
    role: v.optional(role), // brak = zwykły użytkownik; "admin" nadawany ręcznie
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  // --- Baseny / lokalizacje ---
  pools: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    order: v.number(),
  }).index("by_order", ["order"]),

  // --- Poziomy zaawansowania (wybierane przez rodzica w formularzu) ---
  levels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
  }).index("by_order", ["order"]),

  // --- Grupy zajęciowe (roster dobierany przez administratora) ---
  // Grupa NIE ma poziomu (poziom = wybór rodzica, trzymany przy zgłoszeniu) ani
  // stałego basenu — basen wynika z terminów (scheduleEntries) oraz z przydziału
  // konkretnego dziecka (enrollments.assignedPoolId).
  groups: defineTable({
    name: v.string(), // np. "Delfinki"
    instructor: v.optional(v.string()),
    capacity: v.number(), // limit miejsc w grupie (widoczny tylko dla admina)
    order: v.number(),
  }).index("by_order", ["order"]),

  // --- Terminy zajęć (sesja grupy na danym basenie) ---
  // Jedna grupa może mieć terminy na kilku basenach (kilka wpisów z różnym poolId).
  scheduleEntries: defineTable({
    groupId: v.id("groups"),
    poolId: v.id("pools"),
    dayOfWeek: v.number(), // 0 = poniedziałek ... 6 = niedziela
    startTime: v.string(), // "HH:MM"
    endTime: v.string(), // "HH:MM"
  })
    .index("by_group", ["groupId"])
    .index("by_pool", ["poolId"])
    .index("by_day", ["dayOfWeek"]),

  // --- Zgłoszenia naboru (jedno źródło prawdy o przydziale) ---
  enrollments: defineTable({
    // Dane zgłaszającego (formularz można wysłać bez konta).
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    childAge: v.optional(v.string()), // wiek dziecka (z formularza)
    levelId: v.optional(v.id("levels")), // wybrany poziom zaawansowania
    levelLabel: v.optional(v.string()), // zapis nazwy poziomu w chwili zgłoszenia
    isContinuing: v.boolean(), // czy kontynuuje zajęcia (priorytet na liście)
    note: v.optional(v.string()),
    userId: v.optional(v.id("users")), // jeśli wysłane / powiązane po zalogowaniu
    consentAt: v.optional(v.number()), // moment akceptacji zgody RODO (dowód zgody)
    status: enrollmentStatus,
    // Przydział (stan roboczy administratora). Basen wynika z terminów grupy
    // — cała grupa chodzi na jeden basen, brak wyboru basenu per dziecko.
    assignedGroupId: v.optional(v.id("groups")), // grupa (wybierana przy akceptacji)
    decisionNote: v.optional(v.string()), // opcjonalne uzasadnienie decyzji
    // Snapshot ostatnio OPUBLIKOWANEGO stanu — to widzi rodzic i wg tego liczymy
    // różnice do wysyłki maili przy publikacji:
    publishedStatus: v.optional(enrollmentStatus),
    publishedGroupId: v.optional(v.id("groups")),
    publishedTimesHash: v.optional(v.string()), // podpis godzin przy ostatniej publikacji
  })
    .index("by_status", ["status"])
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_assigned_group", ["assignedGroupId"]),

  // --- Lista oczekujących ("Powiadom mnie", gdy nabór zamknięty) ---
  waitlist: defineTable({
    email: v.string(),
    note: v.optional(v.string()),
    notified: v.optional(v.boolean()), // czy admin już powiadomił o otwarciu naboru
  }).index("by_email", ["email"]),

  // --- Cennik (edytowalna tabela) ---
  prices: defineTable({
    name: v.string(),
    amount: v.string(), // np. "320 zł"
    unit: v.optional(v.string()), // np. "/ mies."
    description: v.optional(v.string()),
    popular: v.optional(v.boolean()), // wyróżnienie "Najczęściej wybierany"
    order: v.number(),
  }).index("by_order", ["order"]),

  // --- Zdjęcia (galeria + obozy) ---
  images: defineTable({
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    category: v.union(v.literal("gallery"), v.literal("camps")),
    featured: v.boolean(), // pokazywane na stronie głównej
    order: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_featured", ["featured"])
    .index("by_category_and_order", ["category", "order"]),

  // --- Obozy letnie (informacyjne) ---
  camps: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    period: v.optional(v.string()), // np. "1–12 lipca 2026"
    location: v.optional(v.string()),
    price: v.optional(v.string()),
    contactNote: v.optional(v.string()),
    order: v.number(),
  }).index("by_order", ["order"]),

  // --- Sekcje regulaminu (rozwijane) ---
  regulationSections: defineTable({
    title: v.string(),
    content: v.string(),
    order: v.number(),
  }).index("by_order", ["order"]),

  // --- Ustawienia strony (pojedynczy dokument) ---
  siteSettings: defineTable({
    // Nabór:
    recruitmentOpen: v.boolean(),
    recruitmentOpensAt: v.optional(v.number()),
    recruitmentClosesAt: v.optional(v.number()),
    recruitmentInfo: v.optional(v.string()),
    // Czy grafik (siatka grup i godzin) jest widoczny publicznie i dla rodziców.
    // Ustawiany na true przy pierwszej publikacji zmian.
    scheduleLive: v.optional(v.boolean()),
    // Treści strony głównej — hero:
    heroEyebrow: v.optional(v.string()),
    heroLine1: v.optional(v.string()),
    heroLine2: v.optional(v.string()),
    heroSubtitle: v.optional(v.string()),
    heroStat1Value: v.optional(v.string()),
    heroStat1Label: v.optional(v.string()),
    heroStat2Value: v.optional(v.string()),
    heroStat2Label: v.optional(v.string()),
    heroTagline: v.optional(v.string()),
    // Treści strony głównej — o mnie:
    aboutEyebrow: v.optional(v.string()),
    aboutTitle: v.optional(v.string()),
    aboutRole: v.optional(v.string()),
    aboutText: v.optional(v.string()),
    aboutBadge: v.optional(v.string()),
    // Nagłówki sekcji:
    gridEyebrow: v.optional(v.string()),
    gridTitle: v.optional(v.string()),
    pricesEyebrow: v.optional(v.string()),
    pricesTitle: v.optional(v.string()),
    pricesIntro: v.optional(v.string()),
    siblingDiscounts: v.optional(v.string()), // każda zniżka w osobnej linii
    paymentAccount: v.optional(v.string()), // numer konta
    paymentDeadline: v.optional(v.string()), // np. "do 10. dnia każdego miesiąca"
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
    // Formularz naboru:
    formTitle: v.optional(v.string()),
    formSubtitle: v.optional(v.string()),
    formBenefit1: v.optional(v.string()),
    formBenefit2: v.optional(v.string()),
    formBenefit3: v.optional(v.string()),
    formSuccessTitle: v.optional(v.string()),
    formSuccessText: v.optional(v.string()),
    // Stopka:
    footerAbout: v.optional(v.string()),
    // Kontakt:
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactAddress: v.optional(v.string()),
    // Social:
    instagramUrl: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    // Regulamin do pobrania (PDF w Convex storage):
    regulationsPdfId: v.optional(v.id("_storage")),
    // Zdjęcie do sekcji „O mnie" (w Convex storage):
    aboutImageId: v.optional(v.id("_storage")),
  }),
});
