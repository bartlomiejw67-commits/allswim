"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const DAY_NAMES = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

const C = {
  blue: "#6cb4e0",
  navy: "#0f5b8f",
  orange: "#e9a13b",
  lightBlue: "#e8f4fb",
  grey: "#5a6b75",
};

const NAV = [
  { label: "O nas", href: "#onas" },
  { label: "Grafik", href: "#grafik" },
  { label: "Nabór", href: "#nabor" },
  { label: "Cennik", href: "#cennik" },
  { label: "Galeria", href: "#galeria" },
  { label: "Obozy", href: "#obozy" },
  { label: "Regulamin", href: "#regulamin" },
  { label: "Kontakt", href: "#kontakt" },
];

const PRICES = [
  { name: "Karnet miesięczny", price: "320 zł", unit: "/ mies.", popular: false, border: "#eaf2f8", desc: "4 zajęcia w miesiącu (1×/tydz.), jedna grupa i basen." },
  { name: "Karnet 2× w tygodniu", price: "560 zł", unit: "/ mies.", popular: true, border: "#6cb4e0", desc: "8 zajęć w miesiącu — najszybsze postępy. Wybór dwóch terminów." },
  { name: "Wejście jednorazowe", price: "45 zł", unit: "/ zajęcia", popular: false, border: "#eaf2f8", desc: "Pojedyncze zajęcia bez zobowiązań — dobre na start lub uzupełnienie." },
];

const GALLERY = [
  "NA BASENIE 01", "GRUPA SKRZATY", "NAUKA KRAULA", "ZABAWA W WODZIE", "START Z SŁUPKA",
  "UŚMIECH", "OBÓZ LATO", "DYPLOMY", "RODZICE I DZIECI",
];

const REGULAMIN = [
  { title: "Zapisy i kwalifikacja do grup", body: "Zapisy odbywają się przez formularz online. Poziom dziecka oceniamy na pierwszych zajęciach i na tej podstawie dobieramy grupę." },
  { title: "Płatności i karnety", body: "Opłaty wnosimy z góry za miesiąc. Karnet jest imienny. W razie nieobecności istnieje możliwość odrobienia zajęć w innym terminie." },
  { title: "Nieobecności i odrabianie", body: "Nieobecność prosimy zgłaszać min. 12 godzin wcześniej. Zgłoszone zajęcia można odrobić w ciągu 30 dni w dowolnej grupie o odpowiednim poziomie." },
  { title: "Bezpieczeństwo na basenie", body: "Dzieci pozostają pod opieką instruktora wyłącznie w trakcie zajęć. Obowiązują regulaminy poszczególnych pływalni oraz polecenia ratownika." },
  { title: "Rezygnacja", body: "Rezygnację należy zgłosić do końca miesiąca poprzedzającego. Niewykorzystane wejścia z karnetu nie przechodzą na kolejny miesiąc." },
];

const CONT = [
  { k: "tak", label: "Tak, kontynuuje" },
  { k: "nie", label: "Nie, pierwszy raz" },
];

// Deterministyczne bąbelki (jak w designie, intensywność "średnie").
const BUBBLES = (() => {
  const cols = ["rgba(168,212,239,0.55)", "rgba(255,255,255,0.45)", "rgba(255,210,122,0.4)"];
  const n = 11;
  return Array.from({ length: n }, (_, i) => {
    const r = (k: number) => (Math.sin((i + 1) * k) + 1) / 2;
    const size = 8 + Math.round(r(2.3) * 22);
    return {
      left: (3 + r(1.7) * 92).toFixed(1) + "%",
      size: size + "px",
      color: cols[i % cols.length],
      dur: (6 + r(3.1) * 7).toFixed(1) + "s",
      delay: (r(4.4) * 8).toFixed(1) + "s",
    };
  });
})();

const eyebrow: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: C.orange,
};
const h2style: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "clamp(28px,4vw,40px)",
  margin: "8px 0 0",
  color: C.navy,
};

