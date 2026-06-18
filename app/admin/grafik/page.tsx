"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnDanger, btnSecondary } from "@/components/admin/ui";

const DAYS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

export default function Page() {
  const entries = useQuery(api.schedule.list, {});
  const groups = useQuery(api.groups.list);
  const create = useMutation(api.schedule.create);
  const update = useMutation(api.schedule.update);
  const remove = useMutation(api.schedule.remove);

  const [nGroup, setNGroup] = useState("");
  const [nDay, setNDay] = useState("0");
  const [nStart, setNStart] = useState("16:00");
  const [nEnd, setNEnd] = useState("16:45");
  const [busy, setBusy] = useState(false);

  const sorted = entries ? [...entries].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)) : undefined;

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Grafik zajęć</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 20px" }}>Terminy zajęć. Basen i instruktor pobierane są automatycznie z wybranej grupy.</p>

      <div style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted?.map((e) => (
          <ScheduleRow key={e._id}
            entry={e}
            onSave={(day, start, end) => update({ id: e._id as Id<"scheduleEntries">, dayOfWeek: day, startTime: start, endTime: end })}
            onDelete={() => remove({ id: e._id as Id<"scheduleEntries"> })}
          />
        ))}

        <div style={{ ...card, borderStyle: "dashed", borderColor: "#c3d4df", marginTop: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: A.navy, marginBottom: 12 }}>+ Dodaj termin</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 1fr", gap: 10, alignItems: "end" }}>
            <div>
              <label style={label}>Grupa</label>
              <select value={nGroup} onChange={(e) => setNGroup(e.target.value)} style={input}>
                <option value="">— wybierz grupę —</option>
                {groups?.map((g) => <option key={g._id} value={g._id}>{g.name}{g.poolName ? ` · ${g.poolName}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Dzień</label>
              <select value={nDay} onChange={(e) => setNDay(e.target.value)} style={input}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div><label style={label}>Od</label><input value={nStart} onChange={(e) => setNStart(e.target.value)} style={input} placeholder="16:00" /></div>
            <div><label style={label}>Do</label><input value={nEnd} onChange={(e) => setNEnd(e.target.value)} style={input} placeholder="16:45" /></div>
          </div>
          <button style={{ ...btnSecondary, marginTop: 12 }} disabled={busy} onClick={async () => {
            if (!nGroup) { alert("Wybierz grupę."); return; }
            setBusy(true);
            try {
              await create({ groupId: nGroup as Id<"groups">, dayOfWeek: Number(nDay), startTime: nStart, endTime: nEnd });
              setNGroup("");
            } catch (err) { alert((err as { data?: string }).data ?? "Błąd dodawania."); }
            finally { setBusy(false); }
          }}>{busy ? "Dodawanie…" : "Dodaj termin"}</button>
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({ entry, onSave, onDelete }: {
  entry: { dayOfWeek: number; startTime: string; endTime: string; groupName: string | null; poolName: string | null; instructor: string | null };
  onSave: (day: number, start: string, end: string) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [day, setDay] = useState(String(entry.dayOfWeek));
  const [start, setStart] = useState(entry.startTime);
  const [end, setEnd] = useState(entry.endTime);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div style={card}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
        <div>
          <label style={label}>Grupa (basen · instruktor)</label>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1b3a4b", padding: "8px 0" }}>
            {entry.groupName}
            <div style={{ fontWeight: 600, fontSize: 12, color: A.grey }}>{entry.poolName} · {entry.instructor}</div>
          </div>
        </div>
        <div>
          <label style={label}>Dzień</label>
          <select value={day} onChange={(e) => { setDay(e.target.value); setSaved(false); }} style={input}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div><label style={label}>Od</label><input value={start} onChange={(e) => { setStart(e.target.value); setSaved(false); }} style={input} /></div>
        <div><label style={label}>Do</label><input value={end} onChange={(e) => { setEnd(e.target.value); setSaved(false); }} style={input} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button style={btnPrimary} disabled={busy} onClick={async () => { setBusy(true); try { await onSave(Number(day), start, end); setSaved(true); } finally { setBusy(false); } }}>Zapisz</button>
          <button style={btnDanger} disabled={busy} onClick={async () => { if (!confirm("Usunąć termin?")) return; setBusy(true); try { await onDelete(); } finally { setBusy(false); } }}>Usuń</button>
        </div>
      </div>
      {saved && <span style={{ color: "#1f8a5b", fontWeight: 700, fontSize: 13 }}>✓ Zapisano</span>}
    </div>
  );
}
