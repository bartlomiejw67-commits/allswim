"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnDanger, btnSecondary, btnGhost } from "@/components/admin/ui";

const DAYS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

// Kolory rozróżniające baseny w grafiku zbiorczym.
const POOL_COLORS = ["#6cb4e0", "#e9a13b", "#5cb98a", "#a07cd6", "#e0697f", "#3fa0a8"];

type Pool = { _id: string; name: string };
type RosterMember = { enrollmentId: string; name: string; childAge: string | null };
type Group = {
  _id: string;
  name: string;
  instructor: string | null;
  capacity: number;
  activeCount: number;
  roster: RosterMember[];
};
type Session = { _id: string; groupId: string; poolId: string; dayOfWeek: number; startTime: string; endTime: string };

export default function Page() {
  const board = useQuery(api.schedule.adminBoard);
  const settings = useQuery(api.settings.get);
  const setScheduleLive = useMutation(api.settings.setScheduleLive);
  const [busy, setBusy] = useState(false);

  if (!board) return <p style={{ color: A.grey }}>Ładowanie…</p>;

  const live = settings?.scheduleLive ?? false;
  const { pools, groups, sessions } = board as { pools: Pool[]; groups: Group[]; sessions: Session[] };

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Grafik</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 18px", maxWidth: 760 }}>
        U góry grupy z przydzielonymi dziećmi — przy każdym dziecku wybierz <strong>basen</strong>, na który chodzi.
        Niżej, w siatce każdego basenu, dodawaj <strong>terminy zajęć</strong> grup. Zmiany wejdą w życie i powiadomią
        rodziców dopiero po kliknięciu <strong>„Opublikuj zmiany”</strong> (u góry panelu).
      </p>

      {/* Widoczność grafiku */}
      <div style={{ ...card, marginBottom: 22, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between", background: live ? "#e8f7ee" : "#fff3da", border: live ? "1px solid #b7e4c7" : "1px solid #f0dca6" }}>
        <div>
          <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 16, color: live ? "#1f8a5b" : "#9a6a00" }}>
            {live ? "✅ Grafik widoczny publicznie" : "🔒 Grafik ukryty"}
          </div>
          <div style={{ fontSize: 13, color: A.grey, marginTop: 2 }}>
            {live
              ? "Siatka grup i godzin jest widoczna na stronie głównej i w kontach rodziców (na bieżąco)."
              : "Siatka nie jest jeszcze widoczna. Pierwsza publikacja zmian włączy ją automatycznie."}
          </div>
        </div>
        <button style={live ? btnGhost : btnPrimary} disabled={busy} onClick={async () => {
          const next = !live;
          if (!confirm(next ? "Pokazać grafik publicznie?" : "Ukryć grafik przed rodzicami i na stronie?")) return;
          setBusy(true);
          try { await setScheduleLive({ live: next }); } finally { setBusy(false); }
        }}>{live ? "Ukryj grafik" : "Pokaż grafik"}</button>
      </div>

      {/* GRAFIK ZBIORCZY — podgląd całego tygodnia (tylko do odczytu) */}
      <WeeklyOverview pools={pools} groups={groups} sessions={sessions} />

      {/* GRUPY + przydział basenu dla dzieci */}
      <h2 className="font-fredoka" style={{ fontSize: 20, color: A.navy, margin: "0 0 12px" }}>Grupy i uczestnicy</h2>
      {groups.length === 0 ? (
        <div style={{ ...card, color: A.grey, marginBottom: 26 }}>
          Brak grup. Dodaj grupy w zakładce <strong>Poziomy i grupy</strong>.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, marginBottom: 30 }}>
          {groups.map((g) => <GroupCard key={g._id} group={g} />)}
        </div>
      )}

      {/* SIATKI PER BASEN */}
      <h2 className="font-fredoka" style={{ fontSize: 20, color: A.navy, margin: "0 0 12px" }}>Terminy zajęć (osobno dla każdego basenu)</h2>
      {pools.length === 0 ? (
        <div style={{ ...card, color: A.grey }}>
          Brak basenów. Dodaj baseny w zakładce <strong>Baseny</strong>.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {pools.map((p) => (
            <PoolGrid key={p._id} pool={p} groups={groups} sessions={sessions.filter((s) => s.poolId === p._id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Karta grupy: roster (basen ustalasz dodając terminy grupy do siatki basenu) ---
function GroupCard({ group }: { group: Group }) {
  const unassign = useMutation(api.enrollments.unassign);
  const [busy, setBusy] = useState<string | null>(null);
  const full = group.activeCount >= group.capacity;

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <span className="font-fredoka" style={{ fontWeight: 700, fontSize: 16, color: "#1b3a4b" }}>{group.name}</span>
          {group.instructor && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: A.grey }}>{group.instructor}</span>}
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: full ? "#b4232a" : "#1f8a5b" }}>{group.activeCount}/{group.capacity}{full ? " (komplet)" : ""}</span>
      </div>

      {group.roster.length === 0 ? (
        <div style={{ color: A.grey, fontSize: 13, marginTop: 10 }}>Brak przydzielonych dzieci. Akceptuj zgłoszenia w zakładce „Zgłoszenia naboru”.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          {group.roster.map((m) => (
            <div key={m.enrollmentId} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fcff", border: "1px solid #eaf2f8", borderRadius: 10, padding: "6px 8px" }}>
              <span style={{ flex: 1, fontSize: 13, color: "#1b3a4b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.name}{m.childAge ? <span style={{ color: A.grey }}> · {m.childAge} l.</span> : null}
              </span>
              <button title="Cofnij do oczekujących" disabled={busy === m.enrollmentId} onClick={async () => {
                if (!confirm(`Cofnąć „${m.name}” do oczekujących? Zniknie z tej grupy.`)) return;
                setBusy(m.enrollmentId);
                try { await unassign({ id: m.enrollmentId as Id<"enrollments"> }); }
                finally { setBusy(null); }
              }} style={{ border: "none", background: "none", color: "#b4232a", cursor: "pointer", fontWeight: 800, fontSize: 15, lineHeight: 1, flex: "none" }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Siatka jednego basenu (pon–pt) + dodawanie terminów ---
function PoolGrid({ pool, groups, sessions }: { pool: Pool; groups: Group[]; sessions: Session[] }) {
  const groupById = (id: string) => groups.find((g) => g._id === id);
  const attendees = (groupId: string) => groupById(groupId)?.roster ?? [];

  return (
    <div style={{ ...card, padding: 16 }}>
      <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 17, color: A.navy, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        🏊 {pool.name}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(140px,1fr))", gap: 8, overflowX: "auto" }}>
        {DAYS.map((d, i) => {
          const daySessions = sessions.filter((s) => s.dayOfWeek === i).sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <div key={i} style={{ background: "#f8fcff", borderRadius: 12, border: "1px solid #eaf2f8", overflow: "hidden", minWidth: 150 }}>
              <div className="font-fredoka" style={{ background: A.navy, color: "#fff", fontWeight: 600, fontSize: 13, padding: "7px 10px" }}>{d}</div>
              <div style={{ padding: 7, display: "flex", flexDirection: "column", gap: 7 }}>
                {daySessions.length === 0 && <div style={{ color: "#9aabb5", fontSize: 12, padding: "4px 2px" }}>—</div>}
                {daySessions.map((s) => (
                  <SessionChip key={s._id} session={s} groupName={groupById(s.groupId)?.name ?? "?"} attendees={attendees(s.groupId)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AddSession poolId={pool._id} groups={groups} />
    </div>
  );
}

function SessionChip({ session, groupName, attendees }: { session: Session; groupName: string; attendees: RosterMember[] }) {
  const updateSession = useMutation(api.schedule.updateSession);
  const deleteSession = useMutation(api.schedule.deleteSession);
  const [edit, setEdit] = useState(false);
  const [day, setDay] = useState(String(session.dayOfWeek));
  const [start, setStart] = useState(session.startTime);
  const [end, setEnd] = useState(session.endTime);
  const [busy, setBusy] = useState(false);

  if (edit) {
    return (
      <div style={{ border: "1px solid #d6e7f2", borderRadius: 10, padding: 7, display: "flex", flexDirection: "column", gap: 5 }}>
        <select value={day} onChange={(e) => setDay(e.target.value)} style={{ ...input, padding: "5px 7px", fontSize: 12 }}>
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <div style={{ display: "flex", gap: 5 }}>
          <input value={start} onChange={(e) => setStart(e.target.value)} style={{ ...input, padding: "5px 7px", fontSize: 12 }} />
          <input value={end} onChange={(e) => setEnd(e.target.value)} style={{ ...input, padding: "5px 7px", fontSize: 12 }} />
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button style={{ ...btnPrimary, padding: "5px 10px", fontSize: 12 }} disabled={busy} onClick={async () => {
            setBusy(true);
            try { await updateSession({ id: session._id as Id<"scheduleEntries">, dayOfWeek: Number(day), startTime: start, endTime: end }); setEdit(false); }
            catch (e) { alert((e as { data?: string }).data ?? "Błąd."); } finally { setBusy(false); }
          }}>Zapisz</button>
          <button style={{ ...btnGhost, padding: "5px 10px", fontSize: 12 }} onClick={() => setEdit(false)}>Anuluj</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #eaf2f8", borderRadius: 10, padding: "7px 8px", background: "#fff" }}>
      <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 13, color: "#1b3a4b" }}>{groupName}</div>
      <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 12, color: A.navy }}>{session.startTime}–{session.endTime}</div>
      <div style={{ fontSize: 11, color: A.grey, marginTop: 4 }}>
        {attendees.length === 0 ? "brak dzieci na tym basenie" : attendees.map((a) => a.name).join(", ")}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
        <button style={{ ...btnGhost, padding: "4px 9px", fontSize: 11 }} onClick={() => setEdit(true)}>Edytuj</button>
        <button style={{ ...btnDanger, padding: "4px 9px", fontSize: 11 }} disabled={busy} onClick={async () => {
          if (!confirm("Usunąć ten termin?")) return;
          setBusy(true);
          try { await deleteSession({ id: session._id as Id<"scheduleEntries"> }); } catch (e) { alert((e as { data?: string }).data ?? "Błąd."); } finally { setBusy(false); }
        }}>Usuń</button>
      </div>
    </div>
  );
}

// --- Grafik zbiorczy: podgląd całego tygodnia, rozróżnienie basenów + filtr instruktora ---
function WeeklyOverview({ pools, groups, sessions }: { pools: Pool[]; groups: Group[]; sessions: Session[] }) {
  const [instr, setInstr] = useState<string>("all");

  const groupById = (id: string) => groups.find((g) => g._id === id);
  const poolById = (id: string) => pools.find((p) => p._id === id);
  const poolColor = (id: string) => {
    const idx = pools.findIndex((p) => p._id === id);
    return POOL_COLORS[(idx < 0 ? 0 : idx) % POOL_COLORS.length];
  };

  // Lista instruktorów zebrana z grup (tylko te z przypisanym instruktorem).
  const instructors = Array.from(
    new Set(groups.map((g) => (g.instructor ?? "").trim()).filter((x) => x !== "")),
  ).sort((a, b) => a.localeCompare(b, "pl"));

  const visible = sessions.filter((s) => {
    if (instr === "all") return true;
    return (groupById(s.groupId)?.instructor ?? "").trim() === instr;
  });

  return (
    <div style={{ ...card, marginBottom: 26 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h2 className="font-fredoka" style={{ fontSize: 20, color: A.navy, margin: 0 }}>Grafik zbiorczy (podgląd)</h2>
          <p style={{ color: A.grey, fontSize: 13, margin: "2px 0 0", maxWidth: 620 }}>
            Zestawienie wszystkich zajęć w tygodniu — <strong>tylko do odczytu</strong>. Terminy dodajesz i edytujesz niżej, w siatkach basenów.
          </p>
        </div>
        {instructors.length > 0 && (
          <div>
            <label style={label}>Pokaż grafik dla</label>
            <select value={instr} onChange={(e) => setInstr(e.target.value)} style={{ ...input, minWidth: 230 }}>
              <option value="all">Wszyscy instruktorzy (łącznie)</option>
              {instructors.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Legenda basenów */}
      {pools.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 12 }}>
          {pools.map((p) => (
            <span key={p._id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: A.navy }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: poolColor(p._id), display: "inline-block" }} /> {p.name}
            </span>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ color: A.grey, fontSize: 14, padding: "8px 2px" }}>
          {instr === "all"
            ? "Brak dodanych terminów. Dodaj zajęcia w siatkach basenów poniżej."
            : "Ten instruktor nie ma jeszcze żadnych zajęć w grafiku."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(150px,1fr))", gap: 8, overflowX: "auto" }}>
          {DAYS.map((d, i) => {
            const daySessions = visible
              .filter((s) => s.dayOfWeek === i)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={i} style={{ background: "#f8fcff", borderRadius: 12, border: "1px solid #eaf2f8", overflow: "hidden", minWidth: 150 }}>
                <div className="font-fredoka" style={{ background: A.navy, color: "#fff", fontWeight: 600, fontSize: 13, padding: "7px 10px" }}>{d}</div>
                <div style={{ padding: 7, display: "flex", flexDirection: "column", gap: 7 }}>
                  {daySessions.length === 0 && <div style={{ color: "#9aabb5", fontSize: 12, padding: "4px 2px" }}>—</div>}
                  {daySessions.map((s) => {
                    const g = groupById(s.groupId);
                    const color = poolColor(s.poolId);
                    return (
                      <div key={s._id} style={{ borderRadius: 10, padding: "7px 8px", background: "#fff", border: "1px solid #eaf2f8", borderLeft: `4px solid ${color}` }}>
                        <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 12, color: A.navy }}>{s.startTime}–{s.endTime}</div>
                        <div className="font-fredoka" style={{ fontWeight: 700, fontSize: 13, color: "#1b3a4b", marginTop: 1 }}>{g?.name ?? "?"}</div>
                        <div style={{ fontSize: 11, color: A.grey, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 3, background: color, display: "inline-block", flex: "none" }} />
                          {poolById(s.poolId)?.name ?? "?"}
                        </div>
                        {g?.instructor && instr === "all" && (
                          <div style={{ fontSize: 11, color: A.grey, marginTop: 2 }}>👤 {g.instructor}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddSession({ poolId, groups }: { poolId: string; groups: Group[] }) {
  const createSession = useMutation(api.schedule.createSession);
  const [groupId, setGroupId] = useState("");
  const [day, setDay] = useState("0");
  const [start, setStart] = useState("17:00");
  const [end, setEnd] = useState("17:45");
  const [busy, setBusy] = useState(false);

  if (groups.length === 0) return null;

  return (
    <div style={{ marginTop: 14, borderTop: `1px dashed ${A.line}`, paddingTop: 12, display: "grid", gridTemplateColumns: "1.6fr 1.2fr 0.9fr 0.9fr auto", gap: 8, alignItems: "end" }}>
      <div>
        <label style={label}>Grupa</label>
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} style={input}>
          <option value="">— wybierz grupę —</option>
          {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
        </select>
      </div>
      <div>
        <label style={label}>Dzień</label>
        <select value={day} onChange={(e) => setDay(e.target.value)} style={input}>
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </div>
      <div><label style={label}>Od</label><input value={start} onChange={(e) => setStart(e.target.value)} style={input} /></div>
      <div><label style={label}>Do</label><input value={end} onChange={(e) => setEnd(e.target.value)} style={input} /></div>
      <button style={btnSecondary} disabled={busy} onClick={async () => {
        if (!groupId) { alert("Wybierz grupę."); return; }
        setBusy(true);
        try { await createSession({ groupId: groupId as Id<"groups">, poolId: poolId as Id<"pools">, dayOfWeek: Number(day), startTime: start, endTime: end }); setGroupId(""); }
        catch (e) { alert((e as { data?: string }).data ?? "Błąd dodawania."); } finally { setBusy(false); }
      }}>{busy ? "…" : "+ Dodaj termin"}</button>
    </div>
  );
}
