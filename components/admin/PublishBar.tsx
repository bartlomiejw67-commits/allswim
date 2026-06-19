"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { A, btnPrimary, btnGhost, btnSecondary } from "./ui";

// Globalny pasek publikacji zmian (nabór + grafik). Widoczny na każdej stronie panelu.
// Zmiany wprowadzane w panelu są "robocze" — wchodzą w życie dla rodziców i wysyłają
// maile dopiero po kliknięciu "Opublikuj zmiany" i potwierdzeniu w okienku.
export default function PublishBar() {
  const pending = useQuery(api.publish.pendingChanges);
  const publish = useMutation(api.publish.publish);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notifyAssigned, setNotifyAssigned] = useState(true);
  const [notifyRejected, setNotifyRejected] = useState(true);
  const [notifyScheduleChanged, setNotifyScheduleChanged] = useState(true);
  const [notifyRemoved, setNotifyRemoved] = useState(true);

  const dirty = pending?.dirtyCount ?? 0;
  const assigned = pending?.assigned ?? [];
  const rejected = pending?.rejected ?? [];
  const scheduleChanged = pending?.scheduleChanged ?? [];
  const removed = pending?.removed ?? [];

  async function doPublish(silent = false) {
    setBusy(true);
    try {
      const res = await publish({
        notifyAssigned: !silent && notifyAssigned && assigned.length > 0,
        notifyRejected: !silent && notifyRejected && rejected.length > 0,
        notifyScheduleChanged: !silent && notifyScheduleChanged && scheduleChanged.length > 0,
        notifyRemoved: !silent && notifyRemoved && removed.length > 0,
      });
      setOpen(false);
      alert(`Opublikowano. Zaktualizowano: ${res.publishedCount}, wysłano powiadomień: ${res.mailsQueued}.`);
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się opublikować.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: dirty > 0 ? "#fff7ec" : "#f1f8f3", border: `1px solid ${dirty > 0 ? "#f0dca6" : "#cfe9d6"}`, borderRadius: 14, padding: "10px 16px", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{dirty > 0 ? "📝" : "✅"}</span>
          <div>
            <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 14, color: dirty > 0 ? "#9a6a00" : "#1f8a5b" }}>
              {dirty > 0 ? `${dirty} niezapublikowanych zmian` : "Wszystko opublikowane"}
            </div>
            <div style={{ fontSize: 12, color: A.grey }}>
              {dirty > 0 ? "Zmiany naboru/grafiku czekają na publikację." : "Brak zmian do opublikowania."}
            </div>
          </div>
        </div>
        <button
          style={dirty > 0 ? btnPrimary : { ...btnGhost, cursor: "default" }}
          disabled={dirty === 0}
          onClick={() => setOpen(true)}
        >
          Opublikuj zmiany
        </button>
      </div>

      {open && (
        <div onClick={() => !busy && setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(10,63,99,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px,100%)", background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", padding: 26, maxHeight: "85vh", overflowY: "auto" }}>
            <h2 className="font-fredoka" style={{ fontSize: 22, color: A.navy, margin: "0 0 6px" }}>Opublikować zmiany?</h2>
            <p style={{ fontSize: 14, color: A.grey, margin: "0 0 18px" }}>
              Zmiany staną się widoczne dla rodziców. Zaznacz, o czym powiadomić mailem (powiadomienia idą tylko za realne zmiany).
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <NotifyRow
                checked={notifyAssigned}
                disabled={assigned.length === 0}
                onChange={setNotifyAssigned}
                title="Nowe przydziały do grup"
                items={assigned.map((a) => `${a.name} → ${a.groupName}${a.poolName ? ` · ${a.poolName}` : ""}`)}
              />
              <NotifyRow
                checked={notifyRejected}
                disabled={rejected.length === 0}
                onChange={setNotifyRejected}
                title="Odrzucenia"
                items={rejected.map((r) => r.name)}
              />
              <NotifyRow
                checked={notifyScheduleChanged}
                disabled={scheduleChanged.length === 0}
                onChange={setNotifyScheduleChanged}
                title="Zmiany grupy / godzin"
                items={scheduleChanged.map((s) => `${s.name} → ${s.groupName}${s.poolName ? ` · ${s.poolName}` : ""}`)}
              />
              <NotifyRow
                checked={notifyRemoved}
                disabled={removed.length === 0}
                onChange={setNotifyRemoved}
                title="Wypisania z grupy"
                items={removed.map((r) => r.name)}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button style={btnGhost} disabled={busy} onClick={() => setOpen(false)}>Anuluj</button>
              <button style={btnSecondary} disabled={busy} onClick={() => doPublish(true)}>{busy ? "…" : "Opublikuj bez maili"}</button>
              <button style={btnPrimary} disabled={busy} onClick={() => doPublish(false)}>{busy ? "Publikowanie…" : "Opublikuj i powiadom"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NotifyRow({ checked, disabled, onChange, title, items }: {
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  title: string;
  items: string[];
}) {
  return (
    <div style={{ border: "1px solid #eaf2f8", borderRadius: 12, padding: "12px 14px", opacity: disabled ? 0.55 : 1 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: disabled ? "default" : "pointer" }}>
        <input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ width: 16, height: 16 }} />
        <span style={{ fontWeight: 800, fontSize: 14, color: "#1b3a4b" }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: A.navy, background: "#e8f4fb", borderRadius: 999, padding: "2px 10px" }}>{items.length}</span>
      </label>
      {items.length > 0 && (
        <div style={{ fontSize: 12, color: A.grey, marginTop: 8, display: "flex", flexDirection: "column", gap: 3, paddingLeft: 26 }}>
          {items.slice(0, 6).map((t, i) => <span key={i}>• {t}</span>)}
          {items.length > 6 && <span>…i {items.length - 6} więcej</span>}
        </div>
      )}
    </div>
  );
}
