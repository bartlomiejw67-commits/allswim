"use client";

import { ReactNode, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { A, card, input, label, btnPrimary, btnDanger, btnGhost, btnSecondary, pageTitle, pageDesc } from "./ui";

// Wspólny edytor listy (Poziomy, Baseny, Cennik, Dokumenty…).
// Pozycje są zwinięte do czytelnego wiersza z podsumowaniem; „Edytuj" rozwija formularz.
// „Zapisz" aktywne dopiero po zmianie; „Anuluj" przywraca zapisane wartości.

export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "checkbox";
  placeholder?: string;
  optional?: boolean;
};

export type Summary = { title: string; subtitle?: string; right?: ReactNode };

type Vals = Record<string, string | boolean>;
type Item = { _id: string } & Record<string, unknown>;

function initVals(fields: Field[], src?: Record<string, unknown>): Vals {
  const o: Vals = {};
  for (const f of fields) {
    const v = src?.[f.key];
    o[f.key] = f.type === "checkbox" ? !!v : ((v as string) ?? "");
  }
  return o;
}

function toSubmit(fields: Field[], vals: Vals): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    let v = vals[f.key];
    if (f.type === "checkbox") {
      o[f.key] = !!v;
    } else if (typeof v === "string") {
      v = v.trim();
      o[f.key] = v === "" && f.optional ? undefined : v;
    }
  }
  return o;
}

