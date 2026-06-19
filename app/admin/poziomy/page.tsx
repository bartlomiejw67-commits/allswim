"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SimpleCrud, Field } from "@/components/admin/SimpleCrud";
import { A, card, input, label, btnPrimary, btnDanger } from "@/components/admin/ui";

const levelFields: Field[] = [
  { key: "name", label: "Nazwa poziomu" },
  { key: "description", label: "Opis", type: "textarea", optional: true },
];

// --- Formularz pojedynczej grupy (nowa lub istniejąca) ---
function GroupForm({
  initial, onSubmit, submitLabel, onDelete, extra,
}: {
  initial: { name: string; instructor: string; capacity: string };
  onSubmit: (v: { name: string; instructor: string; capacity: number }) => Promise<unknown>;
  submitLabel: string;
  onDelete?: () => Promise<unknown>;
  extra?: string;
}) {
  const [name, setName] = useState(initial.name);
  const [instructor, setInstructor] = useState(initial.instructor);
  const [capacity, setCapacity] = useState(initial.capacity);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div style={card}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div><label style={label}>Nazwa grupy</label><input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} style={input} placeholder="np. Delfinki" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr", gap: 10 }}>
          <div><label style={label}>Instruktor</label><input value={instructor} onChange={(e) => { setInstructor(e.target.value); setSaved(false); }} style={input} /></div>
          <div><label style={label}>Limit miejsc</label><input type="number" value={capacity} onChange={(e) => { setCapacity(e.target.value); setSaved(false); }} style={input} /></div>
        </div>
      </div>
      {extra && <div style={{ fontSize: 13, color: A.grey, marginTop: 10 }}>{extra}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
        <button style={btnPrimary} disabled={busy} onClick={async () => {
          if (!name.trim()) { alert("Podaj nazwę grupy."); return; }
          setBusy(true);
          try { await onSubmit({ name: name.trim(), instructor: instructor.trim(), capacity: Number(capacity) || 0 }); setSaved(true); }
          catch (e) { alert((e as { data?: string }).data ?? "Błąd zapisu."); }
          finally { setBusy(false); }
        }}>{submitLabel}</button>
        {onDelete && (
          <button style={btnDanger} disabled={busy} onClick={async () => { if (!confirm("Usunąć grupę?")) return; setBusy(true); try { await onDelete(); } catch (e) { alert((e as { data?: string }).data ?? "Nie można usunąć."); } finally { setBusy(false); } }}>Usuń</button>
        )}
        {saved && <span style={{ color: "#1f8a5b", fontWeight: 700, fontSize: 13 }}>✓ Zapisano</span>}
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
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Grupy</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 20px" }}>
        Grupę dobiera ADMINISTRATOR przy akceptacji zgłoszenia. Grupa ma instruktora i limit miejsc.
        Basen i godziny ustalasz osobno w zakładce <strong>Grafik</strong> (jedna grupa może mieć zajęcia na różnych basenach).
      </p>

      {groups === undefined && <p style={{ color: A.grey }}>Ładowanie…</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups?.map((g) => (
          <GroupForm
            key={g._id}
            initial={{ name: g.name, instructor: g.instructor ?? "", capacity: String(g.capacity) }}
            submitLabel="Zapisz"
            extra={`Zajęte: ${g.activeCount}/${g.capacity} · wolne: ${g.freeSpots}`}
            onSubmit={(v) => update({ id: g._id as Id<"groups">, name: v.name, instructor: v.instructor, capacity: v.capacity })}
            onDelete={() => remove({ id: g._id as Id<"groups"> })}
          />
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${A.line}`, paddingTop: 16, marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: A.navy, marginBottom: 12 }}>+ Nowa grupa</div>
        <GroupForm
          initial={{ name: "", instructor: "Ola Laskowska", capacity: "6" }}
          submitLabel="Dodaj grupę"
          onSubmit={(v) => create({ name: v.name, instructor: v.instructor, capacity: v.capacity })}
        />
      </div>
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
      />
      <GroupsPanel />
    </div>
  );
}
