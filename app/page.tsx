"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Icon, IconName } from "@/components/Icons";
import { CAMPS_EMPTY_TITLE, CAMPS_EMPTY_TEXT, CAMPS_PHOTOS_HEADING } from "@/components/campsDefaults";

const DAY_NAMES = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const DAY_SHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

// Grafik publiczny: skraca nazwę grupy o dzień i godziny, które karta i tak pokazuje
// („Grupa Waldek Wtorek 17:10" → „Grupa Waldek"). Tylko wyświetlanie — pełna nazwa zostaje
// w bazie, bo służy w panelu admina, mailach do rodziców i na koncie.
function shortGroupName(name: string, dayIdx: number, times: string[]): string {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let out = name;
  const tokens = [DAY_NAMES[dayIdx], DAY_SHORT[dayIdx], ...times.filter(Boolean), ...times.filter(Boolean).map((t) => t.replace(":", "."))];
  for (const t of tokens) {
    if (!t) continue;
    out = out.replace(new RegExp(`(^|[\\s,·–-])${esc(t)}\\.?(?=$|[\\s,·–-])`, "gi"), "$1");
  }
  out = out.replace(/[\s,·–-]+$/g, "").replace(/^[\s,·–-]+/g, "").replace(/\s{2,}/g, " ").trim();
  return out || name;
}

// Odmiana: 1 termin, 2–4 terminy, 5+ terminów (z wyjątkiem 12–14).
function terminy(n: number): string {
  if (n === 1) return "1 termin";
  const d = n % 10, h = n % 100;
  return `${n} ${d >= 2 && d <= 4 && (h < 12 || h > 14) ? "terminy" : "terminów"}`;
}

const C = {
  blue: "#6cb4e0",
  navy: "#0f5b8f",
  navyDeep: "#0a3f63",
  orange: "#e9a13b",
  gold: "#ffd27a",
  lightBlue: "#e8f4fb",
  soft: "#f8fcff",
  line: "#e6eff6",
  grey: "#5a6b75",
};

const NAV = [
  { label: "O nas", href: "#onas" },
  { label: "Grafik", href: "#grafik" },
  { label: "Nabór", href: "#nabor" },
  { label: "Cennik", href: "#cennik" },
  { label: "Galeria", href: "#galeria" },
  { label: "Obozy", href: "#obozy" },
  { label: "Dokumenty", href: "#regulamin" },
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
  display: "inline-block",
  fontWeight: 700,
  fontSize: 12.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#c47d16",
  background: "rgba(233,161,59,0.14)",
  border: "1px solid rgba(233,161,59,0.28)",
  borderRadius: 999,
  padding: "7px 15px",
};
const h2style: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "clamp(34px,5.2vw,58px)",
  lineHeight: 1.02,
  letterSpacing: "-0.015em",
  margin: "14px 0 0",
  color: C.navy,
};

function go(id: string) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
}

// Usuwa emotki/piktogramy z początku i wnętrza tekstu (treści z panelu bywają z emotkami).
// Dzięki temu odznaki renderujemy czysto, z własną ikoną liniową zamiast emotki.
function stripEmoji(s: string): string {
  return s
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2300}-\u{23FF}]/gu,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Małe pudełko z ikoną (spójna oprawa ikon w sekcjach/odznakach).
function IconBadge({
  name,
  size = 20,
  box = 42,
  color = "#fff",
  bg = "rgba(255,255,255,0.18)",
  radius = 14,
  stroke = 1.8,
}: {
  name: IconName;
  size?: number;
  box?: number;
  color?: string;
  bg?: string;
  radius?: number;
  stroke?: number;
}) {
  return (
    <span className="as-ibadge" style={{ width: box, height: box, background: bg, borderRadius: radius, color }}>
      <Icon name={name} size={size} stroke={stroke} />
    </span>
  );
}

