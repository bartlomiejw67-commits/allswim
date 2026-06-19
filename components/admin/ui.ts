import type { CSSProperties } from "react";

export const A = {
  navy: "#0f5b8f",
  blue: "#6cb4e0",
  orange: "#e9a13b",
  grey: "#5a6b75",
  bg: "#f4fafe",
  line: "#e3eef5",
};

export const card: CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  border: "1px solid #eaf2f8",
  boxShadow: "0 6px 18px rgba(15,91,143,0.06)",
  padding: 20,
};

export const input: CSSProperties = {
  width: "100%",
  fontSize: 14,
  padding: "10px 12px",
  borderRadius: 10,
  border: "2px solid #e3eef5",
  background: "#f8fcff",
  color: "#1b3a4b",
  fontFamily: "inherit",
};

export const label: CSSProperties = {
  display: "block",
  fontWeight: 800,
  fontSize: 12,
  color: "#1b3a4b",
  marginBottom: 6,
};

export const btnPrimary: CSSProperties = {
  fontWeight: 700,
  fontSize: 14,
  color: "#fff",
  background: A.orange,
  border: "none",
  borderRadius: 999,
  padding: "10px 18px",
  cursor: "pointer",
};

export const btnSecondary: CSSProperties = {
  fontWeight: 700,
  fontSize: 14,
  color: A.navy,
  background: "#fff",
  border: "2px solid #6cb4e0",
  borderRadius: 999,
  padding: "8px 16px",
  cursor: "pointer",
};

export const btnDanger: CSSProperties = {
  fontWeight: 700,
  fontSize: 13,
  color: "#b4232a",
  background: "#fdeaea",
  border: "none",
  borderRadius: 999,
  padding: "8px 14px",
  cursor: "pointer",
};

export const btnGhost: CSSProperties = {
  fontWeight: 700,
  fontSize: 13,
  color: A.grey,
  background: "#eef3f6",
  border: "none",
  borderRadius: 999,
  padding: "8px 14px",
  cursor: "pointer",
};

export const ADMIN_NAV: { href: string; label: string; icon: string }[] = [
  { href: "/admin", label: "Zgłoszenia naboru", icon: "📨" },
  { href: "/admin/uzytkownicy", label: "Użytkownicy", icon: "👤" },
  { href: "/admin/ustawienia", label: "Ustawienia i nabór", icon: "⚙️" },
  { href: "/admin/baseny", label: "Baseny", icon: "🏊" },
  { href: "/admin/poziomy", label: "Poziomy i grupy", icon: "📊" },
  { href: "/admin/grafik-tygodniowy", label: "Grafik", icon: "🗓️" },
  { href: "/admin/cennik", label: "Cennik", icon: "💳" },
  { href: "/admin/regulamin", label: "Regulamin", icon: "📜" },
  { href: "/admin/obozy", label: "Obozy", icon: "☀️" },
  { href: "/admin/galeria", label: "Galeria", icon: "🖼️" },
];
