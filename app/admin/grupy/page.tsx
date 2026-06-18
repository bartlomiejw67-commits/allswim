"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnDanger, btnSecondary } from "@/components/admin/ui";

type Lvl = { _id: string; name: string };
type Pool = { _id: string; name: string };

function GroupForm({
  levels, pools, initial, onSubmit, submitLabel, onDelete, extra,
}: {
  levels: Lvl[];
  pools: Pool[];
  initial: { name: string; levelId: string; poolId: string; instructor: string; capacity: string };
  onSubmit: (v: { name: string; levelId: string; poolId: string; instructor: string; capacity: number }) => Promise<unknown>;
  submitLabel: string;
  onDelete?: () => Promise<unknown>;
  extra?: string;
}) {
  const [name, setName] = useState(initial.name);
  const [levelId, setLevelId] = useState(initial.levelId);
  const [poolId, setPoolId] = useState(initial.poolId);
  const [instructor, setInstructor] = useState(initial.instructor);
  const [capacity, setCapacity] = useState(initial.capacity);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div style={card}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label style={label}>Nazwa grupy</label><input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} style={input} /></div>
        <div><label style={label}>Instruktor</label><input value={instructor} onChange={(e) => { setInstructor(e.target.value); setSaved(false); }} style={input} /></div>
        <div>
          <label style={label}>Poziom</label>
          <select value={levelId} onChange={(e) => { setLevelId(e.target.value); setSaved(false); }} style={input}>
            <option value="">— wybierz —</option>
            {levels.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>Basen</label>
          <select value={poolId} onChange={(e) => { setPoolId(e.target.value); setSaved(false); }} style={input}>
            <option value="">— wybierz —</option>
            {pools.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div><label style={label}>Limit miejsc</label><input type="number" value={capacity} onChange={(e) => { setCapacity(e.target.value); setSaved(false); }} style={input} /></div>
      </div>
      {extra && <div style={{ fontSize: 13, color: A.grey, marginTop: 10 }}>{extra}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
        <button style={btnPrimary} disabled={busy} onClick={async () => {
          if (!name.trim() || !levelId || !poolId) { alert("Uzupełnij nazwę, poziom i basen."); return; }
          setBusy(true);
          try { await onSubmit({ name: name.trim(), levelId, poolId, instructor: instructor.trim(), capacity: Number(capacity) || 0 }); setSaved(true); }
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

export default function Page() {
  const groups = useQuery(api.groups.listForAdmin);
  const levels = useQuery(api.levels.list);
  const pools = useQuery(api.pools.list);
  const create = useMutation(api.groups.create);
  const update = useMutation(api.groups.update);
  const remove = useMutation(api.groups.remove);

  if (!levels || !pools) return <p style={{ color: A.grey }}>Ładowanie…</p>;

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Grupy</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 20px" }}>Grupy zajęciowe z poziomem, basenem i limitem miejsc. Limit i liczba zajętych miejsc widoczne tylko tutaj.</p>

      <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 12 }}>
        {groups?.map((g) => (
          <GroupForm
            key={g._id}
            levels={levels}
            pools={pools}
            initial={{ name: g.name, levelId: g.levelId, poolId: g.poolId, instructor: g.instructor ?? "", capacity: String(g.capacity) }}
            submitLabel="Zapisz"
            extra={`Zajęte: ${g.activeCount}/${g.capacity} · wolne: ${g.freeSpots}`}
            onSubmit={(v) => update({ id: g._id as Id<"groups">, name: v.name, levelId: v.levelId as Id<"levels">, poolId: v.poolId as Id<"pools">, instructor: v.instructor, capacity: v.capacity })}
            onDelete={() => remove({ id: g._id as Id<"groups"> })}
          />
        ))}

        <div style={{ borderTop: `1px solid ${A.line}`, paddingTop: 16, marginTop: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: A.navy, marginBottom: 12 }}>+ Nowa grupa</div>
          <GroupForm
            levels={levels}
            pools={pools}
            initial={{ name: "", levelId: "", poolId: "", instructor: "Ola Laskowska", capacity: "6" }}
            submitLabel="Dodaj grupę"
            onSubmit={(v) => create({ name: v.name, levelId: v.levelId as Id<"levels">, poolId: v.poolId as Id<"pools">, instructor: v.instructor, capacity: v.capacity })}
          />
        </div>
      </div>
    </div>
  );
}
