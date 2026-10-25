"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SimpleCrud, Field } from "@/components/admin/SimpleCrud";
import { A, card, input, label, btnPrimary, btnDanger, btnGhost, btnSecondary, pageTitle, pageDesc } from "@/components/admin/ui";
import { Icon } from "@/components/Icons";

const levelFields: Field[] = [
  { key: "name", label: "Nazwa poziomu" },
  { key: "description", label: "Opis", type: "textarea", optional: true },
];

// --- Pola grupy (nazwa, instruktor, limit) ---
type GroupVals = { name: string; instructor: string; capacity: string };

function GroupFields({ v, set }: { v: GroupVals; set: (v: GroupVals) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><label style={label}>Nazwa grupy</label><input value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} style={input} placeholder="np. Grupa Ola Wtorek 18:00" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr", gap: 12 }}>
        <div><label style={label}>Instruktor</label><input value={v.instructor} onChange={(e) => set({ ...v, instructor: e.target.value })} style={input} /></div>
        <div><label style={label}>Limit miejsc</label><input type="number" min={0} value={v.capacity} onChange={(e) => set({ ...v, capacity: e.target.value })} style={input} /></div>
      </div>
    </div>
  );
}

// Pasek zapełnienia grupy: zielony → żółty (prawie pełna) → czerwony (pełna).
function Occupancy({ taken, capacity }: { taken: number; capacity: number }) {
  const ratio = capacity > 0 ? Math.min(1, taken / capacity) : 1;
  const col = ratio >= 1 ? "#d14343" : ratio >= 0.8 ? "#e9a13b" : "#2fa36b";
  return (
    <div style={{ width: 130, flex: "none" }} title={`Zajęte ${taken} z ${capacity}`}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, color: "#4d6371", marginBottom: 5 }}>
        <span>{taken}/{capacity}</span>
        <span style={{ color: col }}>{capacity - taken > 0 ? `wolne: ${capacity - taken}` : "pełna"}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "#e6edf2", overflow: "hidden" }}>
        <div style={{ width: `${ratio * 100}%`, height: "100%", background: col, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function GroupRow({ g, onSave, onDelete }: {
  g: { _id: string; name: string; instructor?: string; capacity: number; activeCount: number };
  onSave: (v: { name: string; instructor: string; capacity: number }) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const initial: GroupVals = { name: g.name, instructor: g.instructor ?? "", capacity: String(g.capacity) };
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<GroupVals>(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden", borderColor: open ? "#b9d6ea" : A.line }}>
      <div className="adm-row" role="button" tabIndex={0} aria-expanded={open} onClick={() => { setV(initial); setOpen((o) => !o); }} onKeyDown={(e) => { if (e.key === "Enter") { setV(initial); setOpen((o) => !o); } }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: A.navyDeep, lineHeight: 1.3, overflowWrap: "anywhere" }}>{g.name}</div>
          {g.instructor && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13.5, color: A.grey, marginTop: 3 }}><Icon name="whistle" size={14} /> {g.instructor}</div>}
        </div>
        <Occupancy taken={g.activeCount} capacity={g.capacity} />
        <span style={{ ...btnGhost, padding: "7px 12px" }}>{open ? "Zwiń" : <><Icon name="pencil" size={15} /> Edytuj</>}</span>
      </div>
      {open && (
        <div style={{ padding: "18px 18px 16px", borderTop: `1px solid ${A.line}`, background: "#fbfdfe" }}>
          <GroupFields v={v} set={setV} />
          <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
            <button style={btnPrimary} disabled={busy || !dirty} onClick={async () => {
              if (!v.name.trim()) { alert("Podaj nazwę grupy."); return; }
              setBusy(true);
              try { await onSave({ name: v.name.trim(), instructor: v.instructor.trim(), capacity: Number(v.capacity) || 0 }); setOpen(false); }
              catch (e) { alert((e as { data?: string }).data ?? "Błąd zapisu."); }
              finally { setBusy(false); }
            }}>{busy ? "Zapisywanie…" : "Zapisz"}</button>
            <button style={btnGhost} disabled={busy} onClick={() => { setV(initial); setOpen(false); }}>Anuluj</button>
            <button style={{ ...btnDanger, marginLeft: "auto" }} disabled={busy} onClick={async () => { if (!confirm("Usunąć grupę?")) return; setBusy(true); try { await onDelete(); } catch (e) { alert((e as { data?: string }).data ?? "Nie można usunąć."); } finally { setBusy(false); } }}><Icon name="trash" size={15} /> Usuń</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewGroup({ onCreate }: { onCreate: (v: { name: string; instructor: string; capacity: number }) => Promise<unknown> }) {
  const empty: GroupVals = { name: "", instructor: "Ola Laskowska", capacity: "6" };
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<GroupVals>(empty);
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...btnSecondary, width: "100%", marginTop: 14, padding: "13px 16px", border: "1.5px dashed #b9cddb", background: "#f8fbfd" }}>
        <Icon name="plus" size={17} stroke={2.2} /> Dodaj grupę
      </button>
    );
  }
  return (
    <div style={{ ...card, border: "1.5px solid #b9d6ea", marginTop: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: A.navyDeep, marginBottom: 16 }}>Nowa grupa</div>
      <GroupFields v={v} set={setV} />
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button style={btnPrimary} disabled={busy} onClick={async () => {
          if (!v.name.trim()) { alert("Podaj nazwę grupy."); return; }
          setBusy(true);
          try { await onCreate({ name: v.name.trim(), instructor: v.instructor.trim(), capacity: Number(v.capacity) || 0 }); setV(empty); setOpen(false); }
          catch (e) { alert((e as { data?: string }).data ?? "Błąd zapisu."); }
          finally { setBusy(false); }
        }}>{busy ? "Dodawanie…" : "Dodaj grupę"}</button>
        <button style={btnGhost} disabled={busy} onClick={() => { setV(empty); setOpen(false); }}>Anuluj</button>
      </div>
    </div>
  );
}