// Zwraca okno `count` elementów zaczynając od `offset`, zawijając się dookoła.
function rotateWindow<T>(items: T[], offset: number, count: number): T[] {
  if (items.length <= count) return items;
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(items[(offset + i) % items.length]);
  return out;
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [poolFilter, setPoolFilter] = useState<string>("all");
  // Dzisiejszy dzień (0 = poniedziałek) — liczony dopiero w przeglądarce, żeby SSR nie rozjechał się z klientem.
  const [todayIdx, setTodayIdx] = useState(-1);
  useEffect(() => { setTodayIdx((new Date().getDay() + 6) % 7); }, []);
  const [lightbox, setLightbox] = useState<{ items: { url: string | null; label: string; kind?: "image" | "video" }[]; index: number } | null>(null);
  const [openReg, setOpenReg] = useState(0);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [showAllCamps, setShowAllCamps] = useState(false);
  // Automatyczna rotacja zdjęć na głównej (galeria + obozy).
  const [galleryOffset, setGalleryOffset] = useState(0);
  const [campsOffset, setCampsOffset] = useState(0);
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
  const contractPdfUrl = settings?.contractPdfUrl ?? null;
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
  const aboutBadge = stripEmoji(settings?.aboutBadge || "Ratownik wodny");
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
  const regulationsEyebrow = settings?.regulationsEyebrow || "Dokumenty";
  const regulationsTitle = settings?.regulationsTitle || "Regulamin i umowa";
  const instructorsHeading = settings?.instructorsHeading || "Pozostali instruktorzy";
  const campsBadge = stripEmoji(settings?.campsBadge || "Lato 2026");
  const campsTitle = settings?.campsTitle || "Obozy letnie z pływaniem";
  const campsDescription = settings?.campsDescription || "Tydzień pełen wody, zabawy i nauki pływania. Codzienne zajęcia na basenie, gry zespołowe i bezpieczna, ciepła atmosfera.";
  const campsParagraphs = campsDescription.split(/\n\n+|\n/).map(stripEmoji).filter((p) => p.trim());
  const campsDates = settings?.campsDates || "";
  const campsLocation = settings?.campsLocation || "";
  const campsPrice = settings?.campsPrice || "";
  const campsPosterUrl = settings?.campsPosterUrl ?? null;
  const campsPhotosHeading = settings?.campsPhotosHeading || CAMPS_PHOTOS_HEADING;
  // Czy jest aktualna oferta obozu (przełącznik w panelu). Brak = wersja „nowe obozy wkrótce” + duża galeria.
  const campsOfferActive = settings?.campsOfferActive ?? false;
  const campsEmptyTitle = settings?.campsUpcomingHeading || CAMPS_EMPTY_TITLE;
  const campsEmptyParagraphs = (settings?.campsEmptyText || CAMPS_EMPTY_TEXT).split(/\n\n+|\n/).map(stripEmoji).filter((p) => p.trim());
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

  // Zdjęcia Oli do kolażu w „o nas": preferujemy zdjęcia z kategorii „about",
  // a jeśli ich nie ma — używamy starego pojedynczego zdjęcia z ustawień.
  const aboutPhotoItems: { url: string; label: string }[] =
    (aboutImages ?? [])
      .filter((g): g is typeof g & { url: string } => !!g.url)
      .map((g) => ({ url: g.url, label: g.caption || "" }));
  const olaPhotoUrls: string[] = aboutPhotoItems.length
    ? aboutPhotoItems.map((p) => p.url).slice(0, 3)
    : aboutImageUrl
      ? [aboutImageUrl]
      : [];

  // Zdjęcia galerii zajęć (fallback: placeholdery z etykietami).
  const galleryItems: { url: string | null; label: string; kind: "image" | "video" }[] =
    galleryImages && galleryImages.length
      ? galleryImages.map((g) => ({ url: g.url, label: g.caption || "", kind: g.kind }))
      : GALLERY.map((label) => ({ url: null, label, kind: "image" as const }));
  const visibleGallery = showAllGallery ? galleryItems : rotateWindow(galleryItems, galleryOffset, 6);
  // Hero: pierwsze 3 prawdziwe zdjęcia z galerii jako pływające karty.
  const heroPhotos = galleryItems.filter((g) => g.url && g.kind !== "video").slice(0, 3);
  // Formularz: statyczne zdjęcie z zajęć obok pól (czwarte z galerii, żeby nie powtarzać hero).
  const photoPool = galleryItems.filter((g) => g.url && g.kind !== "video");
  const formPhoto = (photoPool[3] ?? photoPool[0])?.url ?? null;

  // Zdjęcia z obozów (osobna sekcja).
  const campPhotoItems: { url: string | null; label: string; kind: "image" | "video" }[] =
    campImages && campImages.length
      ? campImages.map((g) => ({ url: g.url, label: g.caption || "", kind: g.kind }))
      : [];
  // Zdjęcia flagowe obozów (uzupełnione placeholderami, jeśli brak).
  const flagship: { url: string | null; label: string; kind: "image" | "video" }[] = [...campPhotoItems.slice(0, 6)];
  while (flagship.length < 6) flagship.push({ url: null, label: `ZDJĘCIE ${flagship.length + 1}`, kind: "image" });
  // Kafelki obozów (duże, układ bento): 6 podglądowych lub wszystkie (po rozwinięciu); gdy brak — placeholdery.
  const campVisible = campPhotoItems.length
    ? showAllCamps
      ? campPhotoItems
      : rotateWindow(campPhotoItems, campsOffset, 6)
    : flagship;

  // Automatyczna rotacja galerii zajęć (co ~9s, powolne przenikanie, gdy >6 zdjęć).
  const galleryCount = galleryItems.length;
  useEffect(() => {
    if (showAllGallery || lightbox || galleryCount <= 6) return;
    const id = setInterval(() => {
      setGalleryOffset((o) => (o + 6) % galleryCount);
    }, 9000);
    return () => clearInterval(id);
  }, [showAllGallery, lightbox, galleryCount]);

  // Automatyczna rotacja zdjęć obozów (co ~9,8s, powolne przenikanie, gdy >6 zdjęć).
  const campsCount = campPhotoItems.length;
  useEffect(() => {
    if (showAllCamps || lightbox || campsCount <= 6) return;
    const id = setInterval(() => {
      setCampsOffset((o) => (o + 6) % campsCount);
    }, 9800);
    return () => clearInterval(id);
  }, [showAllCamps, lightbox, campsCount]);

  return (
    <div style={{ fontFamily: "var(--font-nunito), sans-serif", color: "#1b3a4b", background: "transparent", overflowX: "hidden", position: "relative", zIndex: 0 }}>
      {/* ============ ŻYWE TŁO (aurora) ============ */}
      <div className="as-aurora" aria-hidden>
        <i className="ab1" /><i className="ab2" /><i className="ab3" /><i className="ab4" /><i className="ab5" />
      </div>

      {/* ============ NAV ============ */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, padding: "12px 14px 0", marginBottom: -84, pointerEvents: "none" }}>
        <nav className="as-glass" style={{ pointerEvents: "auto", maxWidth: 1200, margin: "0 auto", padding: "9px 10px 9px 20px", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "rgba(255,255,255,0.78)" }}>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ALL SWIM" style={{ height: 40, width: "auto", display: "block" }} />
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
            <button className="as-burger" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu" style={{ display: "none", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 14, border: "2px solid #d6e7f2", background: "#fff", cursor: "pointer", color: C.navy }}>
              <Icon name={mobileOpen ? "close" : "menu"} size={22} stroke={2} />
            </button>
          </div>
        </nav>
        {mobileOpen && (
          <div className="as-glass" style={{ pointerEvents: "auto", maxWidth: 1200, margin: "10px auto 0", borderRadius: 24, background: "rgba(255,255,255,0.94)", padding: "10px 16px 14px" }}>
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
      <section className="as-mask-wave-bottom" style={{ position: "relative", background: "radial-gradient(120% 80% at 85% -10%, #8fd3f6 0%, rgba(143,211,246,0) 55%), linear-gradient(165deg, #45a6df 0%, #1c72b1 42%, #0b4677 100%)", color: "#fff", overflow: "hidden" }}>
        {/* Promienie światła pod wodą (god rays) */}
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {[
            { left: "8%", w: 140, rot: 16, d: "9s", del: "0s" },
            { left: "28%", w: 90, rot: 20, d: "11s", del: "1.5s" },
            { left: "52%", w: 170, rot: 14, d: "13s", del: "0.8s" },
            { left: "74%", w: 110, rot: 22, d: "10s", del: "2.4s" },
          ].map((r, i) => (
            <div key={i} style={{ position: "absolute", top: "-20%", left: r.left, width: r.w, height: "150%", background: "linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0) 72%)", ...({ "--r": `${r.rot}deg` } as React.CSSProperties), transform: `rotate(${r.rot}deg)`, transformOrigin: "top center", filter: "blur(8px)", animation: `as-ray ${r.d} ease-in-out infinite`, animationDelay: r.del }} />
          ))}
          {/* migotanie światła (caustics) */}
          <div style={{ position: "absolute", inset: "-10%", background: "radial-gradient(ellipse 30% 22% at 22% 30%, rgba(255,255,255,0.32), transparent 70%), radial-gradient(ellipse 26% 18% at 68% 62%, rgba(255,255,255,0.24), transparent 70%), radial-gradient(ellipse 22% 16% at 42% 84%, rgba(255,255,255,0.2), transparent 70%)", mixBlendMode: "soft-light", animation: "as-caustic 9s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: "-10%", background: "radial-gradient(ellipse 24% 18% at 78% 24%, rgba(255,255,255,0.28), transparent 70%), radial-gradient(ellipse 30% 20% at 30% 70%, rgba(255,255,255,0.18), transparent 70%)", mixBlendMode: "soft-light", animation: "as-caustic2 12s ease-in-out infinite" }} />
          {BUBBLES.map((b, i) => (
            <div key={i} style={{ position: "absolute", left: b.left, bottom: 0, width: b.size, height: b.size, borderRadius: "50%", background: b.color, animation: `asrise ${b.dur} ease-in infinite`, animationDelay: b.delay }} />
          ))}
        </div>

        <div className="as-hero-grid as-hero-pad" style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", display: "grid" }}>
          <div className="as-hero-top">
            <div className="font-fredoka" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 13.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.32)", backdropFilter: "blur(10px)", borderRadius: 999, padding: "9px 18px 9px 14px" }}>
              <span style={{ position: "relative", width: 10, height: 10, borderRadius: "50%", background: naborActive ? "#7ef0b5" : "#ffd27a", boxShadow: `0 0 0 5px ${naborActive ? "rgba(126,240,181,0.25)" : "rgba(255,210,122,0.25)"}`, display: "inline-block" }} />
              {naborActive ? "Trwa nabór · " + heroEyebrow : heroEyebrow}
            </div>
            <h1 className="font-fredoka" style={{ fontWeight: 700, fontSize: "clamp(44px,7vw,94px)", lineHeight: 0.98, letterSpacing: "-0.02em", margin: "22px 0 0", maxWidth: 760, textShadow: "0 4px 30px rgba(6,40,70,0.35)" }}>
              {heroLine1}{" "}
              <span style={{ position: "relative", display: "inline-block" }}>
                <span className="as-gradtext" style={{ textShadow: "none", filter: "drop-shadow(0 4px 18px rgba(6,40,70,0.35))" }}>{heroLine2}</span>
                <svg aria-hidden viewBox="0 0 300 20" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, bottom: "-0.12em", width: "100%", height: "0.22em", overflow: "visible" }}>
                  <path d="M3 14 C 60 2, 120 2, 160 10 S 260 18, 297 6" fill="none" stroke="#ffd27a" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
                </svg>
              </span>
            </h1>
          </div>
          <div className="as-hero-bottom">
            <p style={{ fontSize: "clamp(17px,2.2vw,21px)", lineHeight: 1.55, color: "#f2faff", maxWidth: 580, margin: "20px 0 0", textShadow: "0 1px 6px rgba(8,50,80,0.4)" }}>
              {heroSubtitle}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
              <button onClick={() => go("nabor")} className="font-fredoka as-btn-primary-lg as-arrow-link" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 600, fontSize: 17, color: "#fff", background: C.orange, border: "none", borderRadius: 999, padding: "15px 30px", cursor: "pointer", boxShadow: "0 10px 24px rgba(233,161,59,0.4)" }}>
                Zapisz dziecko <Icon name="arrowRight" size={19} stroke={2.1} />
              </button>
              <button onClick={() => go("grafik")} className="font-fredoka as-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 600, fontSize: 17, color: "#fff", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.55)", borderRadius: 999, padding: "13px 28px", cursor: "pointer" }}>
                <Icon name="calendar" size={19} /> Zobacz grafik
              </button>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" }}>
              {[
                { icon: "users" as IconName, value: heroStat1Value, label: heroStat1Label },
                { icon: "droplet" as IconName, value: heroStat2Value, label: heroStat2Label },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(4px)", borderRadius: 18, padding: "13px 18px 13px 14px" }}>
                  <IconBadge name={s.icon} box={44} size={22} bg="rgba(255,210,122,0.22)" color={C.gold} />
                  <div>
                    <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 26, lineHeight: 1, color: "#ffd27a" }}>{s.value}</div>
                    <div style={{ fontSize: 13.5, color: "#f2faff", marginTop: 3 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stos pływających zdjęć z zajęć (gdy są zdjęcia w galerii) */}
          {heroPhotos.length > 0 ? (
          <div className="as-hero-bubble">
            <div className="as-hero-stack">
              <div aria-hidden style={{ position: "absolute", inset: "-8%", borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, rgba(255,210,122,0.4), rgba(108,180,224,0.18) 55%, transparent 72%)", filter: "blur(10px)", animation: "asglow 7s ease-in-out infinite" }} />
              {heroPhotos.map((p, i) => {
                const pos: React.CSSProperties[] = [
                  { left: "0%", top: "10%", width: "58%", height: "60%", animation: "as-card-float1 9s ease-in-out infinite", zIndex: 2 },
                  { right: "0%", top: "0%", width: "50%", height: "46%", animation: "as-card-float2 10s ease-in-out infinite 0.6s", zIndex: 1 },
                  { right: "6%", bottom: "2%", width: "56%", height: "48%", animation: "as-card-float3 11s ease-in-out infinite 1.2s", zIndex: 3 },
                ];
                return (
                  <button key={i} className="as-hero-photo" onClick={() => setLightbox({ items: galleryItems, index: Math.max(0, galleryItems.indexOf(p)) })} style={pos[i]} aria-label="Powiększ zdjęcie">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url!} alt={p.label || "Zajęcia ALL SWIM"} />
                  </button>
                );
              })}
              {/* Logo w szklistym bąblu wody — nachodzi na zdjęcia */}
              <div className="as-hero-logo" style={{ position: "absolute", left: "-7%", bottom: "-5%", zIndex: 4, width: "44%", aspectRatio: "1", animation: "asfloat 7s ease-in-out infinite" }}>
                <div aria-hidden style={{ position: "absolute", inset: "-10%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.45), rgba(143,211,246,0.2) 55%, transparent 72%)", filter: "blur(6px)", animation: "asglow 6s ease-in-out infinite" }} />
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 36% 30%, #ffffff 0%, #ffffff 62%, #eaf6fd 82%, #c7e5f7 100%)", boxShadow: "0 26px 56px rgba(6,40,70,0.45), inset -14px -18px 36px rgba(108,180,224,0.35), inset 12px 14px 30px rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="ALL SWIM" style={{ width: "64%", height: "auto", display: "block" }} />
                </div>
                <div aria-hidden style={{ position: "absolute", top: "10%", left: "17%", width: "30%", height: "20%", borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95), transparent 70%)", filter: "blur(2px)", animation: "asshine 5s ease-in-out infinite" }} />
                <div aria-hidden style={{ position: "absolute", bottom: "14%", right: "18%", width: "10%", height: "8%", borderRadius: "50%", background: "rgba(255,255,255,0.7)", filter: "blur(1px)" }} />
              </div>
              {/* Małe bąbelki wokół */}
              {[
                { right: "-4%", top: "40%", s: 46, d: "6s", del: "0s" },
                { right: "8%", top: "-6%", s: 26, d: "5.2s", del: "0.8s" },
                { left: "40%", bottom: "-8%", s: 20, d: "6.6s", del: "1.4s" },
              ].map((b, i) => (
                <div key={i} aria-hidden className={`as-hero-bub as-hero-bub-${i}`} style={{ position: "absolute", left: b.left, right: b.right, top: b.top, bottom: b.bottom, zIndex: 4, width: b.s, height: b.s, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(168,212,239,0.55) 60%, rgba(108,180,224,0.3))", boxShadow: "inset -3px -5px 9px rgba(13,82,134,0.25), 0 8px 18px rgba(6,40,70,0.25)", animation: `asorbit ${b.d} ease-in-out infinite`, animationDelay: b.del }} />
              ))}
            </div>
          </div>
          ) : (
          <div className="as-hero-bubble" style={{ position: "relative", width: "min(420px,90vw)", aspectRatio: "1", margin: "0 auto" }}>
            <div style={{ position: "absolute", inset: "-6%", borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, rgba(255,210,122,0.45), rgba(108,180,224,0.25) 55%, transparent 72%)", filter: "blur(8px)", animation: "asglow 6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", top: "6%", left: "2%", width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), rgba(168,212,239,0.5) 60%, rgba(108,180,224,0.25))", boxShadow: "inset -4px -6px 10px rgba(13,82,134,0.25)", animation: "asorbit 7s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "8%", right: "0%", width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), rgba(168,212,239,0.5) 60%, rgba(108,180,224,0.25))", boxShadow: "inset -3px -5px 8px rgba(13,82,134,0.25)", animation: "asorbit 5.5s ease-in-out infinite 0.6s" }} />
            <div style={{ position: "absolute", top: "14%", right: "8%", width: 20, height: 20, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(255,210,122,0.5) 70%)", animation: "asorbit 6.2s ease-in-out infinite 1.1s" }} />
            <div style={{ position: "absolute", inset: "8%", borderRadius: "50%", animation: "asfloat 7s ease-in-out infinite" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #ffffff 0%, #ffffff 70%, #eaf5fc 88%, #cfe8f7 100%)", boxShadow: "0 30px 60px rgba(8,50,80,0.35), inset -16px -20px 42px rgba(108,180,224,0.28), inset 14px 16px 40px rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="ALL SWIM" style={{ width: "60%", height: "auto", display: "block" }} />
              </div>
              <div style={{ position: "absolute", top: "12%", left: "18%", width: "30%", height: "22%", borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95), transparent 70%)", filter: "blur(2px)", animation: "asshine 5s ease-in-out infinite" }} />
              <div style={{ position: "absolute", bottom: "16%", right: "20%", width: "12%", height: "10%", borderRadius: "50%", background: "rgba(255,255,255,0.6)", filter: "blur(1px)" }} />
            </div>
          </div>
          )}
        </div>

        {/* Warstwa głębi: półprzezroczysta fala płynąca nad żywą krawędzią */}
        <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 52, lineHeight: 0, pointerEvents: "none" }}>
          <div style={{ position: "relative", width: "200%", height: 90, animation: "aswave 14s linear infinite" }}>
            <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ width: "50%", height: "100%", float: "left" }}><path d="M0,45 C240,90 480,5 720,40 C960,75 1200,10 1440,45 L1440,90 L0,90 Z" fill="rgba(255,255,255,0.12)" /></svg>
            <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ width: "50%", height: "100%", float: "left" }}><path d="M0,45 C240,90 480,5 720,40 C960,75 1200,10 1440,45 L1440,90 L0,90 Z" fill="rgba(255,255,255,0.12)" /></svg>
          </div>
        </div>

        {/* Wskaźnik przewijania */}
        <button onClick={() => go("onas")} aria-label="Przewiń dalej" style={{ position: "absolute", left: "50%", bottom: 104, transform: "translateX(-50%)", zIndex: 3, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.85)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ animation: "as-scrollcue 2.2s ease-in-out infinite", display: "block" }}><Icon name="chevronDown" size={28} stroke={2} /></span>
        </button>
      </section>


      {/* ============ NABÓR BANNER ============ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 22px" }}>
        <div className="as-reveal" style={{ marginTop: 44 }}>
          {naborActive ? (
            <div style={{ position: "relative", zIndex: 3, background: "linear-gradient(100deg,#e9a13b,#f2bd6a)", borderRadius: 24, padding: "22px 26px", boxShadow: "0 18px 40px rgba(233,161,59,0.3)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <IconBadge name="megaphone" box={52} size={27} radius={16} bg="rgba(255,255,255,0.3)" color="#fff" />
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
            <div className="as-glass" style={{ position: "relative", zIndex: 3, borderRadius: 26, padding: "24px 28px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <IconBadge name="hourglass" box={52} size={26} radius={16} bg="#eef3f6" color={C.navy} />
                <div>
                  <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 24, color: C.grey }}>Nabór jest obecnie zamknięty</div>
                  <div style={{ fontSize: 15, color: C.grey }}>Zapisz się na listę powiadomień — damy znać, gdy ruszą kolejne zapisy.</div>
                </div>
              </div>
              {waitSent ? (
                <div className="font-fredoka" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "#1f8a5b", background: "#e8f7ee", borderRadius: 999, padding: "11px 20px" }}><Icon name="check" size={17} stroke={2.4} /> Dzięki! Damy znać mailowo.</div>
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
        <div className="as-reveal as-person-grid">
          <div className="as-person-header">
            <div className="font-fredoka" style={eyebrow}>{aboutEyebrow}</div>
            <h2 className="font-fredoka" style={h2style}>{aboutTitle}</h2>
            <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 17, color: "#1b3a4b", marginTop: 8 }}>{aboutRole}</div>
          </div>
          <div className="as-person-photo">
            <PhotoCollage
              photos={olaPhotoUrls}
              badge={aboutBadge}
              onOpen={(i) => setLightbox({ items: olaPhotoUrls.map((u) => ({ url: u, label: aboutTitle })), index: i })}
            />
          </div>
          <div className="as-person-desc">
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16, fontSize: 16, lineHeight: 1.65, color: C.grey }}>
              {aboutParagraphs.map((p, i) => (
                <p key={i} style={{ margin: 0 }}>{p}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Nagłówek nad pozostałymi instruktorami */}
        {instructorsData && instructorsData.length > 0 && (
          <div className="as-reveal as-instr-heading" style={{ marginTop: 64 }}>
            <div className="font-fredoka" style={eyebrow}>{instructorsHeading}</div>
          </div>
        )}

        {/* Dodatkowi instruktorzy (Ola wyżej; kolejni pod spodem) */}
        {instructorsData && instructorsData.map((ins) => (
          <div key={ins._id} className="as-reveal as-person-grid" style={{ marginTop: 36 }}>
            <div className="as-person-header">
              <h3 className="font-fredoka" style={{ fontWeight: 700, fontSize: "clamp(24px,3.6vw,34px)", color: C.navy, margin: 0 }}>{ins.name}</h3>
              {ins.role && <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 17, color: "#1b3a4b", marginTop: 8 }}>{ins.role}</div>}
            </div>
            <div className="as-person-photo">
              <PhotoCollage
                photos={ins.photoUrls}
                placeholderIcon="user"
                onOpen={(i) => setLightbox({ items: ins.photoUrls.map((u) => ({ url: u, label: ins.name })), index: i })}
              />
            </div>
            {ins.bio && (
              <div className="as-person-desc">
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16, fontSize: 16, lineHeight: 1.65, color: C.grey }}>
                  {ins.bio.split(/\n\n+|\n/).filter((p) => p.trim()).map((p, i) => (
                    <p key={i} style={{ margin: 0 }}>{p}</p>
                  ))}
                </div>
              </div>
            )}
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.grey }}>Basen:</span>
              <div className="as-pool-filter" role="radiogroup" aria-label="Filtr basenu">
                {[{ key: "all", label: "Wszystkie" }, ...poolsView.map((p) => ({ key: p, label: p }))].map((p) => {
                  const active = poolFilter === p.key;
                  return (
                    <button key={p.key} type="button" role="radio" aria-checked={active} data-on={active} onClick={() => setPoolFilter(p.key)}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {hasSchedule ? (
          <div className="as-reveal as-sched">
            {/* Pasek tygodnia: liczba terminów w każdym dniu, dziś wyróżnione, klik przenosi do dnia */}
            <div className="as-week-strip">
              {DAY_SHORT.map((short, i) => {
                const items = scheduleRows.filter((r) => r.dayIdx === i);
                const has = items.length > 0;
                return (
                  <button
                    key={i}
                    type="button"
                    className="as-week-day"
                    disabled={!has}
                    data-today={i === todayIdx}
                    aria-label={`${DAY_NAMES[i]}: ${has ? terminy(items.length) : "brak zajęć"}`}
                    onClick={() => { const el = document.getElementById(`grafik-dzien-${i}`); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" }); }}
                  >
                    <span className="as-week-day-name">{short}</span>
                    <span className="as-week-dots">
                      {items.slice(0, 6).map((r, j) => <i key={j} style={{ background: poolColor(r.pool) }} />)}
                    </span>
                    <span className="as-week-day-count">{has ? terminy(items.length) : "—"}</span>
                  </button>
                );
              })}
            </div>

            {/* Lista dzień po dniu (tylko dni z zajęciami) */}
            {DAY_NAMES.map((d, i) => {
              const day = scheduleRows.filter((r) => r.dayIdx === i).sort((a, b) => a.time.localeCompare(b.time));
              if (day.length === 0) return null;
              return (
                <div key={i} id={`grafik-dzien-${i}`} className="as-day-row">
                  <div className="as-day-head">
                    <div className="as-day-name">{d}</div>
                    <div className="as-day-meta">{terminy(day.length)}</div>
                    {i === todayIdx && <span className="as-today">Dziś</span>}
                  </div>
                  <div className="as-sessions">
                    {day.map((r, j) => (
                      <div key={j} className="as-session" style={{ ["--pool" as string]: poolColor(r.pool) } as React.CSSProperties}>
                        <div className="as-session-time">{r.time}{r.endTime && <span className="as-session-end">–{r.endTime}</span>}</div>
                        <div className="as-session-group" title={r.group}>{shortGroupName(r.group, r.dayIdx, [r.time, r.endTime])}</div>
                        {(r.pool || r.instructor) && (
                          <div className="as-session-meta">
                            {r.pool && <span><Icon name="mapPin" size={15} color={poolColor(r.pool)} /> {r.pool}</span>}
                            {r.instructor && <span><Icon name="whistle" size={15} /> {r.instructor}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {scheduleRows.length === 0 && (
              <div style={{ padding: "34px 24px", textAlign: "center", color: C.grey, fontSize: 15 }}>Brak zajęć na wybranym basenie.</div>
            )}
          </div>
        ) : (
          <div className="as-reveal as-glass" style={{ borderRadius: 28, padding: "44px 24px", textAlign: "center", color: C.grey }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><IconBadge name="calendar" box={60} size={30} radius={18} bg={C.lightBlue} color={C.navy} stroke={1.7} /></div>
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
        <div className="as-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 22, alignItems: "stretch" }}>
          {pricesView.map((pr, i) => {
            // Wyróżniona (ciemna) karta: „popularny", a gdy żaden nie jest oznaczony — pierwszy pakiet.
            const featured = pr.popular || (!pricesView.some((p) => p.popular) && i === 0);
            const icon: IconName = pr.popular ? "star" : i === 0 ? "droplet" : "tag";
            return (
              <div key={pr.name} className={featured ? "as-tilt as-price-pad" : "as-tilt as-glass as-price-pad"} style={{ background: featured ? "radial-gradient(120% 90% at 100% 0%, rgba(108,180,224,0.45), transparent 60%), linear-gradient(160deg,#1c72b1,#0a3f63)" : undefined, color: featured ? "#fff" : undefined, borderRadius: 30, padding: "36px 30px 32px", boxShadow: featured ? "0 30px 70px rgba(10,63,99,0.38)" : undefined, border: featured ? "1px solid rgba(255,255,255,0.18)" : undefined, position: "relative", overflow: "hidden" }}>
                {pr.popular && (
                  <span className="font-fredoka" style={{ position: "absolute", top: 18, right: 18, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12, color: "#0a3f63", background: "#ffd27a", borderRadius: 999, padding: "6px 13px" }}><Icon name="star" size={13} /> Najczęściej wybierany</span>
                )}
                <div className="as-price-head">
                  <IconBadge name={icon} box={54} size={26} radius={17} bg={featured ? "rgba(255,210,122,0.18)" : C.lightBlue} color={featured ? "#ffd27a" : C.navy} stroke={1.9} />
                  <div className="font-fredoka as-price-name" style={{ fontWeight: 700, fontSize: 21, color: featured ? "#fff" : "#1b3a4b", lineHeight: 1.2 }}>{pr.name}</div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "10px 0 0" }}>
                  <span className="font-fredoka" style={{ fontWeight: 700, fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em", color: featured ? "#ffd27a" : C.navy }}>{pr.price}</span>
                  <span style={{ fontSize: 15, color: featured ? "#cfe6f5" : C.grey, fontWeight: 700 }}>{pr.unit}</span>
                </div>
                <div style={{ height: 1, background: featured ? "rgba(255,255,255,0.18)" : "rgba(15,91,143,0.12)", margin: "20px 0 16px" }} />
                <p style={{ fontSize: 15, lineHeight: 1.6, color: featured ? "#dceffa" : C.grey, margin: 0 }}>{pr.desc}</p>
              </div>
            );
          })}
        </div>
        {siblingDiscounts.length > 0 && (
          <div className="as-reveal as-glass" style={{ maxWidth: 720, margin: "32px auto 0", borderRadius: 26, padding: "26px 28px" }}>
            <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 19, color: C.navy, display: "flex", alignItems: "center", gap: 10 }}><IconBadge name="users" box={36} size={19} radius={11} bg={C.lightBlue} color={C.navy} /> Zniżki dla rodzeństwa</div>
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
          <div className="as-reveal as-glass" style={{ maxWidth: 720, margin: "18px auto 0", borderRadius: 26, padding: "26px 28px" }}>
            <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 19, color: C.navy, display: "flex", alignItems: "center", gap: 10 }}><IconBadge name="tag" box={36} size={19} radius={11} bg="#fff" color={C.navy} /> Płatności</div>
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
        <div className="as-reveal as-bento">
          {visibleGallery.map((item, i) => (
            <button key={i} onClick={() => setLightbox({ items: galleryItems, index: showAllGallery ? i : (galleryOffset + i) % galleryItems.length })} className="as-bento-item" style={{ border: "4px solid rgba(255,255,255,0.85)", padding: 0, cursor: "pointer", borderRadius: 26, overflow: "hidden", position: "relative", boxShadow: "0 18px 40px rgba(15,91,143,0.16)", background: "#d3e7f5" }}>
              {item.url ? (
                item.kind === "video" ? (
                  <video src={item.url} muted loop autoPlay playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <CrossfadeImage url={item.url} alt={item.label} />
                )
              ) : (
                <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg,#d3e7f5,#d3e7f5 14px,#e8f4fb 14px,#e8f4fb 28px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "#7fa3bd", letterSpacing: "0.06em" }}>{item.label}</span>
                </div>
              )}
              {item.url && item.kind === "video" && (
                <span style={{ position: "absolute", left: 10, bottom: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(15,91,143,0.85)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 2 }}><Icon name="play" size={13} /></span>
              )}
              <span style={{ position: "absolute", right: 10, bottom: 10, width: 32, height: 32, borderRadius: "50%", background: "rgba(15,91,143,0.85)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="expand" size={16} stroke={2} /></span>
            </button>
          ))}
        </div>
      </section>

      {/* ============ OBOZY ============ */}
      <section id="obozy" className="as-mask-wave-both" style={{ position: "relative", marginTop: 72, background: "radial-gradient(70% 60% at 90% 10%, rgba(255,190,90,0.28), transparent 60%), radial-gradient(60% 50% at 0% 100%, rgba(108,180,224,0.3), transparent 60%), linear-gradient(170deg,#0f5b8f,#08304f)", color: "#fff", overflow: "hidden" }}>
        <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: "88px 22px 78px" }}>
          {/* Dekoracyjne ikony tła */}
          <div aria-hidden style={{ position: "absolute", top: 36, right: "5%", color: "rgba(255,210,122,0.13)", animation: "as-driftA 11s ease-in-out infinite", pointerEvents: "none" }}><Icon name="sun" size={118} stroke={1.3} /></div>
          <div aria-hidden style={{ position: "absolute", bottom: 70, left: "2%", color: "rgba(255,255,255,0.07)", animation: "as-driftB 13s ease-in-out infinite", pointerEvents: "none" }}><Icon name="waves" size={128} stroke={1.3} /></div>

          {campsOfferActive ? (
          <div className="as-reveal as-camp-layout" style={{ position: "relative", zIndex: 2 }}>
            {/* LEWA KOLUMNA — treść */}
            <div>
              <div className="font-fredoka" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(255,210,122,0.16)", border: "1px solid rgba(255,210,122,0.38)", borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 13.5, letterSpacing: "0.03em", color: "#ffd27a" }}>
                <Icon name="sun" size={17} /> {campsBadge}
              </div>
              <h2 className="font-fredoka" style={{ fontWeight: 700, fontSize: "clamp(34px,5.2vw,58px)", margin: "18px 0 0", lineHeight: 1.02, letterSpacing: "-0.015em" }}>{campsTitle}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "18px 0 0" }}>
                {campsParagraphs.map((p, i) => (
                  <p key={i} style={{ fontSize: 16.5, lineHeight: 1.65, color: "#cfe6f5", margin: 0 }}>{p}</p>
                ))}
              </div>

              {(campsDates || campsLocation || campsPrice) && (() => {
                const tiles = [
                  campsDates ? { icon: "calendar" as IconName, label: "Termin", value: campsDates, gold: false } : null,
                  campsLocation ? { icon: "mapPin" as IconName, label: "Miejsce", value: campsLocation, gold: false } : null,
                  campsPrice ? { icon: "tag" as IconName, label: "Cena", value: campsPrice, gold: true } : null,
                ].filter((x): x is { icon: IconName; label: string; value: string; gold: boolean } => x !== null);
                return (
                  <div className="as-camp-info" style={{ display: "grid", gap: 12, marginTop: 26 }}>
                    {tiles.map((t, i) => (
                      <div key={i} className="as-infotile" style={{ background: t.gold ? "rgba(255,210,122,0.14)" : "rgba(255,255,255,0.08)", border: `1px solid ${t.gold ? "rgba(255,210,122,0.4)" : "rgba(255,255,255,0.18)"}`, borderRadius: 16, padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, color: t.gold ? "#ffd27a" : "#9fd0ef", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}><Icon name={t.icon} size={15} /> {t.label}</div>
                        <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 16, color: t.gold ? "#ffd27a" : "#fff", marginTop: 7 }}>{t.value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28, alignItems: "center" }}>
                {campsOfferPdfUrl && (
                  <a href={campsOfferPdfUrl} target="_blank" rel="noreferrer" className="font-fredoka as-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 15, color: "#0f5b8f", background: "#ffd27a", borderRadius: 999, padding: "13px 26px", textDecoration: "none", boxShadow: "0 12px 26px rgba(0,0,0,0.3)" }}>
                    <Icon name="download" size={17} stroke={2} /> Pobierz ofertę (PDF)
                  </a>
                )}
                <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Obóz ALL SWIM${campsTitle ? ` — ${campsTitle}` : ""} — pytanie o wolne miejsca`)}`} className="font-fredoka as-btn-ghost as-arrow-link" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 15, color: "#fff", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 999, padding: "11px 24px", textDecoration: "none" }}>
                  Zapytaj o miejsce <Icon name="arrowRight" size={17} stroke={2} />
                </a>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 22, color: "#cfe6f5", fontSize: 14.5 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="phone" size={16} /> <ContactAction value={contactPhone} type="phone" triggerStyle={{ fontWeight: 700, fontSize: 15.5, color: "#fff" }} /></span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="mail" size={16} /> <ContactAction value={contactEmail} type="email" triggerStyle={{ fontWeight: 700, fontSize: 15.5, color: "#fff" }} /></span>
              </div>
            </div>

            {/* PRAWA KOLUMNA — plakat / zdjęcie / panel */}
            <div style={{ position: "relative" }}>
              {campsPosterUrl ? (
                <div style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={campsPosterUrl} alt="Plakat kolonii" onClick={() => setLightbox({ items: [{ url: campsPosterUrl, label: campsTitle }], index: 0 })} style={{ width: "100%", borderRadius: 22, border: "5px solid rgba(255,255,255,0.92)", boxShadow: "0 28px 60px rgba(0,0,0,0.42)", cursor: "pointer", display: "block", transform: "rotate(-1.4deg)" }} />
                  <span style={{ position: "absolute", right: 16, top: 16, width: 34, height: 34, borderRadius: "50%", background: "rgba(15,91,143,0.9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="expand" size={17} stroke={2} /></span>
                </div>
              ) : flagship[0]?.url ? (
                <button onClick={() => setLightbox({ items: campPhotoItems, index: 0 })} className="as-lift" style={{ display: "block", width: "100%", padding: 0, border: "5px solid rgba(255,255,255,0.92)", borderRadius: 22, overflow: "hidden", cursor: "pointer", boxShadow: "0 28px 60px rgba(0,0,0,0.42)", aspectRatio: "4/5", background: "#0a3f63" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flagship[0].url} alt={campsTitle} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ) : (
                <div style={{ position: "relative", width: "100%", aspectRatio: "4/5", borderRadius: 22, border: "2px solid rgba(255,255,255,0.22)", background: "linear-gradient(160deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "rgba(255,255,255,0.55)", textAlign: "center", padding: 24 }}>
                  <Icon name="sun" size={56} stroke={1.4} />
                  <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 17, color: "rgba(255,255,255,0.82)" }}>Plakat obozów wkrótce</div>
                </div>
              )}
            </div>
          </div>
          ) : (
          /* Brak aktualnej oferty: zapowiedź + kontakt; główną treścią są zdjęcia poniżej */
          <div className="as-reveal as-camp-empty" style={{ position: "relative", zIndex: 2 }}>
            <div>
              <div className="font-fredoka" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(255,210,122,0.16)", border: "1px solid rgba(255,210,122,0.38)", borderRadius: 999, padding: "8px 16px", fontWeight: 700, fontSize: 13.5, letterSpacing: "0.03em", color: "#ffd27a" }}>
                <Icon name="sun" size={17} /> Obozy i kolonie
              </div>
              <h2 className="font-fredoka" style={{ fontWeight: 700, fontSize: "clamp(34px,5.2vw,58px)", margin: "18px 0 0", lineHeight: 1.02, letterSpacing: "-0.015em" }}>{campsEmptyTitle}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "18px 0 0", maxWidth: 680 }}>
                {campsEmptyParagraphs.map((p, i) => (
                  <p key={i} style={{ fontSize: 17, lineHeight: 1.65, color: "#cfe6f5", margin: 0 }}>{p}</p>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 24, padding: "24px 24px 22px" }}>
              <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 20, color: "#fff" }}>Masz pytania o obozy?</div>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#cfe6f5", margin: "8px 0 16px" }}>Odpowiemy i damy znać, gdy ruszą zapisy.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "#cfe6f5" }}><Icon name="phone" size={17} color="#ffd27a" /> <ContactAction value={contactPhone} type="phone" triggerStyle={{ fontWeight: 600, fontSize: 16, color: "#fff" }} /></span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "#cfe6f5" }}><Icon name="mail" size={17} color="#ffd27a" /> <ContactAction value={contactEmail} type="email" triggerStyle={{ fontWeight: 600, fontSize: 16, color: "#fff" }} /></span>
              </div>
              <a href={`mailto:${contactEmail}?subject=${encodeURIComponent("Obozy ALL SWIM — pytanie")}`} className="font-fredoka as-btn-primary as-arrow-link" style={{ display: "inline-flex", alignItems: "center", gap: 9, marginTop: 18, fontWeight: 600, fontSize: 15, color: "#0f5b8f", background: "#ffd27a", borderRadius: 999, padding: "12px 24px", textDecoration: "none" }}>
                Napisz do nas <Icon name="arrowRight" size={17} stroke={2} />
              </a>
            </div>
          </div>
          )}

          {/* Zdjęcia z obozów */}
          <div className="as-reveal" style={{ position: "relative", zIndex: 2, marginTop: campsOfferActive ? 56 : 44 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 className="font-fredoka" style={{ fontWeight: 700, fontSize: "clamp(24px,3vw,32px)", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 12 }}><Icon name="heart" size={24} color="#ffd27a" /> {campsPhotosHeading}</h3>
              {campPhotoItems.length > 6 && (
                <button onClick={() => setShowAllCamps((v) => !v)} className="font-fredoka" style={{ fontWeight: 600, fontSize: 15, color: "#0f5b8f", background: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", cursor: "pointer" }}>
                  {showAllCamps ? "Pokaż mniej" : `Zobacz wszystkie (${campPhotoItems.length})`}
                </button>
              )}
            </div>
            <div className="as-bento as-bento-camps">
              {campVisible.map((item, i) => (
                <button key={i} onClick={() => { if (item.url) setLightbox({ items: campPhotoItems, index: showAllCamps ? i : (campsOffset + i) % campPhotoItems.length }); }} className="as-bento-item" style={{ border: "4px solid rgba(255,255,255,0.9)", padding: 0, cursor: item.url ? "pointer" : "default", borderRadius: 26, overflow: "hidden", position: "relative", boxShadow: "0 22px 48px rgba(0,0,0,0.35)", background: "#0a3f63" }}>
                  {item.url ? (
                    item.kind === "video" ? (
                      <video src={item.url} muted loop autoPlay playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <CrossfadeImage url={item.url} alt={item.label} />
                    )
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg,#1a6ca3,#1a6ca3 14px,#175f8f 14px,#175f8f 28px)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.25)" }}>
                      <Icon name="sun" size={30} stroke={1.5} />
                    </div>
                  )}
                  {item.url && item.kind === "video" && (
                    <span style={{ position: "absolute", left: 12, bottom: 12, width: 30, height: 30, borderRadius: "50%", background: "rgba(15,91,143,0.9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 2 }}><Icon name="play" size={13} /></span>
                  )}
                  {item.url && item.label && (
                    <span className="font-fredoka" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "26px 14px 12px", textAlign: "left", fontWeight: 700, fontSize: 14, color: "#fff", background: "linear-gradient(transparent, rgba(8,40,64,0.82))", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{item.label}</span>
                  )}
                  {item.url && <span style={{ position: "absolute", right: 12, top: 12, width: 32, height: 32, borderRadius: "50%", background: "rgba(15,91,143,0.9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="expand" size={16} stroke={2} /></span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ REGULAMIN ============ */}
      <section id="regulamin" style={{ maxWidth: 860, margin: "0 auto", padding: "64px 22px 20px" }}>
        <div className="as-reveal" style={{ textAlign: "center", marginBottom: 34 }}>
          <div className="font-fredoka" style={eyebrow}>{regulationsEyebrow}</div>
          <h2 className="font-fredoka" style={h2style}>{regulationsTitle}</h2>
          {(regulationsPdfUrl || contractPdfUrl) && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
              {regulationsPdfUrl && (
                <a href={regulationsPdfUrl} target="_blank" rel="noreferrer" className="font-fredoka as-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 15, color: "#fff", background: C.orange, borderRadius: 999, padding: "12px 24px", textDecoration: "none", boxShadow: "0 8px 18px rgba(233,161,59,0.32)" }}>
                  <Icon name="download" size={16} stroke={2} /> Pobierz regulamin (PDF)
                </a>
              )}
              {contractPdfUrl && (
                <a href={contractPdfUrl} target="_blank" rel="noreferrer" className="font-fredoka as-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 15, color: C.navy, background: "#fff", border: "2px solid #6cb4e0", borderRadius: 999, padding: "11px 24px", textDecoration: "none" }}>
                  <Icon name="download" size={16} stroke={2} /> Pobierz umowę (PDF)
                </a>
              )}
            </div>
          )}
        </div>
        <div className="as-reveal" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {regView.map((rg, i) => {
            const open = openReg === i;
            return (
              <div key={i} className="as-glass" style={{ borderRadius: 22, overflow: "hidden" }}>
                <button onClick={() => setOpenReg(open ? -1 : i)} className="font-fredoka" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontWeight: 600, fontSize: 17, color: "#1b3a4b" }}>
                  <span>{rg.title}</span>
                  <span style={{ flex: "none", width: 30, height: 30, borderRadius: "50%", background: C.lightBlue, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}><Icon name="chevronDown" size={16} stroke={2.2} /></span>
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
        <div className="as-form2">
          <div className="as-form2-photo" style={{ backgroundImage: formPhoto ? `linear-gradient(180deg, rgba(6,38,63,0.1) 0%, rgba(6,38,63,0.45) 40%, rgba(6,38,63,0.93) 100%), url("${formPhoto}")` : "linear-gradient(165deg,#45a6df 0%,#1c72b1 45%,#0b4677 100%)" }}>
            {naborActive && (
              <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "7px 14px", fontWeight: 600, fontSize: 13.5, color: "#fff", marginBottom: 18 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7ef0b5", display: "inline-block" }} /> Trwa nabór
              </span>
            )}
            <h2 className="font-fredoka" style={{ fontWeight: 600, fontSize: "clamp(28px,3.4vw,38px)", margin: 0, lineHeight: 1.08 }}>{formTitle}</h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.86)", margin: "12px 0 0" }}>{formSubtitle}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 24 }}>
              {formBenefits.map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: 11, fontSize: 15, lineHeight: 1.45, color: "#fff" }}>
                  <span style={{ color: "#7ef0b5", marginTop: 1 }}><Icon name="check" size={18} stroke={2.2} /></span> {t}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.2)", display: "flex", flexWrap: "wrap", gap: "8px 20px", fontSize: 14.5 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.86)" }}><Icon name="phone" size={16} /> <ContactAction value={contactPhone} type="phone" triggerStyle={{ fontWeight: 600, fontSize: 15, color: "#fff" }} /></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.86)" }}><Icon name="mail" size={16} /> <ContactAction value={contactEmail} type="email" triggerStyle={{ fontWeight: 600, fontSize: 15, color: "#fff" }} /></span>
            </div>
          </div>

          <div className="as-form2-body">
            {!sent ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="as-step"><span className="as-step-n">1</span><span className="as-step-t">O dziecku</span><span className="as-step-line" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)", gap: 12 }}>
                  <div>
                    <label className="as-form2-label" htmlFor="f-name">Imię i nazwisko dziecka</label>
                    <input id="f-name" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="np. Zosia Kowalska" className="as-form2-input" autoComplete="off" />
                  </div>
                  <div>
                    <label className="as-form2-label" htmlFor="f-age">Wiek</label>
                    <input id="f-age" value={fAge} onChange={(e) => setFAge(e.target.value)} placeholder="np. 7" className="as-form2-input" inputMode="numeric" />
                  </div>
                </div>
                <div>
                  <span className="as-form2-label">Poziom dziecka</span>
                  <div className="as-choice-grid" role="radiogroup" aria-label="Poziom dziecka">
                    {levelChoices.map((l) => {
                      const active = fLevel === l._id;
                      return (
                        <button key={l._id} type="button" role="radio" aria-checked={active} data-on={active} onClick={() => setFLevel(l._id)} className="as-choice">
                          <span className="as-choice-dot" /> {l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="as-form2-label">Czy dziecko kontynuuje zajęcia?</span>
                  <div className="as-seg" role="radiogroup" aria-label="Czy dziecko kontynuuje zajęcia?">
                    {CONT.map((c) => {
                      const active = fCont === c.k;
                      return (
                        <button key={c.k} type="button" role="radio" aria-checked={active} data-on={active} onClick={() => setFCont(c.k)}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="as-step" style={{ marginTop: 6 }}><span className="as-step-n">2</span><span className="as-step-t">Kontakt do rodzica</span><span className="as-step-line" /></div>
                <div className="as-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label className="as-form2-label" htmlFor="f-email">E-mail rodzica</label>
                    <input id="f-email" type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="np. rodzic@email.pl" className="as-form2-input" autoComplete="email" />
                  </div>
                  <div>
                    <label className="as-form2-label" htmlFor="f-phone">Telefon</label>
                    <input id="f-phone" type="tel" value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="np. 600 100 200" className="as-form2-input" autoComplete="tel" />
                  </div>
                </div>
                <div>
                  <label className="as-form2-label" htmlFor="f-note">Wiadomość / uwagi <small>(opcjonalnie)</small></label>
                  <textarea id="f-note" value={fNote} onChange={(e) => setFNote(e.target.value)} rows={3} placeholder="np. preferowane godziny, pytania, informacje o dziecku…" className="as-form2-input" />
                </div>
                {/* Honeypot — ukryte pole; ludzie go nie widzą, boty wypełniają */}
                <input value={fHp} onChange={(e) => setFHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
                <label className="as-check">
                  <input type="checkbox" checked={fConsent} onChange={(e) => { setFConsent(e.target.checked); setFormError(null); }} />
                  <span>
                    Wyrażam zgodę na przetwarzanie danych osobowych moich i dziecka w celu obsługi zgłoszenia, zgodnie z{" "}
                    <a href="/polityka-prywatnosci" target="_blank" rel="noreferrer" style={{ color: C.navy, fontWeight: 600 }}>polityką prywatności</a>.
                  </span>
                </label>
                {formError && (
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#b4232a", background: "#fdeeee", border: "1px solid #f6d3d3", borderRadius: 12, padding: "11px 14px" }}>{formError}</div>
                )}
                <button onClick={handleSubmit} disabled={submitting || !fConsent} className="as-submit">
                  {submitting ? "Wysyłanie…" : <>Wyślij zgłoszenie <Icon name="arrowRight" size={19} stroke={2} /></>}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 320, gap: 14 }}>
                <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#e8f7ee", color: "#1f8a5b", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={38} stroke={2.4} /></div>
                <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 26, color: C.navy }}>{formSuccessTitle}</div>
                <p style={{ fontSize: 16, color: C.grey, maxWidth: 320, lineHeight: 1.55 }}>{formSuccessText}</p>
                {!me && (
                  <p style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14, color: C.navy, background: "#e8f4fb", borderRadius: 12, padding: "12px 15px", maxWidth: 380, lineHeight: 1.5, textAlign: "left" }}>
                    <span style={{ color: C.orange, marginTop: 1 }}><Icon name="info" size={17} /></span>
                    <span>Załóż konto na <strong>ten sam e-mail</strong>, aby śledzić status zgłoszenia i grafik w „Moje konto".{" "}
                    <a href="/login" style={{ color: C.navy, fontWeight: 600 }}>Załóż konto →</a></span>
                  </p>
                )}
                <button onClick={() => { setSent(false); setFName(""); setFAge(""); setFEmail(""); setFPhone(""); setFNote(""); setFConsent(false); }} style={{ fontWeight: 600, fontSize: 15, color: C.navy, background: "#fff", border: "1.5px solid #c9dceb", borderRadius: 12, padding: "11px 22px", cursor: "pointer", marginTop: 6 }}>
                  Wyślij kolejne
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ STOPKA ============ */}
      <footer id="kontakt" className="as-mask-wave-top" style={{ position: "relative", marginTop: 80, background: "radial-gradient(60% 50% at 50% 0%, rgba(108,180,224,0.35), transparent 70%), linear-gradient(175deg,#0f5b8f,#06263f)", color: "#fff", overflow: "hidden" }}>
        {/* Wielki finałowy CTA */}
        <div className="as-cta-pad" style={{ position: "relative", maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <div aria-hidden style={{ position: "absolute", left: "4%", top: 90, color: "rgba(255,255,255,0.08)", animation: "as-driftA 12s ease-in-out infinite" }}><Icon name="waves" size={110} stroke={1.3} /></div>
          <div aria-hidden style={{ position: "absolute", right: "5%", top: 150, color: "rgba(255,210,122,0.14)", animation: "as-driftB 10s ease-in-out infinite" }}><Icon name="sparkle" size={80} /></div>
          <h2 className="font-fredoka as-cta-big" style={{ fontWeight: 700, margin: 0, position: "relative" }}>
            Gotowi na pierwszy<br /><span className="as-gradtext">skok do wody?</span>
          </h2>
          <p style={{ fontSize: "clamp(16px,2vw,19px)", lineHeight: 1.6, color: "#cfe6f5", maxWidth: 560, margin: "22px auto 0" }}>{formSubtitle}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 32 }}>
            <button onClick={() => go("nabor")} className="font-fredoka as-btn-primary-lg as-arrow-link" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 19, color: "#0a3f63", background: "#ffd27a", border: "none", borderRadius: 999, padding: "18px 36px", cursor: "pointer", boxShadow: "0 18px 40px rgba(255,190,90,0.35)" }}>
              Zapisz dziecko <Icon name="arrowRight" size={21} stroke={2.2} />
            </button>
            <span className="font-fredoka as-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 17, color: "#fff", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "14px 28px" }}>
              <Icon name="phone" size={19} /> <ContactAction value={contactPhone} type="phone" triggerStyle={{ color: "#fff", fontWeight: 700, fontSize: 17 }} />
            </span>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 1, background: "rgba(255,255,255,0.12)" }} />
        <div className="as-foot-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 22px 36px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 40 }}>
          <div className="as-foot-wide">
            <div style={{ background: "#fff", borderRadius: 18, padding: "12px 16px", display: "inline-flex" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ALL SWIM" style={{ height: 46, display: "block" }} />
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#cfe6f5", margin: "18px 0 0", maxWidth: 280 }}>{footerAbout}</p>
          </div>
          <div className="as-foot-wide">
            <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, color: "#ffd27a" }}>Kontakt</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 15, color: "#cfe6f5" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Icon name="mail" size={17} color="#ffd27a" /> <ContactAction value={contactEmail} type="email" triggerStyle={{ color: "#fff", fontWeight: 700, fontSize: 15 }} /></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Icon name="phone" size={17} color="#ffd27a" /> <ContactAction value={contactPhone} type="phone" triggerStyle={{ color: "#fff", fontWeight: 700, fontSize: 15 }} /></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Icon name="mapPin" size={17} color="#ffd27a" /> {contactAddress}</span>
            </div>
          </div>
          <div>
            <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, color: "#ffd27a" }}>Nawigacja</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 15 }}>
              {[{ l: "Grafik zajęć", h: "#grafik" }, { l: "Cennik", h: "#cennik" }, { l: "Galeria", h: "#galeria" }, { l: "Dokumenty", h: "#regulamin" }].map((x) => (
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
          <button onClick={() => setLightbox(null)} aria-label="Zamknij" style={{ position: "absolute", top: 22, right: 24, width: 48, height: 48, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={22} stroke={2.2} /></button>
          <button onClick={(e) => { e.stopPropagation(); setLightbox({ items: lightbox.items, index: (lightbox.index - 1 + lightbox.items.length) % lightbox.items.length }); }} aria-label="Poprzednie" style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", width: 52, height: 52, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="chevronLeft" size={24} stroke={2.2} /></button>
          <button onClick={(e) => { e.stopPropagation(); setLightbox({ items: lightbox.items, index: (lightbox.index + 1) % lightbox.items.length }); }} aria-label="Następne" style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", width: 52, height: 52, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="chevronRight" size={24} stroke={2.2} /></button>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(900px,92vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
            {lightbox.items[lightbox.index].url ? (
              lightbox.items[lightbox.index].kind === "video" ? (
                <video key={lightbox.items[lightbox.index].url} src={lightbox.items[lightbox.index].url!} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 18, boxShadow: "0 30px 70px rgba(0,0,0,0.5)", background: "#000" }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lightbox.items[lightbox.index].url!} alt={lightbox.items[lightbox.index].label} style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 18, boxShadow: "0 30px 70px rgba(0,0,0,0.5)", objectFit: "contain" }} />
              )
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

// Zdjęcie z płynnym przenikaniem: gdy url się zmienia, nowe pojawia się NA starym
// (cross-fade), bez pustego „mrugnięcia". Wypełnia rodzica (position: relative).
function CrossfadeImage({ url, alt }: { url: string | null; alt: string }) {
  const [shown, setShown] = useState<string | null>(url);
  const [incoming, setIncoming] = useState<string | null>(null);
  useEffect(() => {
    if (url === shown) return;
    setIncoming(url);
    const t = setTimeout(() => {
      setShown(url);
      setIncoming(null);
    }, 1150);
    return () => clearTimeout(t);
  }, [url, shown]);
  const base: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return (
    <>
      {shown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt={alt} style={base} />
      )}
      {incoming && incoming !== shown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={incoming} src={incoming} alt={alt} style={{ ...base, animation: "as-crossfade 1.1s ease forwards" }} />
      )}
    </>
  );
}

// Kolaż do 3 równych zdjęć, ułożonych pionowo i lekko nachodzących na siebie rogami.
function PhotoCollage({
  photos,
  onOpen,
  badge,
  placeholderIcon = "waves",
}: {
  photos: string[];
  onOpen?: (i: number) => void;
  badge?: string;
  placeholderIcon?: IconName;
}) {
  const ROT = [-4, 3.5, -2.5];
  const single = photos.length === 1;
  return (
    <div className="as-collage" data-n={Math.min(photos.length, 3)} style={{ position: "relative", width: "min(300px,90%)", display: "flex", flexDirection: "column", paddingBottom: badge ? 20 : 0 }}>
      {photos.length === 0 ? (
        <div style={{ width: "100%", aspectRatio: "4/5", borderRadius: 24, background: "repeating-linear-gradient(135deg,#dbecf8,#dbecf8 16px,#eaf4fb 16px,#eaf4fb 32px)", border: "1px solid #d6e7f2", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 36px rgba(15,91,143,0.1)" }}>
          <span style={{ color: "#8fbcd8", opacity: 0.7 }} aria-hidden><Icon name={placeholderIcon} size={56} stroke={1.5} /></span>
        </div>
      ) : (
        photos.slice(0, 3).map((url, i) => {
          const rot = single ? 0 : ROT[i];
          const align = single ? "center" : i % 2 === 0 ? "flex-start" : "flex-end";
          return (
            <button
              key={i}
              className="as-collage-item"
              onClick={() => onOpen?.(i)}
              style={{ alignSelf: align, width: single ? "92%" : "78%", marginTop: i === 0 ? 0 : -22, transform: `rotate(${rot}deg)`, zIndex: i + 1, border: "5px solid #fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 14px 30px rgba(15,91,143,0.22)", padding: 0, cursor: onOpen ? "pointer" : "default", background: "#eaf4fb", transition: "transform .2s", display: "block", lineHeight: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = `rotate(${rot}deg) scale(1.04)`; e.currentTarget.style.zIndex = "10"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = `rotate(${rot}deg)`; e.currentTarget.style.zIndex = String(i + 1); }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="ALL SWIM" style={{ width: "100%", height: "auto", objectFit: "contain", display: "block" }} />
            </button>
          );
        })
      )}
      {badge && (
        <div className="font-fredoka" style={{ position: "absolute", bottom: 0, right: 0, background: C.orange, color: "#fff", borderRadius: 16, padding: "10px 16px", boxShadow: "0 14px 30px rgba(233,161,59,0.35)", fontWeight: 600, fontSize: 14, zIndex: 11, display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="lifebuoy" size={16} /> {badge}</div>
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
