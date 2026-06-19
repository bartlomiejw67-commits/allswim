import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Dane startowe = treści z makiety (edytowalne później w panelu).
// Idempotentne: jeśli baseny już istnieją, nic nie robi.

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("pools").take(1);
    if (existing.length) {
      return "already-seeded";
    }

    // --- Ustawienia strony ---
    await ctx.db.insert("siteSettings", {
      recruitmentOpen: true,
      recruitmentInfo:
        "Wolne miejsca w grupach początkujących i średnich · zapisy do 15 września",
      heroTagline: "Pierwszy ruch w wodzie zostaje na całe życie",
      aboutTitle: "Cześć, jestem Ola!",
      aboutText:
        "Jestem absolwentką Akademii Wychowania Fizycznego i Sportu w Gdańsku. " +
        "Ze sportem – a zwłaszcza z pływaniem i ratownictwem wodnym – związana jestem od najmłodszych lat. " +
        "Mam wieloletnie doświadczenie w pracy z dziećmi i łączę rzetelną wiedzę z cierpliwym, " +
        "indywidualnym podejściem do każdego małego pływaka.",
      contactEmail: "kontakt@allswim.pl",
      contactPhone: "+48 600 100 200",
      contactAddress: "Tczew · Basen CSiR i Pływalnia miejska",
    });

    // --- Baseny ---
    const poolIds: Record<string, Id<"pools">> = {};
    const poolNames = ["Basen CSiR", "Pływalnia miejska"];
    for (let i = 0; i < poolNames.length; i++) {
      poolIds[poolNames[i]] = await ctx.db.insert("pools", {
        name: poolNames[i],
        order: i,
      });
    }

    // --- Poziomy ---
    const levelIds: Record<string, Id<"levels">> = {};
    const levelDefs = [
      "Oswajanie z wodą",
      "Początkujący",
      "Średnio zaaw.",
      "Zaawansowany",
    ];
    for (let i = 0; i < levelDefs.length; i++) {
      levelIds[levelDefs[i]] = await ctx.db.insert("levels", {
        name: levelDefs[i],
        order: i,
      });
    }

    // --- Harmonogram (z makiety) + grupy tworzone z unikalnych par (etykieta, basen) ---
    // dayOfWeek: 0=Pon, 1=Wt, 2=Śr, 3=Czw, 4=Pt, 5=Sob
    const rows = [
      { day: 0, time: "16:00", group: "Oswajanie z wodą", pool: "Basen CSiR", level: "Oswajanie z wodą" },
      { day: 0, time: "17:00", group: "Średni", pool: "Basen CSiR", level: "Średnio zaaw." },
      { day: 1, time: "16:30", group: "Początkujący", pool: "Pływalnia miejska", level: "Początkujący" },
      { day: 2, time: "17:00", group: "Zaawansowany", pool: "Basen CSiR", level: "Zaawansowany" },
      { day: 3, time: "16:00", group: "Średni", pool: "Pływalnia miejska", level: "Średnio zaaw." },
      { day: 4, time: "17:30", group: "Początkujący", pool: "Basen CSiR", level: "Początkujący" },
      { day: 5, time: "10:00", group: "Zaawansowany", pool: "Pływalnia miejska", level: "Zaawansowany" },
      { day: 5, time: "11:00", group: "Początkujący", pool: "Pływalnia miejska", level: "Początkujący" },
    ];

    const groupIds: Record<string, Id<"groups">> = {};
    let groupOrder = 0;
    for (const r of rows) {
      const key = `${r.group}|${r.pool}`;
      if (!groupIds[key]) {
        groupIds[key] = await ctx.db.insert("groups", {
          name: r.group,
          instructor: "Ola Laskowska",
          capacity: 6,
          order: groupOrder++,
        });
      }
    }
    for (const r of rows) {
      const key = `${r.group}|${r.pool}`;
      await ctx.db.insert("scheduleEntries", {
        groupId: groupIds[key],
        poolId: poolIds[r.pool],
        dayOfWeek: r.day,
        startTime: r.time,
        endTime: addMinutes(r.time, 45),
      });
    }

    // --- Cennik ---
    const prices = [
      { name: "Karnet miesięczny", amount: "320 zł", unit: "/ mies.", popular: false, description: "4 zajęcia w miesiącu (1×/tydz.), jedna grupa i basen." },
      { name: "Karnet 2× w tygodniu", amount: "560 zł", unit: "/ mies.", popular: true, description: "8 zajęć w miesiącu — najszybsze postępy. Wybór dwóch terminów." },
      { name: "Wejście jednorazowe", amount: "45 zł", unit: "/ zajęcia", popular: false, description: "Pojedyncze zajęcia bez zobowiązań — dobre na start lub uzupełnienie." },
    ];
    for (let i = 0; i < prices.length; i++) {
      await ctx.db.insert("prices", { ...prices[i], order: i });
    }

    // --- Regulamin ---
    const reg = [
      { title: "Zapisy i kwalifikacja do grup", content: "Zapisy odbywają się przez formularz online. Poziom dziecka oceniamy na pierwszych zajęciach i na tej podstawie dobieramy grupę." },
      { title: "Płatności i karnety", content: "Opłaty wnosimy z góry za miesiąc. Karnet jest imienny. W razie nieobecności istnieje możliwość odrobienia zajęć w innym terminie." },
      { title: "Nieobecności i odrabianie", content: "Nieobecność prosimy zgłaszać min. 12 godzin wcześniej. Zgłoszone zajęcia można odrobić w ciągu 30 dni w dowolnej grupie o odpowiednim poziomie." },
      { title: "Bezpieczeństwo na basenie", content: "Dzieci pozostają pod opieką instruktora wyłącznie w trakcie zajęć. Obowiązują regulaminy poszczególnych pływalni oraz polecenia ratownika." },
      { title: "Rezygnacja", content: "Rezygnację należy zgłosić do końca miesiąca poprzedzającego. Niewykorzystane wejścia z karnetu nie przechodzą na kolejny miesiąc." },
    ];
    for (let i = 0; i < reg.length; i++) {
      await ctx.db.insert("regulationSections", { ...reg[i], order: i });
    }

    return "seeded";
  },
});
