"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, btnPrimary, btnSecondary, btnDanger, btnGhost, input, pageTitle, pageDesc, MAIL_KIND, MAIL_STATUS } from "@/components/admin/ui";
import { Icon } from "@/components/Icons";

type StatusFilter = "pending" | "approved" | "rejected" | "reserve" | "all";

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Oczekuje", color: "#9a6a00", bg: "#fff3da" },
  approved: { label: "Zaakceptowane", color: "#1f8a5b", bg: "#e8f7ee" },
  rejected: { label: "Odrzucone", color: "#b4232a", bg: "#fdeaea" },
  reserve: { label: "Lista rezerwowa", color: "#6b4bbd", bg: "#efeafc" },
};

export default function AdminEnrollments() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const enrollments = useQuery(api.enrollments.list, filter === "all" ? {} : { status: filter });
  const groups = useQuery(api.groups.list);
  const pendingCount = useQuery(api.enrollments.pendingCount);
  const decide = useMutation(api.enrollments.decide);
  const remove = useMutation(api.enrollments.remove);
  const unassign = useMutation(api.enrollments.unassign);
  const reserveM = useMutation(api.enrollments.reserve);

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

  async function putReserve(id: string) {
    setBusy(id);
    try {
      await reserveM({ id: id as Id<"enrollments"> });
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się dodać do listy rezerwowej.");
    } finally {
      setBusy(null);
    }
  }

  async function undo(id: string) {
    if (!confirm("Cofnąć decyzję i przywrócić zgłoszenie do oczekujących? Przydział grupy zostanie zdjęty.")) return;
    setBusy(id);
    try {
      await unassign({ id: id as Id<"enrollments"> });
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się cofnąć.");
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
    { key: "reserve", label: "Lista rezerwowa" },
    { key: "rejected", label: "Odrzucone" },
    { key: "all", label: "Wszystkie" },
  ];

  return (
    <div>
      <h1 className="font-fredoka" style={pageTitle}>Zgłoszenia naboru</h1>
      <p style={pageDesc}>Osoby kontynuujące są wyżej na liście. Zaakceptuj i przydziel do grupy, odrzuć albo dodaj na <strong>Listę rezerwową</strong> (gdy brak miejsc). Gdy zwolni się miejsce, wejdź w zakładkę „Lista rezerwowa" i kliknij <strong>„Przydziel do grupy"</strong>. Maile do rodziców wychodzą dopiero po <strong>opublikowaniu zmian</strong>.</p>

      <div role="tablist" aria-label="Status zgłoszeń" style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, background: "#e7eef4", borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {tabs.map((t) => {
          const on = filter === t.key;
          return (
            <button key={t.key} role="tab" aria-selected={on} onClick={() => setFilter(t.key)} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 700 : 600, color: on ? A.navy : "#4d6371", background: on ? "#fff" : "transparent", boxShadow: on ? "0 2px 8px rgba(16,42,67,0.1)" : "none", borderRadius: 9, padding: "8px 14px" }}>
              {t.label}
              {t.key === "pending" && !!pendingCount && (
                <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: A.orange, color: "#fff", fontSize: 11.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{pendingCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {enrollments === undefined && <p style={{ color: A.grey }}>Ładowanie…</p>}
      {enrollments && enrollments.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: A.grey, padding: "40px 22px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: "#9fb4c2" }}><Icon name="inbox" size={34} stroke={1.6} /></div>
          Brak zgłoszeń w tej kategorii.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {enrollments?.map((e) => {
          const st = STATUS_LABEL[e.status];
          const date = new Date(e._creationTime).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
          const initials = e.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
          const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14, color: "#33495a", background: "#f3f7fa", border: `1px solid ${A.line}`, borderRadius: 9, padding: "6px 10px", textDecoration: "none", maxWidth: "100%", overflowWrap: "anywhere" };
          return (
            <div key={e._id} style={{ ...card, padding: 0, overflow: "hidden", borderLeft: `4px solid ${st?.color ?? A.line}` }}>
              <div style={{ padding: "18px 20px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div aria-hidden style={{ width: 44, height: 44, borderRadius: 12, flex: "none", background: st?.bg ?? "#eef3f7", color: st?.color ?? A.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>{initials || "?"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="font-fredoka" style={{ fontSize: 19, fontWeight: 600, color: A.navyDeep }}>{e.name}</span>
                      {e.isContinuing ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#9a5a00", background: "#fff1d9", borderRadius: 999, padding: "3px 10px" }}>Kontynuuje</span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#4d6371", background: "#eef3f7", borderRadius: 999, padding: "3px 10px" }}>Nowy</span>
                      )}
                      {st && <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 999, padding: "3px 10px" }}>{st.label}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "#8a9ba7", marginTop: 3 }}>Zgłoszono {date}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  <a href={`mailto:${e.email}`} style={chip}><Icon name="mail" size={15} color={A.navy} /> {e.email}</a>
                  {e.phone && <a href={`tel:${e.phone.replace(/[^+\d]/g, "")}`} style={chip}><Icon name="phone" size={15} color={A.navy} /> {e.phone}</a>}
                  {e.childAge && <span style={chip}><Icon name="cake" size={15} color={A.navy} /> Wiek: {e.childAge}</span>}
                  {e.levelLabel && <span style={chip}><Icon name="layers" size={15} color={A.navy} /> {e.levelLabel}</span>}
                  {e.assignedGroupName && <span style={{ ...chip, background: "#e9f6ef", borderColor: "#cfe9d9", color: "#1f6b47" }}><Icon name="users" size={15} /> {e.assignedGroupName}</span>}
                  {e.lastMail && (() => {
                    const ms = MAIL_STATUS[e.lastMail.status];
                    return (
                      <span title={e.lastMail.error ?? undefined} style={{ ...chip, background: ms.bg, borderColor: "transparent", color: ms.color }}>
                        <Icon name={e.lastMail.status === "failed" ? "alert" : "mail"} size={15} />
                        {MAIL_KIND[e.lastMail.kind] ?? e.lastMail.kind}: {ms.label.toLowerCase()} · {new Date(e.lastMail.at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}
                      </span>
                    );
                  })()}
                </div>

                {e.note && (
                  <div style={{ display: "flex", gap: 9, marginTop: 12, fontSize: 14, lineHeight: 1.55, color: "#33495a", background: "#fffaf0", border: "1px solid #f4e3c1", borderRadius: 10, padding: "10px 12px" }}>
                    <span style={{ color: A.orange, marginTop: 2, flex: "none" }}><Icon name="message" size={16} /></span>
                    <span>{e.note}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "12px 20px", background: "#f8fbfd", borderTop: `1px solid ${A.line}` }}>
                {(e.status === "pending" || e.status === "reserve") && (
                  <>
                    <select aria-label="Grupa" value={groupChoice[e._id] ?? ""} onChange={(ev) => setGroupChoice((g) => ({ ...g, [e._id]: ev.target.value }))} style={{ ...input, width: "auto", minWidth: 220, flex: "1 1 220px", maxWidth: 320, padding: "9px 12px" }}>
                      <option value="">— wybierz grupę —</option>
                      {groups?.map((g) => (
                        <option key={g._id} value={g._id}>{g.name}</option>
                      ))}
                    </select>
                    <button disabled={busy === e._id} style={btnPrimary} onClick={() => approve(e._id)}><Icon name="check" size={16} stroke={2.2} /> {e.status === "reserve" ? "Przydziel do grupy" : "Zaakceptuj"}</button>
                    {e.status === "pending" && (
                      <button disabled={busy === e._id} style={{ ...btnSecondary, color: "#6b4bbd", borderColor: "#d9cff3" }} onClick={() => putReserve(e._id)}>Lista rezerwowa</button>
                    )}
                    <button disabled={busy === e._id} style={btnGhost} onClick={() => reject(e._id)}>Odrzuć</button>
                  </>
                )}
                {e.status !== "pending" && (
                  <button disabled={busy === e._id} style={btnGhost} onClick={() => undo(e._id)}><Icon name="undo" size={15} /> Cofnij decyzję</button>
                )}
                <button disabled={busy === e._id} style={{ ...btnDanger, marginLeft: "auto" }} onClick={() => del(e._id)} aria-label="Usuń zgłoszenie"><Icon name="trash" size={15} /> Usuń</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
