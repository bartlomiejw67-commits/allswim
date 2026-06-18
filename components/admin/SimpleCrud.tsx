"use client";

import { useState } from "react";
import { A, card, input, label, btnPrimary, btnDanger, btnSecondary } from "./ui";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "checkbox";
  placeholder?: string;
  optional?: boolean;
};

type Vals = Record<string, string | boolean>;

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

function Inputs({ fields, vals, setVals }: { fields: Field[]; vals: Vals; setVals: (v: Vals) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {fields.map((f) => (
        <div key={f.key}>
          {f.type === "checkbox" ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13, color: "#1b3a4b", cursor: "pointer" }}>
              <input type="checkbox" checked={!!vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.checked })} style={{ width: 16, height: 16 }} />
              {f.label}
            </label>
          ) : (
            <>
              <label style={label}>{f.label}{f.optional ? " (opcjonalne)" : ""}</label>
              {f.type === "textarea" ? (
                <textarea value={vals[f.key] as string} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} rows={3} style={{ ...input, resize: "vertical" }} placeholder={f.placeholder} />
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

function Row({ item, fields, onUpdate, onRemove }: { item: { _id: string } & Record<string, unknown>; fields: Field[]; onUpdate: (id: string, v: Record<string, unknown>) => Promise<unknown>; onRemove: (id: string) => Promise<unknown> }) {
  const [vals, setVals] = useState<Vals>(() => initVals(fields, item));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div style={card}>
      <Inputs fields={fields} vals={vals} setVals={(v) => { setVals(v); setSaved(false); }} />
      <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
        <button style={btnPrimary} disabled={busy} onClick={async () => { setBusy(true); try { await onUpdate(item._id, toSubmit(fields, vals)); setSaved(true); } catch (e) { alert((e as { data?: string }).data ?? "Błąd zapisu."); } finally { setBusy(false); } }}>Zapisz</button>
        <button style={btnDanger} disabled={busy} onClick={async () => { if (!confirm("Usunąć tę pozycję?")) return; setBusy(true); try { await onRemove(item._id); } catch (e) { alert((e as { data?: string }).data ?? "Nie można usunąć."); } finally { setBusy(false); } }}>Usuń</button>
        {saved && <span style={{ color: "#1f8a5b", fontWeight: 700, fontSize: 13 }}>✓ Zapisano</span>}
      </div>
    </div>
  );
}

function NewRow({ fields, onCreate }: { fields: Field[]; onCreate: (v: Record<string, unknown>) => Promise<unknown> }) {
  const [vals, setVals] = useState<Vals>(() => initVals(fields));
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ ...card, borderStyle: "dashed", borderColor: "#c3d4df", marginTop: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: A.navy, marginBottom: 12 }}>+ Dodaj nową pozycję</div>
      <Inputs fields={fields} vals={vals} setVals={setVals} />
      <button style={{ ...btnSecondary, marginTop: 12 }} disabled={busy} onClick={async () => { setBusy(true); try { await onCreate(toSubmit(fields, vals)); setVals(initVals(fields)); } catch (e) { alert((e as { data?: string }).data ?? "Błąd dodawania."); } finally { setBusy(false); } }}>
        {busy ? "Dodawanie…" : "Dodaj"}
      </button>
    </div>
  );
}

export function SimpleCrud({ title, subtitle, items, fields, onCreate, onUpdate, onRemove }: {
  title: string;
  subtitle?: string;
  items: (({ _id: string } & Record<string, unknown>)[]) | undefined;
  fields: Field[];
  onCreate: (v: Record<string, unknown>) => Promise<unknown>;
  onUpdate: (id: string, v: Record<string, unknown>) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}) {
  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>{title}</h1>
      {subtitle && <p style={{ color: A.grey, fontSize: 14, margin: "0 0 20px" }}>{subtitle}</p>}
      <div style={{ maxWidth: 720 }}>
        {items === undefined && <p style={{ color: A.grey }}>Ładowanie…</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items?.map((it) => (
            <Row key={it._id} item={it} fields={fields} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </div>
        <NewRow fields={fields} onCreate={onCreate} />
      </div>
    </div>
  );
}
