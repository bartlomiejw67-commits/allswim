"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { A, card, input, label, btnPrimary, btnAccent, btnGhost, btnSecondary, pageTitle, pageDesc } from "@/components/admin/ui";
import { Icon } from "@/components/Icons";

// Płatności miesięczne rodzin: status TAK/NIE, data i kwota wpłaty (bez numerów kont),
// eksport do Excela i przypomnienia z potwierdzeniem.

const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const labelOf = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MONTHS[mm - 1]} ${y}`; };
const shift = (m: string, by: number) => { const [y, mm] = m.split("-").map(Number); return ym(new Date(y, mm - 1 + by, 1)); };
const zl = (gr: number) => `${(gr / 100).toLocaleString("pl-PL", { minimumFractionDigits: gr % 100 ? 2 : 0, maximumFractionDigits: 2 })} zł`;
const dmy = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; };

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "TAK", color: "#1f7a52", bg: "#e5f5ec" },
  partial: { label: "CZĘŚCIOWO", color: "#8a5c00", bg: "#fff1d6" },
  unpaid: { label: "NIE", color: "#b4232a", bg: "#fdecec" },
  cash: { label: "GOTÓWKA", color: "#1d5f8f", bg: "#e6f1fa" },
  exempt: { label: "ZWOLNIONY", color: "#5f7380", bg: "#eef2f5" },
};

type Filter = "all" | "unpaid" | "paid";

export default function Platnosci() {
  const [month, setMonth] = useState(() => ym(new Date()));
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCfg, setShowCfg] = useState(false);

  const data = useQuery(api.payments.month, { month });
  const setOverride = useMutation(api.payments.setOverride);
  const sendReminders = useMutation(api.payments.sendReminders);
  const setConfig = useMutation(api.payments.setConfig);

  const rows = data?.rows ?? [];
  const remindable = (r: (typeof rows)[number]) => r.inRoster && (r.status === "unpaid" || r.status === "partial");
  const counts = useMemo(() => ({
    paid: rows.filter((r) => r.status === "paid").length,
    partial: rows.filter((r) => r.status === "partial").length,
    unpaid: rows.filter((r) => r.status === "unpaid" && r.inRoster).length,
    other: rows.filter((r) => r.status === "cash" || r.status === "exempt").length,
    sumPaid: rows.reduce((s, r) => s + r.paid, 0),
    sumExpected: rows.filter((r) => r.status !== "exempt").reduce((s, r) => s + r.expected, 0),
  }), [rows]);

  const shown = rows.filter((r) => {
    if (filter === "unpaid" && !remindable(r)) return false;
    if (filter === "paid" && remindable(r)) return false;
    const hay = `${r.children.join(" ")} ${r.email}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });

  const selectedRows = rows.filter((r) => sel.has(r.family) && remindable(r));
  const canRemind = !!data?.lastImport;

  function changeMonth(m: string) { setMonth(m); setSel(new Set()); }
  function toggle(family: string) { setSel((s) => { const n = new Set(s); if (n.has(family)) n.delete(family); else n.add(family); return n; }); }
  function selectAllUnpaid() { setSel(new Set(rows.filter((r) => remindable(r) && !r.reminderSentAt).map((r) => r.family))); }

  function exportExcel() {
    const head = ["Dzieci", "E-mail rodzica", "Należne (zł)", "Wpłacono (zł)", "Data przelewu", "Zapłacone", "Przypomnienie wysłane", "Uwagi"];
    const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = rows.map((r) => [
      r.children.join(", ") || "(poza grupami)",
      r.email,
      (r.expected / 100).toFixed(2).replace(".", ","),
      (r.paid / 100).toFixed(2).replace(".", ","),
      r.transfers.map((t) => dmy(t.date)).join(", "),
      STATUS[r.status].label,
      r.reminderSentAt ? new Date(r.reminderSentAt).toLocaleDateString("pl-PL") : "",
      r.note ?? "",
    ].map((x) => esc(String(x))).join(";"));
    const csv = "﻿" + [head.join(";"), ...lines].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `platnosci-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function doSend() {
    setBusy(true);
    try {
      const res = await sendReminders({ month, families: selectedRows.map((r) => r.family) });
      setConfirm(false);
      setSel(new Set());
      alert(`Wysłano przypomnień: ${res.sent}.${res.skipped.length ? `\nPominięto: ${res.skipped.length}\n- ${res.skipped.join("\n- ")}` : ""}\nStatus maili: zakładka „Wiadomości e-mail”.`);
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się wysłać przypomnień.");
    } finally {
      setBusy(false);
    }
  }

  const options = Array.from({ length: 14 }, (_, i) => shift(ym(new Date()), 1 - i));

  return (
    <div style={{ maxWidth: 1060 }}>
      <h1 className="font-fredoka" style={pageTitle}>Płatności</h1>
      <p style={pageDesc}>Kto zapłacił za wybrany miesiąc: status, data przelewu i kwota. Dane pochodzą z rozliczonego wyciągu bankowego (bez numerów kont i tytułów przelewów). Przypomnienia wysyłasz sam — po zaznaczeniu i potwierdzeniu.</p>

      {/* Wybór miesiąca */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button style={{ ...btnGhost, padding: "9px 11px" }} onClick={() => changeMonth(shift(month, -1))} aria-label="Poprzedni miesiąc"><Icon name="chevronLeft" size={17} stroke={2.2} /></button>
        <select value={month} onChange={(e) => changeMonth(e.target.value)} style={{ ...input, width: "auto", fontWeight: 700, fontSize: 16, color: A.navyDeep, padding: "9px 12px" }}>
          {!options.includes(month) && <option value={month}>{labelOf(month)}</option>}
          {options.map((m) => <option key={m} value={m}>{labelOf(m)}</option>)}
        </select>
        <button style={{ ...btnGhost, padding: "9px 11px" }} onClick={() => changeMonth(shift(month, 1))} aria-label="Następny miesiąc"><Icon name="chevronRight" size={17} stroke={2.2} /></button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btnSecondary} onClick={exportExcel} disabled={!rows.length}><Icon name="download" size={16} /> Pobierz Excel</button>
        </div>
      </div>

      {/* Stan danych */}
      {data && (data.lastImport ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#1f6b47", background: "#e9f6ef", border: "1px solid #cfe9d9", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
          <Icon name="check" size={16} stroke={2.2} /> Wyciąg rozliczony do <strong>{dmy(data.lastImport.coveredUntil)}</strong>. Wpłaty późniejsze pojawią się po kolejnym rozliczeniu.
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "#8a5c00", background: "#fff4e0", border: "1px solid #f3dcae", borderRadius: 12, padding: "10px 14px", marginBottom: 14, lineHeight: 1.5 }}>
          <span style={{ marginTop: 2 }}><Icon name="alert" size={16} /></span>
          <span>Za {labelOf(month).toLowerCase()} nie ma jeszcze rozliczonego wyciągu — statusy „NIE” są tylko wstępne, a <strong>przypomnienia są zablokowane</strong>. Wyślij mi wyciąg CSV na czacie, rozliczę go i dane pojawią się tutaj.</span>
        </div>
      ))}

      {/* Podsumowanie */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { l: "Zapłacone", v: counts.paid, c: "#1f7a52" },
          { l: "Częściowo", v: counts.partial, c: "#8a5c00" },
          { l: "Brak wpłaty", v: counts.unpaid, c: "#b4232a" },
          { l: "Gotówka / zwolnieni", v: counts.other, c: "#5f7380" },
        ].map((s) => (
          <div key={s.l} style={{ ...card, padding: "12px 16px", minWidth: 140, flex: "1 1 140px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.c }}>{data ? s.v : "…"}</div>
            <div style={{ fontSize: 13, color: A.grey }}>{s.l}</div>
          </div>
        ))}
        <div style={{ ...card, padding: "12px 16px", minWidth: 200, flex: "1 1 200px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: A.navyDeep }}>{data ? `${zl(counts.sumPaid)} / ${zl(counts.sumExpected)}` : "…"}</div>
          <div style={{ fontSize: 13, color: A.grey }}>wpłacono / należne</div>
        </div>
      </div>

      {/* Filtry i przypomnienia */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div role="tablist" style={{ display: "inline-flex", gap: 4, background: "#e7eef4", borderRadius: 12, padding: 4 }}>
          {([["all", "Wszyscy"], ["unpaid", "Nie zapłacili"], ["paid", "Zapłacili"]] as [Filter, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: filter === k ? 700 : 600, color: filter === k ? A.navy : "#4d6371", background: filter === k ? "#fff" : "transparent", boxShadow: filter === k ? "0 2px 8px rgba(16,42,67,0.1)" : "none", borderRadius: 9, padding: "8px 14px" }}>{l}</button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj: dziecko lub e-mail" style={{ ...input, flex: "1 1 200px", width: "auto", padding: "9px 12px" }} />
        <button style={btnGhost} onClick={selectAllUnpaid} disabled={!canRemind}>Zaznacz wszystkich bez wpłaty</button>
        <button style={btnAccent} disabled={!canRemind || selectedRows.length === 0} onClick={() => setConfirm(true)}>
          <Icon name="send" size={16} /> Wyślij przypomnienie ({selectedRows.length})
        </button>
      </div>

      {/* Lista */}
      {data === undefined ? <p style={{ color: A.grey }}>Ładowanie…</p> : shown.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: A.grey }}>Brak pozycji.</div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div className="pay-row pay-head">
            <span /><span>Rodzina</span><span>Należne</span><span>Wpłata</span><span>Zapłacone</span><span />
          </div>
          {shown.map((r) => {
            const st = STATUS[r.status];
            const can = remindable(r);
            return (
              <div key={r.family} className="pay-row" style={{ borderTop: `1px solid ${A.line}`, background: sel.has(r.family) && can ? "#fffaf0" : undefined }}>
                <span>
                  {can && <input type="checkbox" aria-label={`Zaznacz ${r.children.join(", ")}`} checked={sel.has(r.family)} disabled={!canRemind} onChange={() => toggle(r.family)} style={{ width: 17, height: 17 }} />}
                </span>
                <div className="pay-main" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: A.navyDeep }}>{r.children.length ? r.children.join(", ") : "(poza grupami)"}</div>
                  <div style={{ fontSize: 13, color: A.grey, overflowWrap: "anywhere" }}>{r.email}{r.children.length > 1 ? ` · ${r.children.length} dzieci` : ""}</div>
                  {r.reminderSentAt && <div style={{ fontSize: 12.5, color: "#8a5c00", marginTop: 2 }}>Przypomnienie wysłane {new Date(r.reminderSentAt).toLocaleDateString("pl-PL")}</div>}
                  {r.note && <div style={{ fontSize: 12.5, color: A.grey, marginTop: 2 }}>{r.note}</div>}
                </div>
                <div className="pay-cell"><span className="pay-lbl">Należne</span><span style={{ fontWeight: 600 }}>{zl(r.expected)}</span></div>
                <div className="pay-cell">
                  <span className="pay-lbl">Wpłata</span>
                  {r.transfers.length ? (
                    r.transfers.map((t, i) => <div key={i} style={{ fontSize: 14 }}><strong>{zl(t.amount)}</strong> <span style={{ color: A.grey }}>· {dmy(t.date)}</span></div>)
                  ) : <span style={{ color: "#9aabb5" }}>—</span>}
                </div>
                <div className="pay-cell">
                  <span className="pay-lbl">Zapłacone</span>
                  <span style={{ display: "inline-block", fontSize: 12.5, fontWeight: 800, letterSpacing: "0.03em", color: st.color, background: st.bg, borderRadius: 999, padding: "4px 11px" }}>{st.label}</span>
                </div>
                <div className="pay-act" style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {r.status === "cash" || r.status === "exempt" ? (
                    <button style={{ ...btnGhost, padding: "6px 10px", fontSize: 12.5 }} onClick={() => setOverride({ month, family: r.family, override: null })}>Cofnij</button>
                  ) : r.status !== "paid" ? (
                    <>
                      <button style={{ ...btnGhost, padding: "6px 10px", fontSize: 12.5 }} title="Zapłacono gotówką" onClick={() => setOverride({ month, family: r.family, override: "cash" })}>Gotówka</button>
                      <button style={{ ...btnGhost, padding: "6px 10px", fontSize: 12.5 }} title="Zwolniony z opłaty w tym miesiącu" onClick={() => setOverride({ month, family: r.family, override: "exempt" })}>Zwolniony</button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kwoty należne */}
      <div style={{ marginTop: 22 }}>
        <button style={{ ...btnGhost, background: "transparent", padding: "6px 0", color: A.navy }} onClick={() => setShowCfg((v) => !v)}>
          <Icon name="gear" size={16} /> Kwoty należne {showCfg ? "▲" : "▼"}
        </button>
        {showCfg && data && <ConfigForm cfg={data.cfg} onSave={(c) => setConfig(c)} />}
      </div>

      {/* Potwierdzenie wysyłki */}
      {confirm && (
        <div onClick={() => !busy && setConfirm(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(8,30,50,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", background: "#fff", borderRadius: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.3)", padding: 26, maxHeight: "85vh", overflowY: "auto" }}>
            <h2 className="font-fredoka" style={{ fontSize: 22, color: A.navyDeep, margin: "0 0 6px" }}>Wysłać przypomnienie o płatności?</h2>
            <p style={{ fontSize: 14.5, color: A.grey, margin: "0 0 14px", lineHeight: 1.55 }}>
              {labelOf(month)} · {selectedRows.length} {selectedRows.length === 1 ? "rodzina" : "rodzin"}. Potwierdzasz, że te osoby <strong>nie zapłaciły jeszcze w tym miesiącu</strong> (wyciąg rozliczony do {data?.lastImport ? dmy(data.lastImport.coveredUntil) : "—"}).
            </p>
            <div style={{ border: `1px solid ${A.line}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
              {selectedRows.map((r) => (
                <div key={r.family}><strong>{r.children.join(", ")}</strong> <span style={{ color: A.grey }}>— {r.email} · do zapłaty {zl(Math.max(0, r.expected - r.paid))}</span></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button style={btnGhost} disabled={busy} onClick={() => setConfirm(false)}>Anuluj</button>
              <button style={btnAccent} disabled={busy} onClick={doSend}>{busy ? "Wysyłanie…" : `Tak, wyślij (${selectedRows.length})`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigForm({ cfg, onSave }: { cfg: { base: number; sibling: number; third: number }; onSave: (c: { base: number; sibling: number; third: number }) => Promise<unknown> }) {
  const [v, setV] = useState({ base: String(cfg.base), sibling: String(cfg.sibling), third: String(cfg.third) });
  const [saved, setSaved] = useState(false);
  const f = (k: keyof typeof v, l: string) => (
    <div style={{ flex: "1 1 180px" }}>
      <label style={label}>{l}</label>
      <input type="number" min={0} value={v[k]} onChange={(e) => { setV({ ...v, [k]: e.target.value }); setSaved(false); }} style={input} />
    </div>
  );
  return (
    <div style={{ ...card, marginTop: 8 }}>
      <p style={{ fontSize: 13.5, color: A.grey, margin: "0 0 12px" }}>Według tych kwot liczona jest należność rodziny (zł miesięcznie). Rodzeństwo = dzieci zgłoszone na ten sam e-mail rodzica.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {f("base", "Jedno dziecko")}
        {f("sibling", "Każde z dwójki rodzeństwa")}
        {f("third", "Trzecie i kolejne dziecko")}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
        <button style={btnPrimary} onClick={async () => { await onSave({ base: Number(v.base) || 0, sibling: Number(v.sibling) || 0, third: Number(v.third) || 0 }); setSaved(true); }}>Zapisz kwoty</button>
        {saved && <span style={{ color: "#1f7a52", fontWeight: 600, fontSize: 13.5 }}>Zapisano</span>}
      </div>
    </div>
  );
}
