"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnDanger, btnSecondary, btnGhost } from "@/components/admin/ui";

const DAYS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

type Lvl = { _id: string; name: string };
type Slot = {
  entryId: string;
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  name: string;
  levelId: string | null;
  levelName: string | null;
  capacity: number;
  activeCount: number;
  roster: { id: string; name: string }[];
};

type Pending = { _id: string; name: string; levelLabel?: string | null; isContinuing: boolean };

export default function Page() {
  const slots = useQuery(api.schedule.adminSlots);
  const levels = useQuery(api.levels.list);
  const pending = useQuery(api.enrollments.list, { status: "pending" });
  const settings = useQuery(api.settings.get);
  const createSlot = useMutation(api.schedule.createSlot);
  const setPublished = useMutation(api.settings.setSchedulePublished);

  const published = settings?.schedulePublished ?? false;

  // formularz dodawania
  const [nName, setNName] = useState("");
  const [nLevel, setNLevel] = useState("");
  const [nDay, setNDay] = useState("4");
  const [nStart, setNStart] = useState("17:00");
  const [nEnd, setNEnd] = useState("18:00");
  const [nCap, setNCap] = useState("6");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!nName.trim() || !nLevel) {
      alert("Podaj nazwę i poziom grupy.");
      return;
    }
    setBusy(true);
    try {
      await createSlot({
        name: nName.trim(),
        levelId: nLevel as Id<"levels">,
        dayOfWeek: Number(nDay),
        startTime: nStart,
        endTime: nEnd,
        capacity: Number(nCap) || 0,
        instructor: "Ola Laskowska",
      });
      setNName("");
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się dodać.");
    } finally {
      setBusy(false);
    }
  }

  if (!levels) return <p style={{ color: A.grey }}>Ładowanie…</p>;

  const byDay = (d: number) => (slots ?? []).filter((s) => s.dayOfWeek === d).sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Grafik tygodniowy</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 18px" }}>Twój roboczy kalendarz na czas naboru. Dodawaj zajęcia (slot = grupa: dzień, godzina, poziom, limit), a w zakładce „Zgłoszenia” przypisuj dzieci do tych grup. Rodzice zobaczą godziny dopiero po publikacji.</p>

      {/* Publikacja */}
      <div style={{ ...card, marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between", background: published ? "#e8f7ee" : "#fff3da", border: published ? "1px solid #b7e4c7" : "1px solid #f0dca6" }}>
        <div>
          <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 16, color: published ? "#1f8a5b" : "#9a6a00" }}>
            {published ? "✅ Grafik opublikowany dla rodziców" : "🔒 Grafik roboczy (ukryty przed rodzicami)"}
          </div>
          <div style={{ fontSize: 13, color: A.grey, marginTop: 2 }}>
            {published
              ? "Rodzice widzą przydzielone grupy i godziny w swoich kontach."
              : "Pracuj spokojnie nad przydziałami — rodzice widzą tylko status (oczekuje/zaakceptowany/odrzucony), bez godzin."}
          </div>
        </div>
        <button
          style={published ? btnGhost : btnPrimary}
          disabled={busy}
          onClick={async () => {
            const next = !published;
            if (!confirm(next ? "Opublikować grafik? Rodzice zobaczą swoje grupy i godziny." : "Cofnąć publikację? Rodzice znów nie zobaczą godzin.")) return;
            setBusy(true);
            try { await setPublished({ published: next }); } finally { setBusy(false); }
          }}
        >
          {published ? "Cofnij publikację" : "Opublikuj grafik rodzicom"}
        </button>
      </div>

      {/* Dodawanie zajęć */}
      <div style={{ ...card, marginBottom: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: A.navy, marginBottom: 12 }}>+ Dodaj zajęcia</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 1.2fr 0.9fr 0.9fr 0.7fr", gap: 10, alignItems: "end" }}>
          <div><label style={label}>Nazwa grupy</label><input value={nName} onChange={(e) => setNName(e.target.value)} style={input} placeholder="np. Delfinki" /></div>
          <div>
            <label style={label}>Poziom</label>
            <select value={nLevel} onChange={(e) => setNLevel(e.target.value)} style={input}>
              <option value="">— wybierz —</option>
              {levels.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Dzień</label>
            <select value={nDay} onChange={(e) => setNDay(e.target.value)} style={input}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div><label style={label}>Od</label><input value={nStart} onChange={(e) => setNStart(e.target.value)} style={input} /></div>
          <div><label style={label}>Do</label><input value={nEnd} onChange={(e) => setNEnd(e.target.value)} style={input} /></div>
          <div><label style={label}>Limit</label><input type="number" value={nCap} onChange={(e) => setNCap(e.target.value)} style={input} /></div>
        </div>
        <button style={{ ...btnSecondary, marginTop: 12 }} disabled={busy} onClick={add}>{busy ? "…" : "Dodaj do grafiku"}</button>
      </div>

      {/* Siatka tygodnia */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #eaf2f8", overflow: "hidden", minHeight: 90 }}>
            <div className="font-fredoka" style={{ background: A.navy, color: "#fff", fontWeight: 600, fontSize: 14, padding: "8px 12px" }}>{d}</div>
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {byDay(i).length === 0 && <div style={{ color: "#9aabb5", fontSize: 12, padding: "8px 6px" }}>—</div>}
              {byDay(i).map((s) => (
                <SlotCard key={s.entryId} slot={s as Slot} levels={levels} pending={(pending ?? []) as Pending[]} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotCard({ slot, levels, pending }: { slot: Slot; levels: Lvl[]; pending: Pending[] }) {
  const updateSlot = useMutation(api.schedule.updateSlot);
  const deleteSlot = useMutation(api.schedule.deleteSlot);
  const decide = useMutation(api.enrollments.decide);
  const unassign = useMutation(api.enrollments.unassign);
  const [assignId, setAssignId] = useState("");
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(slot.name);
  const [levelId, setLevelId] = useState(slot.levelId ?? "");
  const [start, setStart] = useState(slot.startTime);
  const [end, setEnd] = useState(slot.endTime);
  const [cap, setCap] = useState(String(slot.capacity));
  const [busy, setBusy] = useState(false);

  const full = slot.activeCount >= slot.capacity;

  if (edit) {
    return (
      <div style={{ border: "1px solid #d6e7f2", borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...input, padding: "7px 9px", fontSize: 13 }} />
        <select value={levelId} onChange={(e) => setLevelId(e.target.value)} style={{ ...input, padding: "7px 9px", fontSize: 13 }}>
          {levels.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={start} onChange={(e) => setStart(e.target.value)} style={{ ...input, padding: "7px 9px", fontSize: 13 }} />
          <input value={end} onChange={(e) => setEnd(e.target.value)} style={{ ...input, padding: "7px 9px", fontSize: 13 }} />
        </div>
        <input type="number" value={cap} onChange={(e) => setCap(e.target.value)} style={{ ...input, padding: "7px 9px", fontSize: 13 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ ...btnPrimary, padding: "7px 12px", fontSize: 13 }} disabled={busy} onClick={async () => {
            setBusy(true);
            try {
              await updateSlot({ entryId: slot.entryId as Id<"scheduleEntries">, groupId: slot.groupId as Id<"groups">, name: name.trim(), levelId: levelId as Id<"levels">, capacity: Number(cap) || 0, startTime: start, endTime: end });
              setEdit(false);
            } catch (e) { alert((e as { data?: string }).data ?? "Błąd."); } finally { setBusy(false); }
          }}>Zapisz</button>
          <button style={{ ...btnGhost, padding: "7px 12px", fontSize: 13 }} onClick={() => setEdit(false)}>Anuluj</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #eaf2f8", borderRadius: 12, padding: "9px 10px", background: "#f8fcff" }}>
      <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 14, color: "#1b3a4b" }}>{slot.name}</div>
      <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 13, color: A.navy }}>{slot.startTime}–{slot.endTime}</div>
      {slot.levelName && <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: A.navy, background: "#e8f4fb", borderRadius: 999, padding: "2px 8px", marginTop: 4 }}>{slot.levelName}</span>}
      <div style={{ fontSize: 12, marginTop: 6, fontWeight: 700, color: full ? "#b4232a" : "#1f8a5b" }}>Miejsca: {slot.activeCount}/{slot.capacity}{full ? " (komplet)" : ""}</div>

      {slot.roster.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {slot.roster.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 12, background: "#eef6fb", borderRadius: 8, padding: "4px 8px" }}>
              <span style={{ color: "#1b3a4b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <button title="Wypisz" disabled={busy} onClick={async () => { setBusy(true); try { await unassign({ id: r.id as Id<"enrollments"> }); } finally { setBusy(false); } }} style={{ border: "none", background: "none", color: "#b4232a", cursor: "pointer", fontWeight: 800, fontSize: 15, lineHeight: 1, flex: "none" }}>×</button>
            </div>
          ))}
        </div>
      )}

      {!full && pending.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          <select value={assignId} onChange={(e) => setAssignId(e.target.value)} style={{ ...input, padding: "6px 8px", fontSize: 12 }}>
            <option value="">+ przypisz dziecko…</option>
            {pending.map((p) => (
              <option key={p._id} value={p._id}>{p.name}{p.isContinuing ? " (kont.)" : ""}</option>
            ))}
          </select>
          <button disabled={busy || !assignId} style={{ ...btnPrimary, padding: "6px 10px", fontSize: 12 }} onClick={async () => {
            if (!assignId) return;
            setBusy(true);
            try {
              await decide({ id: assignId as Id<"enrollments">, approve: true, assignedGroupId: slot.groupId as Id<"groups"> });
              setAssignId("");
            } catch (e) { alert((e as { data?: string }).data ?? "Nie udało się przypisać."); }
            finally { setBusy(false); }
          }}>OK</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button style={{ ...btnGhost, padding: "5px 10px", fontSize: 12 }} onClick={() => setEdit(true)}>Edytuj</button>
        <button style={{ ...btnDanger, padding: "5px 10px", fontSize: 12 }} disabled={busy} onClick={async () => {
          if (!confirm("Usunąć te zajęcia z grafiku?")) return;
          setBusy(true);
          try { await deleteSlot({ entryId: slot.entryId as Id<"scheduleEntries">, groupId: slot.groupId as Id<"groups"> }); } catch (e) { alert((e as { data?: string }).data ?? "Błąd."); } finally { setBusy(false); }
        }}>Usuń</button>
      </div>
    </div>
  );
}
