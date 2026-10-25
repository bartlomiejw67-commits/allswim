"use client";

import { useEffect, useState, type ReactNode } from "react";
import { A } from "@/components/admin/ui";
import { Icon } from "@/components/Icons";

// Zwijana ramka „Jak to działa?" — krótka instrukcja dla osoby obsługującej panel.
// Stan rozwinięcia zapamiętany w przeglądarce (osobno dla każdej strony).
export default function Hint({ id, title = "Jak to działa?", children }: { id: string; title?: string; children: ReactNode }) {
  const key = `hint:${id}`;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      setOpen(v === null ? true : v === "1"); // przy pierwszej wizycie rozwinięte
    } catch {
      setOpen(true);
    }
  }, [key]);
  function toggle() {
    setOpen((o) => {
      try { localStorage.setItem(key, o ? "0" : "1"); } catch {}
      return !o;
    });
  }
  return (
    <div style={{ background: "#f2f8fc", border: "1px solid #d6e7f2", borderRadius: 12, marginBottom: 20, maxWidth: 820 }}>
      <button onClick={toggle} aria-expanded={open} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: A.navy, padding: "11px 14px", textAlign: "left" }}>
        <Icon name="info" size={17} />
        <span style={{ flex: 1 }}>{title}</span>
        <span style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}><Icon name="chevronDown" size={16} /></span>
      </button>
      {open && <div className="admin-hint" style={{ padding: "0 16px 14px 40px", fontSize: 13.8, lineHeight: 1.6, color: "#33495a" }}>{children}</div>}
    </div>
  );
}