function go(id: string) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [poolFilter, setPoolFilter] = useState<string>("all");
  const [lightbox, setLightbox] = useState<{ items: { url: string | null; label: string }[]; index: number } | null>(null);
  const [openReg, setOpenReg] = useState(0);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [showAllCamps, setShowAllCamps] = useState(false);
  const [fLevel, setFLevel] = useState<string>("");
  const [fCont, setFCont] = useState("nie");
  const [fName, setFName] = useState("");
  const [fAge, setFAge] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fNote, setFNote] = useState("");
  const [fConsent, setFConsent] = useState(false);
  const [fHp, setFHp] = useState(""); // honeypot — ukryte pole na boty
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Lista oczekujących ("Powiadom mnie" przy zamkniętym naborze)
  const [waitEmail, setWaitEmail] = useState("");
  const [waitSent, setWaitSent] = useState(false);
  const [waitBusy, setWaitBusy] = useState(false);

  // --- Dane z Convex (fallback na treści z makiety) ---
  const settings = useQuery(api.settings.get);
  const me = useQuery(api.users.me); // undefined=ładowanie, null=niezalogowany, obiekt=zalogowany
  const { signOut } = useAuthActions();
  const account = me
    ? me.role === "admin"
      ? { label: "Panel admina", href: "/admin" }
      : { label: "Moje konto", href: "/konto" }
    : { label: "Zaloguj", href: "/login" };
  const poolsData = useQuery(api.pools.list);
  const levelsData = useQuery(api.levels.list);
  const scheduleData = useQuery(api.schedule.list, {});
  const pricesData = useQuery(api.prices.list);
  const regData = useQuery(api.regulations.list);
  const galleryImages = useQuery(api.images.list, { category: "gallery" });
  const campImages = useQuery(api.images.list, { category: "camps" });
  const aboutImages = useQuery(api.images.list, { category: "about" });
  const instructorsData = useQuery(api.instructors.list);
  const campsData = useQuery(api.camps.list);
  const submitEnroll = useMutation(api.enrollments.submit);
  const joinWaitlist = useMutation(api.waitlist.join);

  const naborActive = settings?.recruitmentOpen ?? true;
  const naborInfo = settings?.recruitmentInfo || "Wolne miejsca w grupach początkujących i średnich · zapisy do 15 września";
  const contactEmail = settings?.contactEmail || "kontakt@allswim.pl";
  const contactPhone = settings?.contactPhone || "+48 600 100 200";
  const contactAddress = settings?.contactAddress || "Tczew · Basen CSiR i Pływalnia miejska";
  const instagramUrl = settings?.instagramUrl || "#";
  const facebookUrl = settings?.facebookUrl || "#";
  const regulationsPdfUrl = settings?.regulationsPdfUrl ?? null;
  const campsOfferPdfUrl = settings?.campsOfferPdfUrl ?? null;

  const heroEyebrow = settings?.heroEyebrow || "Szkółka pływacka · Tczew";
  const heroLine1 = settings?.heroLine1 || "Pierwszy ruch w wodzie";
  const heroLine2 = settings?.heroLine2 || "zostaje na całe życie";
  const heroSubtitle = settings?.heroSubtitle || "Cierpliwa, bezpieczna nauka pływania dla dzieci. Oswajamy się z wodą, przełamujemy lęki i uczymy się pływać — z uśmiechem.";
  const heroStat1Value = settings?.heroStat1Value || "do 6";
  const heroStat1Label = settings?.heroStat1Label || "dzieci w grupie";
  const heroStat2Value = settings?.heroStat2Value || "2 baseny";
  const heroStat2Label = settings?.heroStat2Label || "w Tczewie";

  const aboutEyebrow = settings?.aboutEyebrow || "Poznaj instruktorkę";
  const aboutTitle = settings?.aboutTitle || "Cześć, jestem Ola!";
  const aboutRole = settings?.aboutRole || "Trener i instruktor pływania • Ratownik wodny";
  const aboutBadge = settings?.aboutBadge || "🏅 Ratownik wodny";
  const aboutImageUrl = settings?.aboutImageUrl ?? null;

  const gridEyebrow = settings?.gridEyebrow || "Grafik zajęć";
  const gridTitle = settings?.gridTitle || "Sprawdź terminy na basenach";
  const pricesEyebrow = settings?.pricesEyebrow || "Cennik";
  const pricesTitle = settings?.pricesTitle || "Przejrzyste ceny, bez ukrytych kosztów";
  const pricesIntro = settings?.pricesIntro || "";
  const siblingDiscounts = (settings?.siblingDiscounts || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const paymentAccount = settings?.paymentAccount || "";
  const paymentDeadline = settings?.paymentDeadline || "";
  const paymentNote = settings?.paymentNote || "";
  const galleryEyebrow = settings?.galleryEyebrow || "Galeria";
  const galleryTitle = settings?.galleryTitle || "Tak wyglądają nasze zajęcia";
  const regulationsEyebrow = settings?.regulationsEyebrow || "Regulamin";
  const regulationsTitle = settings?.regulationsTitle || "Zasady uczestnictwa";
  const campsBadge = settings?.campsBadge || "☀️ Lato 2026";
  const campsTitle = settings?.campsTitle || "Obozy letnie z pływaniem";
  const campsDescription = settings?.campsDescription || "Tydzień pełen wody, zabawy i nauki pływania. Codzienne zajęcia na basenie, gry zespołowe i bezpieczna, ciepła atmosfera.";
  const campsUpcomingHeading = settings?.campsUpcomingHeading || "Najbliższe turnusy";
  const campsEmptyText = settings?.campsEmptyText || "Aktualnie nie mamy ogłoszonych turnusów. Planujemy obozy latem — zostaw kontakt, a damy znać, gdy ruszą zapisy. 🌊";
  const campsPhotosHeading = settings?.campsPhotosHeading || "Z naszych obozów";
  const formTitle = settings?.formTitle || "Zapisz dziecko na zajęcia";
  const formSubtitle = settings?.formSubtitle || "Wypełnij krótki formularz — odezwiemy się z propozycją grupy i terminu w ciągu 2 dni roboczych.";
  const formBenefits = [
    settings?.formBenefit1 || "Pierwsze zajęcia z oceną poziomu",
    settings?.formBenefit2 || "Małe grupy do 6 osób",
    settings?.formBenefit3 || "Elastyczne terminy na 2 basenach w Tczewie",
  ].filter((b) => b && b.trim());
  const formSuccessTitle = settings?.formSuccessTitle || "Dziękujemy za zgłoszenie!";
  const formSuccessText = settings?.formSuccessText || "Odezwiemy się na podany e-mail w ciągu 2 dni roboczych z propozycją grupy i terminu.";
  const footerAbout = settings?.footerAbout || "Szkółka pływacka prowadzona przez Aleksandrę Laskowską. Nauka pływania dla dzieci z uśmiechem i bezpieczeństwem.";
  const aboutParagraphs = settings?.aboutText
    ? settings.aboutText.split(/\n\n+|\n/).filter((p) => p.trim())
    : [
        "Jestem absolwentką Akademii Wychowania Fizycznego i Sportu w Gdańsku. Ze sportem – a zwłaszcza z pływaniem i ratownictwem wodnym – związana jestem od najmłodszych lat.",
        "Mam wieloletnie doświadczenie w pracy z dziećmi. Łączę rzetelną wiedzę z cierpliwym, indywidualnym podejściem do każdego małego pływaka. Wiem, jak ważne są pierwsze chwile w wodzie, dlatego stawiam na bezpieczeństwo, spokój i dobrą zabawę.",
        "Moim celem jest pomóc dzieciom przełamać barierę przed wodą, oswoić się z nią oraz rozwinąć sprawność ruchową i zdolności motoryczne – w atmosferze radości i wzajemnego zaufania.",
      ];

  const poolsView = poolsData && poolsData.length ? poolsData.map((p) => p.name) : [];

  // Grafik pochodzi wyłącznie z panelu (widoczny dopiero po publikacji). Brak danych = grafik jeszcze nieopublikowany.
  const scheduleAll = (scheduleData ?? []).map((r) => ({
    day: DAY_NAMES[r.dayOfWeek] || "",
    dayIdx: r.dayOfWeek,
    time: r.startTime,
    endTime: r.endTime || "",
    group: r.groupName || "",
    pool: r.poolName || "",
    instructor: r.instructor || "",
  }));
  scheduleAll.sort((a, b) => a.dayIdx - b.dayIdx || a.time.localeCompare(b.time));
  const hasSchedule = scheduleAll.length > 0;

  const pricesView =
    pricesData && pricesData.length
      ? pricesData.map((p) => ({
          name: p.name,
          price: p.amount,
          unit: p.unit || "",
          desc: p.description || "",
          popular: !!p.popular,
          border: p.popular ? "#6cb4e0" : "#eaf2f8",
        }))
      : PRICES;

  const regView = regData && regData.length ? regData.map((r) => ({ title: r.title, body: r.content })) : REGULAMIN;

  const levelChoices = levelsData ?? [];

  // Domyślny poziom w formularzu po załadowaniu listy.
  useEffect(() => {
    if (!fLevel && levelChoices.length) setFLevel(levelChoices[0]._id);
  }, [fLevel, levelChoices]);

  async function handleSubmit() {
    setFormError(null);
    if (!fName.trim() || !fEmail.trim() || !fPhone.trim()) {
      setFormError("Podaj imię dziecka, e-mail i numer telefonu.");
      return;
    }
    if (!fConsent) {
      setFormError("Zaznacz zgodę na przetwarzanie danych, aby wysłać zgłoszenie.");
      return;
    }
    setSubmitting(true);
    try {
      await submitEnroll({
        name: fName.trim(),
        email: fEmail.trim(),
        childAge: fAge.trim() || undefined,
        phone: fPhone.trim(),
        levelId: fLevel ? (fLevel as Id<"levels">) : undefined,
        isContinuing: fCont === "tak",
        note: fNote.trim() || undefined,
        consent: fConsent,
        hp: fHp,
      });
      setSent(true);
    } catch (e) {
      const msg = e as { data?: string; message?: string };
      setFormError(msg.data || msg.message || "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWaitlist() {
    if (!waitEmail.trim()) return;
    setWaitBusy(true);
    try {
      await joinWaitlist({ email: waitEmail.trim() });
      setWaitSent(true);
      setWaitEmail("");
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się zapisać.");
    } finally {
      setWaitBusy(false);
    }
  }

  const scheduleRows = poolFilter === "all" ? scheduleAll : scheduleAll.filter((r) => r.pool === poolFilter);
  // Kolory rozróżniające baseny w grafiku.
  const POOL_PALETTE = ["#6cb4e0", "#e9a13b", "#5cb98a", "#a07cd6", "#e0697f", "#3fa0a8"];
  const poolColor = (name: string) => {
    const idx = poolsView.indexOf(name);
    return POOL_PALETTE[(idx < 0 ? 0 : idx) % POOL_PALETTE.length];
  };

  // Dodatkowe zdjęcia do sekcji „o nas" (mały, nachodzący na siebie kolaż).
  const aboutPhotoItems: { url: string; label: string }[] =
    (aboutImages ?? [])
      .filter((g): g is typeof g & { url: string } => !!g.url)
      .map((g) => ({ url: g.url, label: g.caption || "" }));

  // Zdjęcia galerii zajęć (fallback: placeholdery z etykietami).
  const galleryItems: { url: string | null; label: string }[] =
    galleryImages && galleryImages.length
      ? galleryImages.map((g) => ({ url: g.url, label: g.caption || "" }))
      : GALLERY.map((label) => ({ url: null, label }));
  const visibleGallery = showAllGallery ? galleryItems : galleryItems.slice(0, 6);

  // Zdjęcia z obozów (osobna sekcja).
  const campPhotoItems: { url: string | null; label: string }[] =
    campImages && campImages.length
      ? campImages.map((g) => ({ url: g.url, label: g.caption || "" }))
      : [];
  // Dwa zdjęcia flagowe obozów (uzupełnione placeholderami, jeśli brak).
  const flagship: { url: string | null; label: string }[] = [...campPhotoItems.slice(0, 4)];
  while (flagship.length < 4) flagship.push({ url: null, label: `ZDJĘCIE ${flagship.length + 1}` });
  // Kafelki obozów: gdy są zdjęcia — 4 podglądowe lub wszystkie (po rozwinięciu); gdy brak — placeholdery.
  const campVisible = campPhotoItems.length
    ? showAllCamps
      ? campPhotoItems
      : campPhotoItems.slice(0, 4)
    : flagship;

  const camps = campsData ?? [];

  return (
    <div style={{ fontFamily: "var(--font-nunito), sans-serif", color: "#1b3a4b", background: "#f4fafe", overflowX: "hidden" }}>
      {/* ============ NAV ============ */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e3eef5" }}>
        <nav style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ALL SWIM" style={{ height: 46, width: "auto", display: "block" }} />
          </a>
          <div className="as-nav-links" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={(e) => { e.preventDefault(); go(n.href.slice(1)); }} className="as-nav-link" style={{ textDecoration: "none", color: "#1b3a4b", fontWeight: 700, fontSize: 15, padding: "8px 12px", borderRadius: 999 }}>
                {n.label}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href={account.href} className="font-fredoka as-login-desktop as-nav-link" style={{ fontWeight: 700, fontSize: 15, color: "#1b3a4b", borderRadius: 999, padding: "9px 16px", textDecoration: "none" }}>
              {account.label}
            </a>
            {me && (
              <button onClick={() => signOut()} className="font-fredoka as-login-desktop as-nav-link" style={{ fontWeight: 700, fontSize: 15, color: "#b4232a", background: "#fdeaea", border: "none", borderRadius: 999, padding: "9px 16px", cursor: "pointer" }}>
                Wyloguj
              </button>
            )}
            <button onClick={() => go("nabor")} className="font-fredoka as-btn-primary" style={{ fontWeight: 600, fontSize: 15, color: "#fff", background: C.orange, border: "none", borderRadius: 999, padding: "11px 22px", cursor: "pointer", boxShadow: "0 8px 18px rgba(233,161,59,0.32)" }}>
              Zapisz się
            </button>
            <button className="as-burger" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu" style={{ display: "none", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 14, border: "2px solid #d6e7f2", background: "#fff", cursor: "pointer", color: C.navy, fontSize: 20 }}>
              ☰
            </button>
          </div>
        </nav>
        {mobileOpen && (
          <div style={{ borderTop: "1px solid #e3eef5", background: "#fff", padding: "10px 22px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV.map((n) => (
                <a key={n.href} href={n.href} onClick={(e) => { e.preventDefault(); setMobileOpen(false); go(n.href.slice(1)); }} style={{ textDecoration: "none", color: "#1b3a4b", fontWeight: 700, fontSize: 16, padding: "11px 12px", borderRadius: 12 }}>
                  {n.label}
                </a>
              ))}
              <a href={account.href} style={{ textDecoration: "none", color: "#0f5b8f", fontWeight: 800, fontSize: 16, padding: "11px 12px", borderRadius: 12, borderTop: "1px solid #eef3f6", marginTop: 4 }}>
                {account.label}
              </a>
              {me && (
                <button onClick={async () => { setMobileOpen(false); await signOut(); }} style={{ textAlign: "left", textDecoration: "none", color: "#b4232a", fontWeight: 800, fontSize: 16, padding: "11px 12px", borderRadius: 12, background: "none", border: "none", cursor: "pointer" }}>
                  Wyloguj
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <div id="top" />

      {/* ============ HERO ============ */}
      <section style={{ position: "relative", background: "linear-gradient(180deg,#a5d4f0 0%,#67b3e1 30%,#3a89c4 62%,#1d68a1 100%)", color: "#fff", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {BUBBLES.map((b, i) => (
            <div key={i} style={{ position: "absolute", left: b.left, bottom: 0, width: b.size, height: b.size, borderRadius: "50%", background: b.color, animation: `asrise ${b.dur} ease-in infinite`, animationDelay: b.delay }} />
          ))}
        </div>

        <div className="as-hero-grid" style={{ position: "relative", zIndex: 2, maxWidth: 1120, margin: "0 auto", padding: "84px 22px 150px", display: "grid" }}>
          <div className="as-hero-top">
            <div className="font-fredoka" style={{ display: "inline-flex", alignItems: "center", gap: 12, fontWeight: 700, fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase", color: "#ffd27a", textShadow: "0 1px 6px rgba(8,50,80,0.35)" }}>
              <span style={{ width: 34, height: 2, background: "#ffd27a", borderRadius: 2, display: "inline-block" }} />
              {heroEyebrow}
            </div>
            <h1 className="font-fredoka" style={{ fontWeight: 700, fontSize: "clamp(38px,5.5vw,62px)", lineHeight: 1.05, margin: "18px 0 0", maxWidth: 820, textShadow: "0 2px 14px rgba(8,50,80,0.35)" }}>
              {heroLine1}<br /><span style={{ color: "#ffd27a" }}>{heroLine2}</span>
            </h1>
          </div>
          <div className="as-hero-bottom">
            <p style={{ fontSize: "clamp(17px,2.2vw,21px)", lineHeight: 1.55, color: "#f2faff", maxWidth: 580, margin: "20px 0 0", textShadow: "0 1px 6px rgba(8,50,80,0.4)" }}>
              {heroSubtitle}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
              <button onClick={() => go("nabor")} className="font-fredoka as-btn-primary-lg" style={{ fontWeight: 600, fontSize: 17, color: "#fff", background: C.orange, border: "none", borderRadius: 999, padding: "15px 30px", cursor: "pointer", boxShadow: "0 10px 24px rgba(233,161,59,0.4)" }}>
                Zapisz dziecko
              </button>
              <button onClick={() => go("grafik")} className="font-fredoka as-btn-ghost" style={{ fontWeight: 600, fontSize: 17, color: "#fff", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.55)", borderRadius: 999, padding: "13px 28px", cursor: "pointer" }}>
                Zobacz grafik
              </button>
            </div>
            <div style={{ display: "flex", gap: 38, marginTop: 38, flexWrap: "wrap" }}>
              <div>
                <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 30, color: "#ffd27a" }}>{heroStat1Value}</div>
                <div style={{ fontSize: 14, color: "#f2faff" }}>{heroStat1Label}</div>
              </div>
              <div>
                <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 30, color: "#ffd27a" }}>{heroStat2Value}</div>
                <div style={{ fontSize: 14, color: "#f2faff" }}>{heroStat2Label}</div>
              </div>
            </div>
          </div>

          {/* floating logo bubble */}
          <div className="as-hero-bubble" style={{ position: "relative", width: "min(420px,90vw)", aspectRatio: "1", margin: "0 auto" }}>
            <div style={{ position: "absolute", inset: "-6%", borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, rgba(255,210,122,0.45), rgba(108,180,224,0.25) 55%, transparent 72%)", filter: "blur(8px)", animation: "asglow 6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", top: "6%", left: "2%", width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), rgba(168,212,239,0.5) 60%, rgba(108,180,224,0.25))", boxShadow: "inset -4px -6px 10px rgba(13,82,134,0.25)", animation: "asorbit 7s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "8%", right: "0%", width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), rgba(168,212,239,0.5) 60%, rgba(108,180,224,0.25))", boxShadow: "inset -3px -5px 8px rgba(13,82,134,0.25)", animation: "asorbit 5.5s ease-in-out infinite 0.6s" }} />
            <div style={{ position: "absolute", top: "14%", right: "8%", width: 20, height: 20, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(255,210,122,0.5) 70%)", animation: "asorbit 6.2s ease-in-out infinite 1.1s" }} />
            <div style={{ position: "absolute", inset: "8%", borderRadius: "50%", animation: "asfloat 7s ease-in-out infinite" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #ffffff 0%, #ffffff 58%, #eaf5fc 80%, #cfe8f7 100%)", boxShadow: "0 30px 60px rgba(8,50,80,0.35), inset -16px -20px 42px rgba(108,180,224,0.28), inset 14px 16px 40px rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="ALL SWIM" style={{ width: "62%", height: "auto", display: "block", filter: "drop-shadow(0 6px 14px rgba(8,50,80,0.35))" }} />
              </div>
              <div style={{ position: "absolute", top: "12%", left: "18%", width: "30%", height: "22%", borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95), transparent 70%)", filter: "blur(2px)", animation: "asshine 5s ease-in-out infinite" }} />
              <div style={{ position: "absolute", bottom: "16%", right: "20%", width: "12%", height: "10%", borderRadius: "50%", background: "rgba(255,255,255,0.6)", filter: "blur(1px)" }} />
            </div>
          </div>
        </div>

        {/* wave divider */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -1, lineHeight: 0 }}>
          <div style={{ position: "relative", width: "200%", height: 90, animation: "aswave 14s linear infinite", opacity: 0.5 }}>
            <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ width: "50%", height: "100%", float: "left" }}><path d="M0,45 C240,90 480,5 720,40 C960,75 1200,10 1440,45 L1440,90 L0,90 Z" fill="#6cb4e0" /></svg>
            <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ width: "50%", height: "100%", float: "left" }}><path d="M0,45 C240,90 480,5 720,40 C960,75 1200,10 1440,45 L1440,90 L0,90 Z" fill="#6cb4e0" /></svg>
          </div>
          <div style={{ position: "absolute", left: 0, bottom: 0, width: "200%", height: 60, animation: "aswave 9s linear infinite" }}>
            <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: "50%", height: "100%", float: "left" }}><path d="M0,30 C360,60 720,5 1080,30 C1260,42 1380,16 1440,30 L1440,60 L0,60 Z" fill="#f4fafe" /></svg>
            <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: "50%", height: "100%", float: "left" }}><path d="M0,30 C360,60 720,5 1080,30 C1260,42 1380,16 1440,30 L1440,60 L0,60 Z" fill="#f4fafe" /></svg>
          </div>
        </div>
      </section>

      {/* ============ NABÓR BANNER ============ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 22px" }}>
        <div className="as-reveal" style={{ marginTop: -18 }}>
          {naborActive ? (
            <div style={{ position: "relative", zIndex: 3, background: "linear-gradient(100deg,#e9a13b,#f2bd6a)", borderRadius: 24, padding: "22px 26px", boxShadow: "0 18px 40px rgba(233,161,59,0.3)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,0.3)", fontSize: 26 }}>📣</span>
                <div>
                  <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 24, color: "#fff" }}>Trwa nabór!</div>
                  <div style={{ fontSize: 15, color: "#5a3a06", fontWeight: 700 }}>{naborInfo}</div>
                </div>
              </div>
              <button onClick={() => go("nabor")} className="font-fredoka as-btn-white" style={{ fontWeight: 600, fontSize: 16, color: C.navy, background: "#fff", border: "none", borderRadius: 999, padding: "13px 26px", cursor: "pointer", boxShadow: "0 8px 18px rgba(0,0,0,0.12)" }}>
                Wypełnij zgłoszenie
              </button>
            </div>
          ) : (
            <div style={{ position: "relative", zIndex: 3, background: "#fff", border: "2px dashed #c3d4df", borderRadius: 24, padding: "22px 26px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 16, background: "#eef3f6", fontSize: 26 }}>⏳</span>
                <div>
                  <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 24, color: C.grey }}>Nabór jest obecnie zamknięty</div>
                  <div style={{ fontSize: 15, color: C.grey }}>Zapisz się na listę powiadomień — damy znać, gdy ruszą kolejne zapisy.</div>
                </div>
              </div>
              {waitSent ? (
                <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 15, color: "#1f8a5b", background: "#e8f7ee", borderRadius: 999, padding: "11px 20px" }}>✓ Dzięki! Damy znać mailowo.</div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="email"
                    value={waitEmail}
                    onChange={(e) => setWaitEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleWaitlist(); }}
                    placeholder="Twój e-mail"
                    className="as-input"
                    style={{ fontSize: 15, padding: "11px 16px", borderRadius: 999, border: "2px solid #e3eef5", background: "#f8fcff", color: "#1b3a4b", minWidth: 200 }}
                  />
                  <button onClick={handleWaitlist} disabled={waitBusy} className="font-fredoka as-btn-secondary" style={{ fontWeight: 600, fontSize: 16, color: C.navy, background: "#fff", border: "2px solid #6cb4e0", borderRadius: 999, padding: "11px 24px", cursor: waitBusy ? "default" : "pointer" }}>
                    {waitBusy ? "Zapisywanie…" : "Powiadom mnie"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ============ O MNIE ============ */}
      <section id="onas" style={{ maxWidth: 1120, margin: "0 auto", padding: "78px 22px 20px" }}>
        <div className="as-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 48, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", width: "min(380px,92%)", aspectRatio: "4/5" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 28, overflow: "hidden", background: aboutImageUrl ? "#eaf4fb" : "repeating-linear-gradient(135deg,#dbecf8,#dbecf8 16px,#eaf4fb 16px,#eaf4fb 32px)", border: "1px solid #d6e7f2", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 44px rgba(15,91,143,0.12)" }}>
                {aboutImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={aboutImageUrl} alt="Ola Laskowska" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 52, opacity: 0.55 }} aria-hidden>🏊‍♀️</span>
                )}
              </div>
              <div className="font-fredoka" style={{ position: "absolute", bottom: -16, right: -16, background: C.orange, color: "#fff", borderRadius: 18, padding: "11px 18px", boxShadow: "0 14px 30px rgba(233,161,59,0.35)", fontWeight: 600, fontSize: 15 }}>{aboutBadge}</div>
            </div>

            {/* Dodatkowe zdjęcia — mały, nachodzący na siebie kolaż */}
            {aboutPhotoItems.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 30, paddingLeft: 16 }}>
                {aboutPhotoItems.slice(0, 3).map((p, i) => {
                  const rot = [-7, 4, -3][i] ?? 0;
                  return (
                    <button
                      key={i}
                      onClick={() => setLightbox({ items: aboutPhotoItems, index: i })}
                      style={{ marginLeft: i === 0 ? 0 : -16, transform: `rotate(${rot}deg)`, transition: "transform .2s", border: "4px solid #fff", padding: 0, cursor: "pointer", borderRadius: 16, overflow: "hidden", width: "clamp(78px,22vw,108px)", aspectRatio: "1", boxShadow: "0 10px 22px rgba(15,91,143,0.22)", background: "#eaf4fb", zIndex: i }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = `rotate(${rot}deg) scale(1.06)`; e.currentTarget.style.zIndex = "10"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = `rotate(${rot}deg)`; e.currentTarget.style.zIndex = String(i); }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.label || "ALL SWIM"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <div className="font-fredoka" style={eyebrow}>{aboutEyebrow}</div>
            <h2 className="font-fredoka" style={{ ...h2style, fontSize: "clamp(30px,4.5vw,44px)" }}>{aboutTitle}</h2>
            <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 17, color: "#1b3a4b", marginTop: 8 }}>{aboutRole}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20, fontSize: 16, lineHeight: 1.65, color: C.grey }}>
              {aboutParagraphs.map((p, i) => (
                <p key={i} style={{ margin: 0 }}>{p}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Dodatkowi instruktorzy (Ola wyżej; kolejni pod spodem) */}
        {instructorsData && instructorsData.map((ins) => (
          <div key={ins._id} className="as-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 48, alignItems: "center", marginTop: 60 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: "min(320px,88%)", aspectRatio: "4/5" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 24, overflow: "hidden", background: ins.photoUrl ? "#eaf4fb" : "repeating-linear-gradient(135deg,#dbecf8,#dbecf8 16px,#eaf4fb 16px,#eaf4fb 32px)", border: "1px solid #d6e7f2", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 36px rgba(15,91,143,0.1)" }}>
                  {ins.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ins.photoUrl} alt={ins.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 46, opacity: 0.5 }} aria-hidden>🧑‍🏫</span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-fredoka" style={{ fontWeight: 700, fontSize: "clamp(24px,3.6vw,34px)", color: C.navy, margin: 0 }}>{ins.name}</h3>
              {ins.role && <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 17, color: "#1b3a4b", marginTop: 8 }}>{ins.role}</div>}
              {ins.bio && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18, fontSize: 16, lineHeight: 1.65, color: C.grey }}>
                  {ins.bio.split(/\n\n+|\n/).filter((p) => p.trim()).map((p, i) => (
                    <p key={i} style={{ margin: 0 }}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ============ GRAFIK ============ */}
      <section id="grafik" style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 22px 20px" }}>
        <div className="as-reveal" style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26 }}>
          <div>
            <div className="font-fredoka" style={eyebrow}>{gridEyebrow}</div>
            <h2 className="font-fredoka" style={h2style}>{gridTitle}</h2>
          </div>
          {hasSchedule && poolsView.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.grey, marginRight: 4 }}>Basen:</span>
              {[{ key: "all", label: "Wszystkie" }, ...poolsView.map((p) => ({ key: p, label: p }))].map((p) => {
                const active = poolFilter === p.key;
                return (
                  <button key={p.key} onClick={() => setPoolFilter(p.key)} className="as-pill" style={{ fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "9px 18px", border: `2px solid ${active ? C.orange : "#d6e7f2"}`, background: active ? C.orange : "#fff", color: active ? "#fff" : C.navy }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {hasSchedule ? (
          <div className="as-reveal" style={{ background: "#fff", borderRadius: 24, boxShadow: "0 10px 28px rgba(15,91,143,0.08)", border: "1px solid #eaf2f8", padding: 16 }}>
            <div className="as-week-grid" style={{ display: "grid", gap: 10 }}>
              {DAY_NAMES.map((d, i) => {
                const day = scheduleRows.filter((r) => r.dayIdx === i).sort((a, b) => a.time.localeCompare(b.time));
                return (
                  <div key={i} style={{ background: "#f8fcff", borderRadius: 14, border: "1px solid #eaf2f8", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 104 }}>
                    <div className="font-fredoka" style={{ background: C.navy, color: "#fff", fontWeight: 600, fontSize: 13, padding: "9px 10px", textAlign: "center" }}>{d}</div>
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                      {day.length === 0 ? (
                        <div style={{ color: "#b6c6d2", fontSize: 13, textAlign: "center", margin: "auto", padding: "10px 4px" }}>—</div>
                      ) : (
                        day.map((r, j) => {
                          const col = poolColor(r.pool);
                          return (
                            <div key={j} style={{ background: "#fff", borderRadius: 10, border: "1px solid #eaf2f8", borderLeft: `4px solid ${col}`, padding: "8px 10px" }}>
                              <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 13, color: C.navy }}>{r.time}{r.endTime ? `–${r.endTime}` : ""}</div>
                              <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 13, color: "#1b3a4b", marginTop: 2 }}>{r.group}</div>
                              {r.pool && (
                                <div style={{ fontSize: 11, color: C.grey, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: 3, background: col, display: "inline-block", flex: "none" }} />{r.pool}
                                </div>
                              )}
                              {r.instructor && <div style={{ fontSize: 11, color: C.grey, marginTop: 2 }}>👤 {r.instructor}</div>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="as-reveal" style={{ background: "#fff", borderRadius: 24, boxShadow: "0 10px 28px rgba(15,91,143,0.08)", border: "1px dashed #c3d4df", padding: "40px 24px", textAlign: "center", color: C.grey }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗓️</div>
            <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 18, color: C.navy }}>Grafik pojawi się wkrótce</div>
            <p style={{ fontSize: 15, margin: "8px auto 0", maxWidth: 420 }}>Przygotowujemy terminy zajęć na nowy sezon. Zajrzyj tu ponownie lub zapisz dziecko przez formularz naboru.</p>
          </div>
        )}
      </section>

      {/* ============ CENNIK ============ */}
      <section id="cennik" style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 22px 20px" }}>
        <div className="as-reveal" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 40px" }}>
          <div className="font-fredoka" style={eyebrow}>{pricesEyebrow}</div>
          <h2 className="font-fredoka" style={h2style}>{pricesTitle}</h2>
          {pricesIntro && <p style={{ fontSize: 16, lineHeight: 1.55, color: C.grey, margin: "14px 0 0" }}>{pricesIntro}</p>}
        </div>
        <div className="as-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 22 }}>
          {pricesView.map((pr) => (
            <div key={pr.name} className="as-price-card" style={{ background: "#fff", borderRadius: 24, padding: "30px 28px", boxShadow: "0 10px 28px rgba(15,91,143,0.08)", border: `2px solid ${pr.border}`, position: "relative" }}>
              {pr.popular && (
                <span className="font-fredoka" style={{ position: "absolute", top: -13, left: 28, fontWeight: 700, fontSize: 12, color: "#fff", background: C.orange, borderRadius: 999, padding: "5px 14px" }}>Najczęściej wybierany</span>
              )}
              <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 20, color: "#1b3a4b" }}>{pr.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "12px 0 4px" }}>
                <span className="font-fredoka" style={{ fontWeight: 700, fontSize: 40, color: C.navy }}>{pr.price}</span>
                <span style={{ fontSize: 15, color: C.grey, fontWeight: 700 }}>{pr.unit}</span>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: C.grey, margin: "10px 0 0" }}>{pr.desc}</p>
            </div>
          ))}
        </div>
        {siblingDiscounts.length > 0 && (
          <div className="as-reveal" style={{ maxWidth: 720, margin: "28px auto 0", background: "#fff", borderRadius: 24, padding: "26px 28px", boxShadow: "0 10px 28px rgba(15,91,143,0.08)", border: "2px solid #ffe6bd" }}>
            <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 19, color: C.navy, display: "flex", alignItems: "center", gap: 8 }}>Zniżki dla rodzeństwa</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {siblingDiscounts.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: 1.5, color: "#1b3a4b" }}>
                  <span style={{ color: C.orange, fontWeight: 800 }}>•</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(paymentAccount || paymentDeadline || paymentNote) && (
          <div className="as-reveal" style={{ maxWidth: 720, margin: "22px auto 0", background: "linear-gradient(135deg,#e8f4fb,#f4fafe)", borderRadius: 24, padding: "26px 28px", border: "1px solid #d6e7f2" }}>
            <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 19, color: C.navy, display: "flex", alignItems: "center", gap: 8 }}>Płatności</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14, fontSize: 15, color: "#1b3a4b" }}>
              {paymentDeadline && <div>Termin płatności: <strong>{paymentDeadline}</strong></div>}
              {paymentAccount && (
                <div>
                  Numer konta:
                  <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: C.navy, background: "#fff", borderRadius: 10, padding: "10px 14px", marginTop: 6, wordBreak: "break-all" }}>{paymentAccount}</div>
                </div>
              )}
              {paymentNote && <div style={{ color: C.grey, fontSize: 14, lineHeight: 1.55 }}>{paymentNote}</div>}
            </div>
          </div>
        )}
      </section>

      {/* ============ GALERIA ZAJĘĆ ============ */}
      <section id="galeria" style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 22px 20px" }}>
        <div className="as-reveal" style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26 }}>
          <div>
            <div className="font-fredoka" style={eyebrow}>{galleryEyebrow}</div>
            <h2 className="font-fredoka" style={h2style}>{galleryTitle}</h2>
          </div>
          {galleryItems.length > 6 && (
            <button onClick={() => setShowAllGallery((v) => !v)} className="font-fredoka as-btn-secondary" style={{ fontWeight: 600, fontSize: 15, color: C.navy, background: "#fff", border: "2px solid #6cb4e0", borderRadius: 999, padding: "11px 22px", cursor: "pointer" }}>
              {showAllGallery ? "Pokaż mniej" : `Zobacz wszystkie (${galleryItems.length})`}
            </button>
          )}
        </div>
        <div className="as-reveal as-gallery-grid" style={{ display: "grid", gap: 16 }}>
          {visibleGallery.map((item, i) => (
            <button key={i} onClick={() => setLightbox({ items: galleryItems, index: i })} className="as-gallery-item" style={{ border: "none", padding: 0, cursor: "pointer", borderRadius: 20, overflow: "hidden", aspectRatio: "4/3", position: "relative", boxShadow: "0 8px 20px rgba(15,91,143,0.08)" }}>
              {item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg,#d3e7f5,#d3e7f5 14px,#e8f4fb 14px,#e8f4fb 28px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "#7fa3bd", letterSpacing: "0.06em" }}>{item.label}</span>
                </div>
              )}
              <span style={{ position: "absolute", right: 10, bottom: 10, width: 32, height: 32, borderRadius: "50%", background: "rgba(15,91,143,0.85)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⤢</span>
            </button>
          ))}
        </div>
      </section>

      {/* ============ OBOZY ============ */}
      <section id="obozy" style={{ position: "relative", marginTop: 72, background: "linear-gradient(170deg,#0f5b8f,#0a3f63)", color: "#fff", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -1, left: 0, right: 0, transform: "rotate(180deg)", lineHeight: 0, pointerEvents: "none" }}>
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ width: "100%", height: 60, display: "block" }}><path d="M0,35 C360,70 720,0 1080,35 C1260,52 1380,18 1440,35 L1440,70 L0,70 Z" fill="#f4fafe" /></svg>
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "90px 22px 80px" }}>
          <div className="as-reveal" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 36px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,210,122,0.18)", borderRadius: 999, padding: "7px 15px", fontWeight: 800, fontSize: 14, color: "#ffd27a" }}>{campsBadge}</div>
            <h2 className="font-fredoka" style={{ fontWeight: 700, fontSize: "clamp(28px,4vw,42px)", margin: "16px 0 0" }}>{campsTitle}</h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "#cfe6f5", margin: "16px 0 0" }}>{campsDescription}</p>
            {campsOfferPdfUrl && (
              <a href={campsOfferPdfUrl} target="_blank" rel="noreferrer" className="font-fredoka" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 22, fontWeight: 700, fontSize: 15, color: "#0f5b8f", background: "#ffd27a", borderRadius: 999, padding: "13px 28px", textDecoration: "none", boxShadow: "0 10px 24px rgba(0,0,0,0.28)" }}>
                ⬇ Pobierz ofertę obozów (PDF)
              </a>
            )}
          </div>

          {/* Aktualności — planowane turnusy (lub komunikat o braku) */}
          <div className="as-reveal" style={{ marginBottom: 40 }}>
            <h3 className="font-fredoka" style={{ fontWeight: 700, fontSize: 22, color: "#fff", textAlign: "center", margin: "0 0 18px" }}>{campsUpcomingHeading}</h3>
            {camps.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
                {camps.map((c) => (
                  <div key={c._id} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "24px 22px" }}>
                    <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 20, color: "#fff" }}>{c.title}</div>
                    {c.period && <div style={{ fontWeight: 700, fontSize: 14, color: "#ffd27a", marginTop: 8 }}>📅 {c.period}</div>}
                    {c.location && <div style={{ fontSize: 14, color: "#cfe6f5", marginTop: 4 }}>📍 {c.location}</div>}
                    {c.price && <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 24, color: "#ffd27a", marginTop: 10 }}>{c.price}</div>}
                    {c.description && <p style={{ fontSize: 15, lineHeight: 1.55, color: "#cfe6f5", margin: "10px 0 0" }}>{c.description}</p>}
                    {c.contactNote && <div style={{ fontSize: 13, color: "#a8d4ef", marginTop: 10 }}>{c.contactNote}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.08)", border: "1px dashed rgba(255,255,255,0.3)", borderRadius: 18, padding: "22px 24px", textAlign: "center", color: "#cfe6f5", fontSize: 16, maxWidth: 640, margin: "0 auto" }}>
                {campsEmptyText}
              </div>
            )}
          </div>

          {/* Zdjęcia flagowe + wejście do pełnej biblioteki zdjęć obozowych */}
          <div className="as-reveal" style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 className="font-fredoka" style={{ fontWeight: 700, fontSize: 22, color: "#fff", margin: 0 }}>{campsPhotosHeading}</h3>
              {campPhotoItems.length > 4 && (
                <button onClick={() => setShowAllCamps((v) => !v)} className="font-fredoka" style={{ fontWeight: 600, fontSize: 14, color: "#0f5b8f", background: "#fff", border: "none", borderRadius: 999, padding: "9px 18px", cursor: "pointer" }}>
                  {showAllCamps ? "Pokaż mniej" : `Zobacz wszystkie (${campPhotoItems.length})`}
                </button>
              )}
            </div>
            <div className="as-camp-grid" style={{ display: "grid", gap: 14 }}>
              {campVisible.map((item, i) => (
                <button key={i} onClick={() => { if (item.url) setLightbox({ items: campPhotoItems, index: i }); }} className={item.url ? "as-gallery-item" : undefined} style={{ border: "none", padding: 0, cursor: item.url ? "pointer" : "default", borderRadius: 20, overflow: "hidden", aspectRatio: "4/3", position: "relative", boxShadow: "0 10px 24px rgba(0,0,0,0.25)" }}>
                  {item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg,#1a6ca3,#1a6ca3 14px,#175f8f 14px,#175f8f 28px)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.25)" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{item.label}</span>
                    </div>
                  )}
                  {item.url && item.label && (
                    <span className="font-fredoka" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "26px 14px 12px", textAlign: "left", fontWeight: 700, fontSize: 14, color: "#fff", background: "linear-gradient(transparent, rgba(8,40,64,0.82))", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{item.label}</span>
                  )}
                  {item.url && <span style={{ position: "absolute", right: 12, top: 12, width: 32, height: 32, borderRadius: "50%", background: "rgba(15,91,143,0.9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⤢</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Kontakt */}
          <div className="as-reveal" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 18, padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 15, color: "#cfe6f5" }}>📞 Zapisy i pytania:</span>
            <ContactAction value={contactPhone} type="phone" triggerStyle={{ fontWeight: 700, fontSize: 18, color: "#fff" }} />
            <ContactAction value={contactEmail} type="email" triggerStyle={{ fontWeight: 700, fontSize: 18, color: "#fff" }} />
          </div>
        </div>
        <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, lineHeight: 0, pointerEvents: "none" }}>
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ width: "100%", height: 60, display: "block" }}><path d="M0,35 C360,70 720,0 1080,35 C1260,52 1380,18 1440,35 L1440,70 L0,70 Z" fill="#f4fafe" /></svg>
        </div>
      </section>

      {/* ============ REGULAMIN ============ */}
      <section id="regulamin" style={{ maxWidth: 860, margin: "0 auto", padding: "64px 22px 20px" }}>
        <div className="as-reveal" style={{ textAlign: "center", marginBottom: 34 }}>
          <div className="font-fredoka" style={eyebrow}>{regulationsEyebrow}</div>
          <h2 className="font-fredoka" style={h2style}>{regulationsTitle}</h2>
          {regulationsPdfUrl && (
            <a href={regulationsPdfUrl} target="_blank" rel="noreferrer" className="font-fredoka as-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 18, fontWeight: 600, fontSize: 15, color: "#fff", background: C.orange, borderRadius: 999, padding: "12px 24px", textDecoration: "none", boxShadow: "0 8px 18px rgba(233,161,59,0.32)" }}>
              ⬇ Pobierz regulamin (PDF)
            </a>
          )}
        </div>
        <div className="as-reveal" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {regView.map((rg, i) => {
            const open = openReg === i;
            return (
              <div key={i} style={{ background: "#fff", borderRadius: 18, border: "1px solid #eaf2f8", boxShadow: "0 6px 18px rgba(15,91,143,0.06)", overflow: "hidden" }}>
                <button onClick={() => setOpenReg(open ? -1 : i)} className="font-fredoka" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontWeight: 600, fontSize: 17, color: "#1b3a4b" }}>
                  <span>{rg.title}</span>
                  <span style={{ flex: "none", width: 30, height: 30, borderRadius: "50%", background: C.lightBlue, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>⌄</span>
                </button>
                {open && (
                  <div style={{ padding: "0 22px 20px", fontSize: 15, lineHeight: 1.65, color: C.grey }}>{rg.body}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ FORMULARZ NABORU ============ */}
      <section id="nabor" style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 22px 20px" }}>
        <div className="as-reveal" style={{ background: "#fff", borderRadius: 28, boxShadow: "0 16px 40px rgba(15,91,143,0.1)", border: "1px solid #eaf2f8", overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
          <div className="as-form-pad" style={{ background: "linear-gradient(160deg,#6cb4e0,#0f5b8f)", color: "#fff", padding: "42px 38px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "relative", zIndex: 2 }}>
              {naborActive && (
                <span className="font-fredoka" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.orange, borderRadius: 999, padding: "6px 14px", fontWeight: 700, fontSize: 13, color: "#fff" }}>● Trwa nabór</span>
              )}
              <h2 className="font-fredoka" style={{ fontWeight: 700, fontSize: 32, margin: "16px 0 0" }}>{formTitle}</h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "#e0f0fa", margin: "14px 0 0" }}>{formSubtitle}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 28 }}>
                {formBenefits.map((t) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#eaf6fc" }}><span style={{ fontSize: 20 }}>✓</span> {t}</div>
                ))}
              </div>
            </div>
            <div style={{ position: "absolute", right: -30, bottom: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          </div>

          <div className="as-form-pad" style={{ padding: "42px 38px" }}>
            {!sent ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ display: "block", fontWeight: 800, fontSize: 14, color: "#1b3a4b", marginBottom: 8 }}>Poziom dziecka</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {levelChoices.map((l) => {
                      const active = fLevel === l._id;
                      return (
                        <button key={l._id} onClick={() => setFLevel(l._id)} className="as-pill" style={{ fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "9px 16px", border: `2px solid ${active ? C.blue : "#e3eef5"}`, background: active ? C.lightBlue : "#fff", color: active ? C.navy : C.grey }}>
                          {l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: 800, fontSize: 14, color: "#1b3a4b", marginBottom: 8 }}>Czy dziecko kontynuuje zajęcia?</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {CONT.map((c) => {
                      const active = fCont === c.k;
                      return (
                        <button key={c.k} onClick={() => setFCont(c.k)} className="as-pill" style={{ flex: 1, fontWeight: 800, fontSize: 14, borderRadius: 14, padding: "11px 16px", border: `2px solid ${active ? C.blue : "#e3eef5"}`, background: active ? C.lightBlue : "#fff", color: active ? C.navy : C.grey }}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="as-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 800, fontSize: 14, color: "#1b3a4b", marginBottom: 8 }}>Imię i nazwisko dziecka</label>
                    <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="np. Zosia Kowalska" className="as-input" style={{ width: "100%", fontSize: 15, padding: "13px 16px", borderRadius: 14, border: "2px solid #e3eef5", background: "#f8fcff", color: "#1b3a4b" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 800, fontSize: 14, color: "#1b3a4b", marginBottom: 8 }}>Wiek</label>
                    <input value={fAge} onChange={(e) => setFAge(e.target.value)} placeholder="np. 7" className="as-input" style={{ width: "100%", fontSize: 15, padding: "13px 16px", borderRadius: 14, border: "2px solid #e3eef5", background: "#f8fcff", color: "#1b3a4b" }} />
                  </div>
                </div>
                <div className="as-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 800, fontSize: 14, color: "#1b3a4b", marginBottom: 8 }}>E-mail rodzica</label>
                    <input value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="np. rodzic@email.pl" className="as-input" style={{ width: "100%", fontSize: 15, padding: "13px 16px", borderRadius: 14, border: "2px solid #e3eef5", background: "#f8fcff", color: "#1b3a4b" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 800, fontSize: 14, color: "#1b3a4b", marginBottom: 8 }}>Telefon</label>
                    <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} type="tel" placeholder="np. 600 100 200" className="as-input" style={{ width: "100%", fontSize: 15, padding: "13px 16px", borderRadius: 14, border: "2px solid #e3eef5", background: "#f8fcff", color: "#1b3a4b" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: 800, fontSize: 14, color: "#1b3a4b", marginBottom: 8 }}>Wiadomość / uwagi <span style={{ fontWeight: 400, color: "#5a6b75" }}>(opcjonalnie)</span></label>
                  <textarea value={fNote} onChange={(e) => setFNote(e.target.value)} rows={3} placeholder="np. preferowane godziny, pytania, informacje o dziecku…" className="as-input" style={{ width: "100%", fontSize: 15, padding: "13px 16px", borderRadius: 14, border: "2px solid #e3eef5", background: "#f8fcff", color: "#1b3a4b", resize: "vertical", fontFamily: "inherit" }} />
                </div>
                {/* Honeypot — ukryte pole; ludzie go nie widzą, boty wypełniają */}
                <input value={fHp} onChange={(e) => setFHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, lineHeight: 1.5, color: C.grey, cursor: "pointer" }}>
                  <input type="checkbox" checked={fConsent} onChange={(e) => { setFConsent(e.target.checked); setFormError(null); }} style={{ width: 18, height: 18, marginTop: 2, flex: "none" }} />
                  <span>
                    Wyrażam zgodę na przetwarzanie danych osobowych moich i dziecka w celu obsługi zgłoszenia, zgodnie z{" "}
                    <a href="/polityka-prywatnosci" target="_blank" rel="noreferrer" style={{ color: C.navy, fontWeight: 800 }}>polityką prywatności</a>.
                  </span>
                </label>
                {formError && (
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#b4232a", background: "#fdeaea", borderRadius: 12, padding: "10px 14px" }}>{formError}</div>
                )}
                <button onClick={handleSubmit} disabled={submitting || !fConsent} className="font-fredoka as-btn-white" style={{ fontWeight: 600, fontSize: 17, color: "#fff", background: submitting || !fConsent ? "#caa46a" : C.orange, border: "none", borderRadius: 999, padding: "15px 30px", cursor: submitting || !fConsent ? "default" : "pointer", boxShadow: "0 10px 24px rgba(233,161,59,0.35)" }}>
                  {submitting ? "Wysyłanie…" : "Wyślij zgłoszenie"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 320, gap: 14 }}>
                <div style={{ width: 74, height: 74, borderRadius: "50%", background: "#e8f7ee", color: "#1f8a5b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>✓</div>
                <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 24, color: C.navy }}>{formSuccessTitle}</div>
                <p style={{ fontSize: 16, color: C.grey, maxWidth: 320, lineHeight: 1.55 }}>{formSuccessText}</p>
                {!me && (
                  <p style={{ fontSize: 14, color: C.navy, background: "#e8f4fb", borderRadius: 12, padding: "10px 14px", maxWidth: 360, lineHeight: 1.5 }}>
                    💡 Załóż konto na <strong>ten sam e-mail</strong>, aby śledzić status zgłoszenia i grafik w „Moje konto".{" "}
                    <a href="/login" style={{ color: C.navy, fontWeight: 800 }}>Załóż konto →</a>
                  </p>
                )}
                <button onClick={() => { setSent(false); setFName(""); setFAge(""); setFEmail(""); setFPhone(""); setFNote(""); setFConsent(false); }} className="font-fredoka as-btn-secondary" style={{ fontWeight: 600, fontSize: 15, color: C.navy, background: "#fff", border: "2px solid #6cb4e0", borderRadius: 999, padding: "11px 22px", cursor: "pointer", marginTop: 6 }}>
                  Wyślij kolejne
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ STOPKA ============ */}
      <footer id="kontakt" style={{ position: "relative", marginTop: 60, background: "linear-gradient(170deg,#0f5b8f,#0a3f63)", color: "#fff" }}>
        <div style={{ position: "absolute", top: -1, left: 0, right: 0, transform: "rotate(180deg)", lineHeight: 0, pointerEvents: "none" }}>
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ width: "100%", height: 58, display: "block" }}><path d="M0,35 C360,70 720,0 1080,35 C1260,52 1380,18 1440,35 L1440,70 L0,70 Z" fill="#f4fafe" /></svg>
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "90px 22px 36px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 40 }}>
          <div>
            <div style={{ background: "#fff", borderRadius: 18, padding: "12px 16px", display: "inline-flex" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ALL SWIM" style={{ height: 46, display: "block" }} />
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#cfe6f5", margin: "18px 0 0", maxWidth: 280 }}>{footerAbout}</p>
          </div>
          <div>
            <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, color: "#ffd27a" }}>Kontakt</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, color: "#cfe6f5" }}>
              <span>📧 <ContactAction value={contactEmail} type="email" triggerStyle={{ color: "#fff", fontWeight: 700, fontSize: 15 }} /></span>
              <span>📞 <ContactAction value={contactPhone} type="phone" triggerStyle={{ color: "#fff", fontWeight: 700, fontSize: 15 }} /></span>
              <span>📍 {contactAddress}</span>
            </div>
          </div>
          <div>
            <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, color: "#ffd27a" }}>Nawigacja</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 15 }}>
              {[{ l: "Grafik zajęć", h: "#grafik" }, { l: "Cennik", h: "#cennik" }, { l: "Galeria", h: "#galeria" }, { l: "Regulamin", h: "#regulamin" }].map((x) => (
                <a key={x.h} href={x.h} onClick={(e) => { e.preventDefault(); go(x.h.slice(1)); }} className="as-foot-link" style={{ color: "#cfe6f5", textDecoration: "none" }}>{x.l}</a>
              ))}
            </div>
          </div>
          <div>
            <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, color: "#ffd27a" }}>Obserwuj</div>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                {
                  href: instagramUrl,
                  label: "Instagram",
                  icon: (
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.3" cy="6.7" r="1.1" fill="#fff" stroke="none" />
                    </svg>
                  ),
                },
                {
                  href: facebookUrl,
                  label: "Facebook",
                  icon: (
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff">
                      <path d="M13.5 21v-7h2.3l.4-2.85h-2.7V9.3c0-.82.23-1.38 1.4-1.38h1.5V5.37c-.26-.03-1.15-.11-2.18-.11-2.16 0-3.64 1.32-3.64 3.74v2.15H8.3V14h2.32v7h2.88z" />
                    </svg>
                  ),
                },
                {
                  href: `mailto:${contactEmail}`,
                  label: "E-mail",
                  icon: (
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3.5 7l8.5 6 8.5-6" />
                    </svg>
                  ),
                },
              ].map((s, i) => (
                <a key={i} href={s.href} aria-label={s.label} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="as-social" style={{ textDecoration: "none", width: 46, height: 46, borderRadius: 14, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "20px 22px", textAlign: "center", fontSize: 13, color: "#9ec3dc" }}>
          © 2026 ALL SWIM · Wszystkie prawa zastrzeżone ·{" "}
          <a href="/polityka-prywatnosci" style={{ color: "#cfe6f5", textDecoration: "underline" }}>Polityka prywatności</a>
        </div>
      </footer>

      {/* ============ LIGHTBOX ============ */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(10,63,99,0.88)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}>
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 22, right: 24, width: 48, height: 48, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 24, cursor: "pointer" }}>✕</button>
          <button onClick={(e) => { e.stopPropagation(); setLightbox({ items: lightbox.items, index: (lightbox.index - 1 + lightbox.items.length) % lightbox.items.length }); }} style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", width: 52, height: 52, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 24, cursor: "pointer" }}>‹</button>
          <button onClick={(e) => { e.stopPropagation(); setLightbox({ items: lightbox.items, index: (lightbox.index + 1) % lightbox.items.length }); }} style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", width: 52, height: 52, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 24, cursor: "pointer" }}>›</button>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(900px,92vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
            {lightbox.items[lightbox.index].url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lightbox.items[lightbox.index].url!} alt={lightbox.items[lightbox.index].label} style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 18, boxShadow: "0 30px 70px rgba(0,0,0,0.5)", objectFit: "contain" }} />
            ) : (
              <div style={{ width: "min(820px,90vw)", aspectRatio: "4/3", borderRadius: 24, boxShadow: "0 30px 70px rgba(0,0,0,0.5)", background: "repeating-linear-gradient(135deg,#d3e7f5,#d3e7f5 22px,#e8f4fb 22px,#e8f4fb 44px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "monospace", fontSize: 16, color: "#5a8bab", letterSpacing: "0.08em" }}>{lightbox.items[lightbox.index].label}</span>
              </div>
            )}
            {lightbox.items[lightbox.index].url && lightbox.items[lightbox.index].label && (
              <div className="font-fredoka" style={{ color: "#fff", fontSize: 16, fontWeight: 700, textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{lightbox.items[lightbox.index].label}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Klikalny kontakt: po kliknięciu pokazuje menu „Kopiuj” + „Napisz e-mail” / „Zadzwoń”.
// Dla telefonu link tel: zawiera tylko cyfry (to, co wpisuje się w komórce).
function ContactAction({
  value,
  type,
  triggerStyle,
}: {
  value: string;
  type: "email" | "phone";
  triggerStyle?: React.CSSProperties;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!value || !value.trim()) return null;

  const href = type === "email" ? `mailto:${value}` : `tel:${value.replace(/[^+\d]/g, "")}`;
  const actionLabel = type === "email" ? "Napisz e-mail" : "Zadzwoń";

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const menuH = 118;
      // Gdy przycisk jest nisko (mało miejsca pod nim) — pokaż menu nad nim.
      const top = r.bottom + 8 + menuH > window.innerHeight ? Math.max(8, r.top - menuH) : r.bottom + 8;
      setPos({ top, left: Math.min(r.left, window.innerWidth - 232) });
    }
    setOpen(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* schowek niedostępny — pomijamy */
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="font-fredoka"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", fontWeight: 700, ...triggerStyle }}
      >
        {value}
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 120 }} />
          <div style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 121, background: "#fff", borderRadius: 14, boxShadow: "0 16px 40px rgba(8,40,64,0.3)", border: "1px solid #e3eef5", padding: 8, display: "flex", flexDirection: "column", gap: 4, minWidth: 210 }}>
            <a href={href} onClick={() => setOpen(false)} className="as-contact-opt" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#1b3a4b", fontWeight: 700, fontSize: 14, padding: "11px 12px", borderRadius: 10 }}>
              {actionLabel}
            </a>
            <button onClick={copy} className="as-contact-opt" style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", color: copied ? "#1f8a5b" : "#1b3a4b", fontWeight: 700, fontSize: 14, padding: "11px 12px", borderRadius: 10, textAlign: "left" }}>
              {copied ? "Skopiowano!" : "Kopiuj"}
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