// Domyślne podsumowanie: pierwsze pole tekstowe jako tytuł, reszta jako podtytuł, zaznaczone pola jako etykiety.
function defaultSummary(fields: Field[], item: Record<string, unknown>): Summary {
  const text = fields.filter((f) => f.type !== "checkbox");
  const title = String(item[text[0]?.key] ?? "").trim() || "(bez nazwy)";
  const rest = text.slice(1).map((f) => String(item[f.key] ?? "").trim()).filter(Boolean).join(" · ");
  const flags = fields.filter((f) => f.type === "checkbox" && item[f.key]);
  return {
    title,
    subtitle: rest.length > 160 ? rest.slice(0, 157) + "…" : rest || undefined,
    right: flags.length ? (
      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {flags.map((f) => <span key={f.key} style={{ fontSize: 12, fontWeight: 700, color: "#9a5a00", background: "#fff1d9", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{f.label}</span>)}
      </span>
    ) : undefined,
  };
}

function Inputs({ fields, vals, setVals }: { fields: Field[]; vals: Vals; setVals: (v: Vals) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {fields.map((f) => (
        <div key={f.key}>
          {f.type === "checkbox" ? (
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 600, fontSize: 14, color: A.text, cursor: "pointer" }}>
              <input type="checkbox" checked={!!vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.checked })} style={{ width: 17, height: 17 }} />
              {f.label}
            </label>
          ) : (
            <>
              <label style={label}>{f.label}{f.optional && <span style={{ fontWeight: 400, color: A.grey }}> (opcjonalne)</span>}</label>
              {f.type === "textarea" ? (
                <textarea value={vals[f.key] as string} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} rows={4} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} placeholder={f.placeholder} />
              ) : (
                <input value={vals[f.key] as string} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} style={input} placeholder={f.placeholder} />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ item, fields, onUpdate, onRemove, summarize }: {
  item: Item;
  fields: Field[];
  onUpdate: (id: string, v: Record<string, unknown>) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  summarize?: (item: Item) => Summary;
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Vals>(() => initVals(fields, item));
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  // Gdy pozycja jest zwinięta, trzymamy wartości zgodne z bazą (np. po zapisie z innego miejsca).
  useEffect(() => { if (!open) setVals(initVals(fields, item)); }, [item, open, fields]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(false), 2200); return () => clearTimeout(t); }, [flash]);

  const dirty = JSON.stringify(vals) !== JSON.stringify(initVals(fields, item));
  const sum = summarize ? summarize(item) : defaultSummary(fields, item);

  async function save() {
    setBusy(true);
    try {
      await onUpdate(item._id, toSubmit(fields, vals));
      setOpen(false);
      setFlash(true);
    } catch (e) {
      alert((e as { data?: string }).data ?? "Błąd zapisu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden", borderColor: open ? "#b9d6ea" : A.line, boxShadow: open ? "0 10px 30px rgba(16,42,67,0.1)" : card.boxShadow }}>
      <div className="adm-row" role="button" tabIndex={0} aria-expanded={open} onClick={() => setOpen((o) => !o)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, color: A.navyDeep, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sum.title}</div>
          {sum.subtitle && <div style={{ fontSize: 13.5, color: A.grey, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sum.subtitle}</div>}
        </div>
        {sum.right}
        {flash && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1f8a5b", fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap" }}><Icon name="check" size={16} stroke={2.2} /> Zapisano</span>}
        <span style={{ ...btnGhost, padding: "7px 12px", background: open ? "#e3f0f9" : btnGhost.background, color: open ? A.navy : btnGhost.color }}>
          {open ? <><Icon name="chevronDown" size={15} style={{ transform: "rotate(180deg)" }} /> Zwiń</> : <><Icon name="pencil" size={15} /> Edytuj</>}
        </span>
      </div>
      {open && (
        <div style={{ padding: "18px 18px 16px", borderTop: `1px solid ${A.line}`, background: "#fbfdfe" }}>
          <Inputs fields={fields} vals={vals} setVals={setVals} />
          <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
            <button style={btnPrimary} disabled={busy || !dirty} onClick={save}>{busy ? "Zapisywanie…" : "Zapisz"}</button>
            <button style={btnGhost} disabled={busy} onClick={() => { setVals(initVals(fields, item)); setOpen(false); }}>Anuluj</button>
            {dirty && <span style={{ fontSize: 13, color: "#9a6a00", fontWeight: 600 }}>Niezapisane zmiany</span>}
            <button style={{ ...btnDanger, marginLeft: "auto" }} disabled={busy} onClick={async () => { if (!confirm("Usunąć tę pozycję?")) return; setBusy(true); try { await onRemove(item._id); } catch (e) { alert((e as { data?: string }).data ?? "Nie można usunąć."); } finally { setBusy(false); } }}><Icon name="trash" size={15} /> Usuń</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewRow({ fields, onCreate, addLabel }: { fields: Field[]; onCreate: (v: Record<string, unknown>) => Promise<unknown>; addLabel: string }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Vals>(() => initVals(fields));
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...btnSecondary, width: "100%", justifyContent: "center", marginTop: 14, padding: "13px 16px", border: "1.5px dashed #b9cddb", background: "#f8fbfd" }}>
        <Icon name="plus" size={17} stroke={2.2} /> {addLabel}
      </button>
    );
  }
  return (
    <div style={{ ...card, border: "1.5px solid #b9d6ea", marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 16, color: A.navyDeep, marginBottom: 16 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: "#e3f0f9", color: A.navy, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={17} stroke={2.2} /></span>
        {addLabel}
      </div>
      <Inputs fields={fields} vals={vals} setVals={setVals} />
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button style={btnPrimary} disabled={busy} onClick={async () => { setBusy(true); try { await onCreate(toSubmit(fields, vals)); setVals(initVals(fields)); setOpen(false); } catch (e) { alert((e as { data?: string }).data ?? "Błąd dodawania."); } finally { setBusy(false); } }}>
          {busy ? "Dodawanie…" : "Dodaj"}
        </button>
        <button style={btnGhost} disabled={busy} onClick={() => { setVals(initVals(fields)); setOpen(false); }}>Anuluj</button>
      </div>
    </div>
  );
}

export function SimpleCrud({ title, subtitle, items, fields, onCreate, onUpdate, onRemove, summarize, addLabel = "Dodaj nową pozycję" }: {
  title: string;
  subtitle?: string;
  items: Item[] | undefined;
  fields: Field[];
  onCreate: (v: Record<string, unknown>) => Promise<unknown>;
  onUpdate: (id: string, v: Record<string, unknown>) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  summarize?: (item: Item) => Summary;
  addLabel?: string;
}) {
  return (
    <div>
      <h1 className="font-fredoka" style={pageTitle}>{title}</h1>
      {subtitle && <p style={pageDesc}>{subtitle}</p>}
      <div style={{ maxWidth: 760 }}>
        {items === undefined && <p style={{ color: A.grey }}>Ładowanie…</p>}
        {items && items.length === 0 && <div style={{ ...card, textAlign: "center", color: A.grey, boxShadow: "none" }}>Brak pozycji — dodaj pierwszą poniżej.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items?.map((it) => (
            <Row key={it._id} item={it} fields={fields} onUpdate={onUpdate} onRemove={onRemove} summarize={summarize} />
          ))}
        </div>
        <NewRow fields={fields} onCreate={onCreate} addLabel={addLabel} />
      </div>
    </div>
  );
}
