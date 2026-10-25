import type { CSSProperties } from "react";
import type { IconName } from "@/components/Icons";

// System wyglądu panelu administratora (wspólny dla wszystkich zakładek).
// Spokojny, „aplikacyjny" styl: białe karty na jasnym tle, czytelne pola, przyciski z małym zaokrągleniem.
// Interakcje (focus, hover, disabled) są w globals.css pod klasą .adm.

export const A = {
  navy: "#0f5b8f",
  navyDeep: "#0b3a5e",
  blue: "#6cb4e0",
  orange: "#e9a13b",
  grey: "#5f7380",
  bg: "#f2f6fa",
  line: "#e3ebf1",
  text: "#1b3a4b",
};

export const card: CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: `1px solid ${A.line}`,
  boxShadow: "0 1px 2px rgba(16,42,67,0.04), 0 8px 24px rgba(16,42,67,0.05)",
  padding: 22,
};

export const input: CSSProperties = {
  width: "100%",
  fontSize: 14.5,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid #d6e2ea",
  background: "#fff",
  color: A.text,
  fontFamily: "inherit",
};

export const label: CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: 13,
  color: "#3e5361",
  marginBottom: 6,
};

const btnBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  fontWeight: 600,
  fontSize: 14,
  lineHeight: 1.2,
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

// Główna akcja (zapis, akceptacja).
export const btnPrimary: CSSProperties = { ...btnBase, color: "#fff", background: A.navy, border: "1.5px solid transparent" };

// Akcja wyróżniona (publikacja zmian).
export const btnAccent: CSSProperties = { ...btnBase, color: "#fff", background: A.orange, border: "1.5px solid transparent" };

// Akcja drugorzędna.
export const btnSecondary: CSSProperties = { ...btnBase, color: A.navy, background: "#fff", border: "1.5px solid #cfdde8" };

// Akcja usuwająca.
export const btnDanger: CSSProperties = { ...btnBase, fontSize: 13.5, color: "#b4232a", background: "#fdecec", border: "1.5px solid transparent" };

// Akcja neutralna / zakładki.
export const btnGhost: CSSProperties = { ...btnBase, fontSize: 13.5, color: "#3e5361", background: "#eef3f7", border: "1.5px solid transparent" };

// Nagłówek i opis zakładki.
export const pageTitle: CSSProperties = { fontSize: 27, fontWeight: 700, color: A.navyDeep, margin: "0 0 6px", letterSpacing: "-0.01em", lineHeight: 1.15 };
export const pageDesc: CSSProperties = { color: A.grey, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 780 };

// Rodzaje maili ze skrzynki nadawczej (convex/outbox.ts) — nazwy do wyświetlania.
export const MAIL_KIND: Record<string, string> = {
  received: "Potwierdzenie zgłoszenia",
  adminNew: "Powiadomienie dla admina",
  accepted: "Zgłoszenie zaakceptowane",
  assigned: "Przyjęcie do grupy",
  reserve: "Lista rezerwowa",
  rejected: "Odrzucenie",
  scheduleChanged: "Zmiana grafiku",
  removed: "Wycofanie przydziału",
  waitlistOpened: "Nabór otwarty",
};

export const MAIL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  sent: { label: "Wysłany", color: "#1f7a52", bg: "#e5f5ec" },
  queued: { label: "W kolejce", color: "#8a5c00", bg: "#fff4e0" },
  failed: { label: "Nieudany", color: "#b4232a", bg: "#fdecec" },
};

// Nawigacja panelu — pogrupowana tematycznie.
export const ADMIN_NAV: { href: string; label: string; icon: IconName; group: string }[] = [
  { href: "/admin", label: "Zgłoszenia naboru", icon: "inbox", group: "Na bieżąco" },
  { href: "/admin/grafik-tygodniowy", label: "Grafik", icon: "calendar", group: "Na bieżąco" },
  { href: "/admin/platnosci", label: "Płatności", icon: "wallet", group: "Na bieżąco" },
  { href: "/admin/maile", label: "Wiadomości e-mail", icon: "mail", group: "Na bieżąco" },
  { href: "/admin/poziomy", label: "Poziomy i grupy", icon: "layers", group: "Zajęcia" },
  { href: "/admin/baseny", label: "Baseny", icon: "waves", group: "Zajęcia" },
  { href: "/admin/cennik", label: "Cennik", icon: "tag", group: "Zajęcia" },
  { href: "/admin/ustawienia", label: "Ustawienia i nabór", icon: "gear", group: "Treści strony" },
  { href: "/admin/obozy", label: "Obozy", icon: "sun", group: "Treści strony" },
  { href: "/admin/galeria", label: "Galeria", icon: "image", group: "Treści strony" },
  { href: "/admin/instruktorzy", label: "Instruktorzy", icon: "whistle", group: "Treści strony" },
  { href: "/admin/regulamin", label: "Dokumenty", icon: "fileText", group: "Treści strony" },
  { href: "/admin/uzytkownicy", label: "Użytkownicy", icon: "users", group: "Konta" },
];
