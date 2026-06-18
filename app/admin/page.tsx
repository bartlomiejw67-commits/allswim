"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, btnPrimary, btnDanger, btnGhost, input } from "@/components/admin/ui";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Oczekuje", color: "#9a6a00", bg: "#fff3da" },
  approved: { label: "Zaakceptowane", color: "#1f8a5b", bg: "#e8f7ee" },
  rejected: { label: "Odrzucone", color: "#b4232a", bg: "#fdeaea" },
};

export default function AdminEnrollments() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const enrollments = useQuery(api.enrollments.list, filter === "all" ? {} : { status: filter });
  const groups = useQuery(api.groups.list);
  const decide = useMutation(api.enrollments.decide);
  const remove = useMutation(api.enrollments.remove);

  const [groupChoice, setGroupChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(id: string) {
    const gid = groupChoice[id];
    if (!gid) {
      alert("Wybierz grupę przed akceptacją.");
      return;
    }
    setBusy(id);
    try {
      await decide({ id: id as Id<"enrollments">, approve: true, assignedGroupId: gid as Id<"groups"> });
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się zaakceptować.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    setBusy(id);
    try {
      await decide({ id: id as Id<"enrollments">, approve: false });
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się odrzucić.");
    } finally {
      setBusy(null);
    }
  }

  async function del(id: string) {
    if (!confirm("Usunąć to zgłoszenie na stałe?")) return;
    setBusy(id);
    try {
      await remove({ id: id as Id<"enrollments"> });
    } finally {
      setBusy(null);
    }
  }

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: "Oczekujące" },
    { key: "approved", label: "Zaakceptowane" },
    { key: "rejected", label: "Odrzucone" },
    { key: "all", label: "Wszystkie" },
  ];

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Zgłoszenia naboru</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 20px" }}>Osoby kontynuujące są wyżej na liście. Zaakceptuj i przydziel do grupy lub odrzuć.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{ ...btnGhost, ...(filter === t.key ? { background: A.navy, color: "#fff" } : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {enrollments === undefined && <p style={{ color: A.grey }}>Ładowanie…</p>}
      {enrollments && enrollments.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: A.grey }}>Brak zgłoszeń w tej kategorii.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {enrollments?.map((e) => {
          const st = STATUS_LABEL[e.status];
          const date = new Date(e._creationTime).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
          return (
            <div key={e._id} style={card}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="font-fredoka" style={{ fontSize: 18, fontWeight: 700, color: "#1b3a4b" }}>{e.name}</span>
                    {e.isContinuing ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: A.orange, borderRadius: 999, padding: "3px 10px" }}>KONTYNUUJE</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 800, color: A.grey, background: "#eef3f6", borderRadius: 999, padding: "3px 10px" }}>NOWY</span>
                    )}
                    {st && <span style={{ fontSize: 11, fontWeight: 800, color: st.color, background: st.bg, borderRadius: 999, padding: "3px 10px" }}>{st.label}</span>}
                  </div>
                  <div style={{ fontSize: 14, color: A.grey, marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>📧 {e.email}</span>
                    {e.phone && <span>📞 {e.phone}</span>}
                    {e.childAge && <span>🎂 wiek: {e.childAge}</span>}
                    {e.levelLabel && <span>📊 poziom: {e.levelLabel}</span>}
                    {e.note && <span>💬 wiadomość: {e.note}</span>}
                    {e.assignedGroupName && <span>👥 grupa: {e.assignedGroupName}</span>}
                    <span style={{ fontSize: 12, color: "#9aabb5" }}>zgłoszono: {date}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  {e.status === "pending" && (
                    <>
                      <select value={groupChoice[e._id] ?? ""} onChange={(ev) => setGroupChoice((g) => ({ ...g, [e._id]: ev.target.value }))} style={{ ...input, width: 220 }}>
                        <option value="">— wybierz grupę —</option>
                        {groups?.map((g) => (
                          <option key={g._id} value={g._id}>{g.name}{g.poolName ? ` · ${g.poolName}` : ""}</option>
                        ))}
                      </select>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button disabled={busy === e._id} style={btnPrimary} onClick={() => approve(e._id)}>Zaakceptuj</button>
                        <button disabled={busy === e._id} style={btnGhost} onClick={() => reject(e._id)}>Odrzuć</button>
                      </div>
                    </>
                  )}
                  <button disabled={busy === e._id} style={btnDanger} onClick={() => del(e._id)}>Usuń</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
