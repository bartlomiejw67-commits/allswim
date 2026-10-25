"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, btnSecondary, btnGhost, pageTitle, pageDesc, MAIL_KIND, MAIL_STATUS } from "@/components/admin/ui";
import { Icon } from "@/components/Icons";
import Hint from "@/components/admin/Hint";

// Rejestr maili ze skrzynki nadawczej: status każdego maila + ponawianie nieudanych.
export default function Maile() {
  const [filter, setFilter] = useState<"all" | "failed" | "queued" | "sent">("all");
  const [q, setQ] = useState("");
  const rows = useQuery(api.outbox.list, filter === "all" ? {} : { status: filter });
  const stats = useQuery(api.outbox.stats);
  const retry = useMutation(api.outbox.retry);
  const retryAll = useMutation(api.outbox.retryAllFailed);

  const shown = (rows ?? []).filter((r) => !q.trim() || `${r.to} ${r.childName ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div style={{ maxWidth: 960 }}>
      <h1 className="font-fredoka" style={pageTitle}>Wiadomości e-mail</h1>
      <p style={pageDesc}>Każdy mail wysyłany przez stronę jest tu zapisany. Gdy Resend chwilowo odrzuci wysyłkę, system sam ponawia próbę. Nieudane możesz ponowić ręcznie.</p>

      <Hint id="maile">
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
          <li><strong>W kolejce</strong> — mail czeka na wysyłkę (wychodzą po kolei, ok. 1 na sekundę). <strong>Wysłany</strong> — przyjęty przez serwer pocztowy.</li>
          <li><strong>Nieudany</strong> — najczęściej literówka w adresie rodzica albo chwilowy błąd serwera. Kliknij „Ponów”; gdy znów się nie uda, zadzwoń do rodzica i potwierdź adres.</li>
          <li>Status ostatniego maila widać też na karcie dziecka w zakładce Zgłoszenia.</li>
        </ul>
      </Hint>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          { l: "Wysłane (24 h)", v: stats?.sentLast24h, c: "#1f7a52" },
          { l: "W kolejce", v: stats?.queued, c: "#8a5c00" },
          { l: "Nieudane", v: stats?.failed, c: "#b4232a" },
        ].map((s) => (
          <div key={s.l} style={{ ...card, padding: "12px 16px", minWidth: 150 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.c }}>{s.v ?? "…"}</div>
            <div style={{ fontSize: 13, color: A.grey }}>{s.l}</div>
          </div>
        ))}
        {!!stats?.failed && (
          <button style={{ ...btnSecondary, alignSelf: "center" }} onClick={async () => { const n = await retryAll({}); alert(`Ponowiono: ${n}`); }}>
            <Icon name="undo" size={15} /> Ponów wszystkie nieudane
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        {(["all", "failed", "queued", "sent"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...btnGhost, ...(filter === f ? { background: A.navy, color: "#fff" } : {}) }}>
            {f === "all" ? "Wszystkie" : MAIL_STATUS[f].label}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj: e-mail lub imię dziecka" style={{ flex: "1 1 220px", fontSize: 14.5, padding: "9px 12px", borderRadius: 10, border: "1.5px solid #d6e2ea", fontFamily: "inherit" }} />
      </div>

      {rows === undefined ? <p style={{ color: A.grey }}>Ładowanie…</p> : shown.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: A.grey }}>Brak maili w tej kategorii.</div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {shown.map((r, i) => {
            const st = MAIL_STATUS[r.status];
            return (
              <div key={r._id} style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center", padding: "12px 16px", borderTop: i ? `1px solid ${A.line}` : "none" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 999, padding: "3px 10px" }}>{st.label}</span>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{MAIL_KIND[r.kind] ?? r.kind}{r.childName ? ` · ${r.childName}` : ""}</div>
                  <div style={{ fontSize: 13, color: A.grey, overflowWrap: "anywhere" }}>{r.to} · {new Date(r.sentAt ?? r._creationTime).toLocaleString("pl-PL")}{r.attempts > 1 ? ` · prób: ${r.attempts}` : ""}</div>
                  {r.lastError && r.status !== "sent" && <div style={{ fontSize: 12.5, color: "#b4232a", marginTop: 2 }}>{r.lastError}</div>}
                </div>
                {r.status !== "sent" && (
                  <button style={btnGhost} onClick={() => retry({ id: r._id as Id<"emailOutbox"> })}><Icon name="undo" size={14} /> Ponów</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
