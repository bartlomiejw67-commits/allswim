"use client";

// Wspólne kontrolki edycji w panelu: przełącznik, zakładki sekcji, przyklejony pasek zapisu, pole formularza.
import { ReactNode, useEffect } from "react";
import { A, btnPrimary, btnGhost, input, label } from "./ui";
import { Icon } from "@/components/Icons";

// Duży, czytelny włącznik (zamiast małego checkboxa) — dla ważnych przełączników.
export function Switch({ checked, onChange, title, description, disabled }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", background: checked ? "#eef8f2" : "#f6f9fb", border: `1.5px solid ${checked ? "#bfe3cd" : A.line}`, borderRadius: 14, padding: "16px 18px" }}
    >
      <span aria-hidden style={{ position: "relative", width: 50, height: 28, borderRadius: 999, flex: "none", background: checked ? "#2fa36b" : "#c5d3dd", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 3, left: checked ? 25 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left .15s" }} />
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontWeight: 700, fontSize: 15.5, color: A.text }}>{title}</span>
        {description && <span style={{ display: "block", fontSize: 13.5, color: A.grey, marginTop: 3, lineHeight: 1.5 }}>{description}</span>}
      </span>
      <span className="adm-switch-state" style={{ fontSize: 13, fontWeight: 700, color: checked ? "#1f7a52" : A.grey, whiteSpace: "nowrap" }}>{checked ? "Włączony" : "Wyłączony"}</span>
    </button>
  );
}

// Zakładki sekcji w obrębie jednej strony panelu (przyklejone pod górnym paskiem).
export function SectionTabs<T extends string>({ tabs, value, onChange }: {
  tabs: { key: T; label: string; icon?: Parameters<typeof Icon>[0]["name"] }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ position: "sticky", top: 66, zIndex: 20, background: "rgba(242,246,250,0.92)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", padding: "8px 0 12px", marginBottom: 8 }}>
      <div role="tablist" style={{ display: "flex", gap: 4, overflowX: "auto", background: "#e7eef4", borderRadius: 12, padding: 4, width: "fit-content", maxWidth: "100%" }}>
        {tabs.map((t) => {
          const on = t.key === value;
          return (
            <button key={t.key} role="tab" aria-selected={on} type="button" onClick={() => onChange(t.key)} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", fontSize: 14, fontWeight: on ? 700 : 600, color: on ? A.navy : "#4d6371", background: on ? "#fff" : "transparent", boxShadow: on ? "0 2px 8px rgba(16,42,67,0.1)" : "none", borderRadius: 9, padding: "8px 14px" }}>
              {t.icon && <Icon name={t.icon} size={16} />} {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Przyklejony u dołu pasek zapisu: zawsze widać, czy są niezapisane zmiany, i można je zapisać bez przewijania.
// Ostrzega też przed opuszczeniem strony, gdy zmiany nie są zapisane.
export function SaveBar({ dirty, saving, saved, onSave, onReset }: {
  dirty: boolean;
  saving: boolean;
  saved?: boolean;
  onSave: () => void;
  onReset?: () => void;
}) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  return (
    <div style={{ position: "sticky", bottom: 16, zIndex: 25, marginTop: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: dirty ? "#0b3a5e" : "#fff", color: dirty ? "#fff" : A.grey, border: `1px solid ${dirty ? "#0b3a5e" : A.line}`, borderRadius: 14, padding: "12px 14px 12px 18px", boxShadow: dirty ? "0 16px 40px rgba(11,58,94,0.35)" : "0 8px 24px rgba(16,42,67,0.08)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 600, flex: "1 1 200px" }}>
        {dirty ? <><Icon name="alert" size={17} color="#ffd27a" /> Masz niezapisane zmiany</> : saved ? <><Icon name="check" size={17} color="#2fa36b" stroke={2.2} /> Zapisano</> : <><Icon name="check" size={17} stroke={2} /> Wszystko zapisane</>}
      </span>
      {dirty && onReset && (
        <button type="button" disabled={saving} onClick={onReset} style={{ ...btnGhost, background: "rgba(255,255,255,0.12)", color: "#fff" }}>Cofnij zmiany</button>
      )}
      <button type="button" disabled={!dirty || saving} onClick={onSave} style={{ ...btnPrimary, background: dirty ? A.orange : "#c9d6df" }}>
        {saving ? "Zapisywanie…" : "Zapisz zmiany"}
      </button>
    </div>
  );
}

// Pole formularza: etykieta + (opcjonalna) podpowiedź + input/textarea.
export function Fld({ label: text, hint, value, onChange, placeholder, rows, type }: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  type?: string;
}) {
  return (
    <div>
      <label style={label}>{text}{hint && <span style={{ fontWeight: 400, color: A.grey }}> — {hint}</span>}</label>
      {rows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={input} />
      )}
    </div>
  );
}

// Karta sekcji formularza z tytułem i krótkim opisem.
export function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ background: "#fff", borderRadius: 16, border: `1px solid ${A.line}`, boxShadow: "0 1px 2px rgba(16,42,67,0.04), 0 8px 24px rgba(16,42,67,0.05)", padding: 22 }}>
      <h2 style={{ fontSize: 18, color: A.navyDeep, margin: 0 }}>{title}</h2>
      {description && <p style={{ fontSize: 13.5, color: A.grey, margin: "4px 0 0", lineHeight: 1.5 }}>{description}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>{children}</div>
    </section>
  );
}

// Siatka 2 kolumn (na telefonie 1).
export function Grid2({ children }: { children: ReactNode }) {
  return <div className="adm-grid2">{children}</div>;
}
