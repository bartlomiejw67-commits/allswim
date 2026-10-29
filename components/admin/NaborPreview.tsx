"use client";

import { A } from "@/components/admin/ui";
import { Icon } from "@/components/Icons";

// Okienko naboru na stronie głównej: tryby, teksty domyślne i podgląd w panelu.
export type NaborMode = "hidden" | "soon" | "open";

export type NaborForm = {
  recruitmentMode: NaborMode;
  recruitmentTitle: string;
  recruitmentInfo: string;
  recruitmentSoonTitle: string;
  recruitmentSoonText: string;
};

export const DEF = {
  openTitle: "Trwa nabór!",
  openInfo: "Wolne miejsca w grupach początkujących i średnich · zapisy do 15 września",
  soonTitle: "Nabór wkrótce",
  soonText: "Zapisy na nowy sezon ruszą w wakacje. Zostaw e-mail — damy znać, gdy wystartujemy.",
  closedText: "Trwa sezon zajęć. Chcesz dołączyć w jego trakcie? Zadzwoń lub napisz — sprawdzimy wolne miejsca.",
};

export const MODES: { key: NaborMode; label: string; desc: string; color: string; bg: string }[] = [
  { key: "hidden", label: "Ukryte", desc: "Trwa sezon — okienka nie ma na stronie.", color: "#4d6371", bg: "#eef2f5" },
  { key: "soon", label: "Nabór wkrótce", desc: "Zapowiedź z Twoją treścią + „Powiadom mnie”. Formularz zamknięty.", color: "#b8771a", bg: "#fff4e0" },
  { key: "open", label: "Trwa nabór", desc: "Pomarańczowe okienko, formularz przyjmuje zgłoszenia.", color: "#1f8a5b", bg: "#e9f6ef" },
];

// Podgląd okienka tak, jak zobaczą je rodzice (uproszczony).
export function NaborPreview({ form }: { form: NaborForm }) {
  const box: React.CSSProperties = { borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" };
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: A.grey, marginBottom: 6 }}>Podgląd na stronie</div>
      {form.recruitmentMode === "hidden" ? (
        <div style={{ ...box, border: `1.5px dashed ${A.line}`, color: A.grey, fontSize: 14, justifyContent: "center" }}>Okienko ukryte — pod sekcją powitalną od razu zaczyna się „O mnie”.</div>
      ) : form.recruitmentMode === "open" ? (
        <div style={{ ...box, background: "linear-gradient(100deg,#e9a13b,#f2bd6a)" }}>
          <span style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,0.3)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="megaphone" size={22} /></span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 19, color: "#fff" }}>{form.recruitmentTitle || DEF.openTitle}</div>
            <div style={{ fontSize: 13.5, color: "#5a3a06", fontWeight: 700 }}>{form.recruitmentInfo || DEF.openInfo}</div>
          </div>
          <span className="font-fredoka" style={{ fontWeight: 600, fontSize: 14, color: A.navy, background: "#fff", borderRadius: 999, padding: "9px 18px" }}>Wypełnij zgłoszenie</span>
        </div>
      ) : (
        <div style={{ ...box, background: "#fff", border: `1px solid ${A.line}`, boxShadow: "0 8px 24px rgba(16,42,67,0.06)" }}>
          <span style={{ width: 42, height: 42, borderRadius: 13, background: "#fff1d9", color: "#e9a13b", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="calendar" size={21} /></span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 19, color: A.navy }}>{form.recruitmentSoonTitle || DEF.soonTitle}</div>
            <div style={{ fontSize: 13.5, color: A.grey, lineHeight: 1.45, whiteSpace: "pre-line" }}>{form.recruitmentSoonText || DEF.soonText}</div>
          </div>
          <span style={{ fontSize: 13, color: A.grey, border: `1.5px solid ${A.line}`, borderRadius: 999, padding: "7px 14px" }}>Twój e-mail</span>
          <span className="font-fredoka" style={{ fontWeight: 600, fontSize: 14, color: A.navy, border: "2px solid #6cb4e0", borderRadius: 999, padding: "7px 16px" }}>Powiadom mnie</span>
        </div>
      )}
    </div>
  );
}
