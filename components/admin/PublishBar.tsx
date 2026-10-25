"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { A, btnAccent, btnGhost, btnSecondary } from "./ui";
import { Icon } from "@/components/Icons";

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
  const [notifyReserve, setNotifyReserve] = useState(true);
  const [notifyScheduleChanged, setNotifyScheduleChanged] = useState(true);
  const [notifyRemoved, setNotifyRemoved] = useState(true);

  const dirty = pending?.dirtyCount ?? 0;
  const assigned = pending?.assigned ?? [];
  const rejected = pending?.rejected ?? [];
  const reserved = pending?.reserved ?? [];
  const scheduleChanged = pending?.scheduleChanged ?? [];
  const removed = pending?.removed ?? [];

  async function doPublish(silent = false) {
    setBusy(true);
    try {
      const res = await publish({
        notifyAssigned: !silent && notifyAssigned && assigned.length > 0,
        notifyRejected: !silent && notifyRejected && rejected.length > 0,
        notifyReserve: !silent && notifyReserve && reserved.length > 0,
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          title={dirty > 0 ? "Zmiany naboru/grafiku czekają na publikację." : "Brak zmian do opublikowania."}
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: dirty > 0 ? "#8a5c00" : "#1f7a52", background: dirty > 0 ? "#fff4e0" : "#e9f6ef", border: `1px solid ${dirty > 0 ? "#f3dcae" : "#cfe9d9"}`, borderRadius: 999, padding: "7px 13px", whiteSpace: "nowrap" }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: dirty > 0 ? A.orange : "#2fa36b", display: "inline-block", flex: "none" }} />
<span className="adm-pub-text">{dirty > 0 ? `${dirty} ${dirty === 1 ? "zmiana" : dirty % 10 >= 2 && dirty % 10 <= 4 && (dirty % 100 < 12 || dirty % 100 > 14) ? "zmiany" : "zmian"} do publikacji` : "Wszystko opublikowane"}</span>
        </div>
        {dirty > 0 && (
          <button style={btnAccent} onClick={() => setOpen(true)}>
            <Icon name="send" size={16} /> Opublikuj
          </button>
        )}
      </div>

      {open && (
        <div onClick={() => !busy && setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(8,30,50,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(540px,100%)", background: "#fff", borderRadius: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.3)", padding: 28, maxHeight: "85vh", overflowY: "auto" }}>
            <h2 className="font-fredoka" style={{ fontSize: 23, color: A.navyDeep, margin: "0 0 6px" }}>Opublikować zmiany?</h2>
            <p style={{ fontSize: 14.5, color: A.grey, margin: "0 0 18px", lineHeight: 1.55 }}>
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
                checked={notifyReserve}
                disabled={reserved.length === 0}
                onChange={setNotifyReserve}
                title="Lista rezerwowa"
                items={reserved.map((r) => r.name)}
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
              <button style={btnAccent} disabled={busy} onClick={() => doPublish(false)}>{busy ? "Publikowanie…" : "Opublikuj i powiadom"}</button>
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
    <div style={{ border: `1px solid ${A.line}`, borderRadius: 12, padding: "12px 14px", opacity: disabled ? 0.5 : 1, background: disabled ? "#fafcfd" : "#fff" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: disabled ? "default" : "pointer" }}>
        <input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ width: 17, height: 17 }} />
        <span style={{ fontWeight: 600, fontSize: 14.5, color: A.text }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: A.navy, background: "#e8f4fb", borderRadius: 999, padding: "2px 10px" }}>{items.length}</span>
      </label>
      {items.length > 0 && (
        <div style={{ fontSize: 13, color: A.grey, marginTop: 8, display: "flex", flexDirection: "column", gap: 3, paddingLeft: 27 }}>
          {items.slice(0, 6).map((t, i) => <span key={i}>• {t}</span>)}
          {items.length > 6 && <span>…i {items.length - 6} więcej</span>}
        </div>
      )}
    </div>
  );
}