function GroupsPanel() {
  const groups = useQuery(api.groups.listForAdmin);
  const create = useMutation(api.groups.create);
  const update = useMutation(api.groups.update);
  const remove = useMutation(api.groups.remove);

  return (
    <div>
      <h1 className="font-fredoka" style={pageTitle}>Grupy</h1>
      <p style={pageDesc}>
        Grupę dobiera ADMINISTRATOR przy akceptacji zgłoszenia. Grupa ma instruktora i limit miejsc.
        Basen i godziny ustalasz osobno w zakładce <strong>Grafik</strong> (jedna grupa może mieć zajęcia na różnych basenach).
      </p>

      {groups === undefined && <p style={{ color: A.grey }}>Ładowanie…</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groups?.map((g) => (
          <GroupRow
            key={g._id}
            g={g}
            onSave={(v) => update({ id: g._id as Id<"groups">, name: v.name, instructor: v.instructor, capacity: v.capacity })}
            onDelete={() => remove({ id: g._id as Id<"groups"> })}
          />
        ))}
      </div>
      <NewGroup onCreate={(v) => create({ name: v.name, instructor: v.instructor, capacity: v.capacity })} />
    </div>
  );
}

export default function Page() {
  const items = useQuery(api.levels.list);
  const create = useMutation(api.levels.create);
  const update = useMutation(api.levels.update);
  const remove = useMutation(api.levels.remove);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 32, alignItems: "start" }}>
      <SimpleCrud
        title="Poziomy zaawansowania"
        subtitle="Poziom wybiera RODZIC w formularzu naboru — to etykieta zaawansowania (np. Początkujący), niezależna od grupy."
        items={items}
        fields={levelFields}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onCreate={(v) => create(v as any)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdate={(id, v) => update({ id: id as Id<"levels">, ...(v as any) })}
        onRemove={(id) => remove({ id: id as Id<"levels"> })}
        addLabel="Dodaj poziom"
      />
      <GroupsPanel />
    </div>
  );
}
