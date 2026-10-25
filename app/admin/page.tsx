"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, btnPrimary, btnSecondary, btnDanger, btnGhost, input, pageTitle, pageDesc, MAIL_KIND, MAIL_STATUS } from "@/components/admin/ui";
import { Icon } from "@/components/Icons";
import Hint from "@/components/admin/Hint";

type StatusFilter = "pending" | "approved" | "reserve" | "resigned" | "rejected" | "all";

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Oczekuje", color: "#9a6a00", bg: "#fff3da" },
  approved: { label: "Zaakceptowane", color: "#1f8a5b", bg: "#e8f7ee" },
  rejected: { label: "Odrzucone", color: "#b4232a", bg: "#fdeaea" },
  reserve: { label: "Lista rezerwowa", color: "#6b4bbd", bg: "#efeafc" },
  resigned: { label: "Rezygnacja", color: "#5b6b77", bg: "#eceff2" },
};

const fmtDate = (t: number) => new Date(t).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function AdminEnrollments() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const enrollments = useQuery(api.enrollments.list, filter === "all" ? {} : { status: filter });
  const groups = useQuery(api.groups.listForAdmin);
  const pendingCount = useQuery(api.enrollments.pendingCount);
  const decide = useMutation(api.enrollments.decide);
  const remove = useMutation(api.enrollments.remove);
  const unassign = useMutation(api.enrollments.unassign);
  const reserveM = useMutation(api.enrollments.reserve);
  const resignM = useMutation(api.enrollments.resign);
  const changeGroupM = useMutation(api.enrollments.changeGroup);

  const [groupChoice, setGroupChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>, fallback: string) {
    setBusy(id);
    try {
      await fn();
      setGroupChoice((g) => ({ ...g, [id]: "" }));
    } catch (e) {
      alert((e as { data?: string }).data ?? fallback);
    } finally {
      setBusy(null);
    }
  }

  function approve(id: string) {
    const gid = groupChoice[id];
    if (!gid) return alert("Najpierw wybierz grupę z listy obok przycisku.");
    run(id, () => decide({ id: id as Id<"enrollments">, approve: true, assignedGroupId: gid as Id<"groups"> }), "Nie udało się zaakceptować.");
  }

  function move(id: string, name: string, current: string | null) {
    const gid = groupChoice[id];
    if (!gid) return alert("Najpierw wybierz z listy grupę, do której przenieść dziecko.");
    const target = groups?.find((g) => g._id === gid)?.name ?? "wybranej grupy";
    if (!confirm(`Przenieść ${name}${current ? ` z grupy „${current}”` : ""} do „${target}”?\n\nPo opublikowaniu zmian rodzic dostanie mail „Zmiana grafiku” z nową grupą i godzinami.`)) return;
    run(id, () => changeGroupM({ id: id as Id<"enrollments">, groupId: gid as Id<"groups"> }), "Nie udało się przenieść.");
  }

  function resign(id: string, name: string, group: string | null) {
    if (!confirm(`Rezygnacja: ${name}${group ? ` (grupa „${group}”)` : ""}.\n\n• miejsce w grupie od razu się zwolni,\n• dziecko trafi do zakładki „Rezygnacje” — historia i rozliczenia płatności zostają,\n• rodzic dostanie potwierdzenie mailem dopiero po opublikowaniu zmian (można je odznaczyć).\n\nKontynuować?`)) return;
    run(id, () => resignM({ id: id as Id<"enrollments"> }), "Nie udało się zapisać rezygnacji.");
  }

  function reject(id: string) {
    run(id, () => decide({ id: id as Id<"enrollments">, approve: false }), "Nie udało się odrzucić.");
  }

  function putReserve(id: string) {
    run(id, () => reserveM({ id: id as Id<"enrollments"> }), "Nie udało się dodać do listy rezerwowej.");
  }

  function undo(id: string, status: string) {
    const msg =
      status === "approved"
        ? "Cofnąć do „Oczekujących”? Miejsce w grupie się zwolni.\n\nUwaga: po publikacji rodzic dostanie mail, że przydział został wycofany i że odezwiemy się z nowym terminem.\n• Dziecko kończy zajęcia? Użyj „Rezygnacja”.\n• Zmiana grupy? Użyj „Przenieś”."
        : status === "resigned" || status === "rejected"
          ? "Przywrócić zgłoszenie do „Oczekujących”? Potem można je normalnie przyjąć do grupy."
          : "Cofnąć do „Oczekujących”?";
    if (!confirm(msg)) return;
    run(id, () => unassign({ id: id as Id<"enrollments"> }), "Nie udało się cofnąć.");
  }

  function del(id: string, name: string, status: string) {
    const extra = status === "approved" ? "\n\nTo dziecko jest w grupie! Jeśli kończy zajęcia, kliknij Anuluj i użyj „Rezygnacja” — wtedy zostaje historia, a rodzic może dostać potwierdzenie." : "";
    if (!confirm(`Usunąć zgłoszenie „${name}” na stałe?\n\nZnika od razu (bez publikacji), bez maila do rodzica i bez śladu w historii. Używaj tylko przy pomyłkach i duplikatach.${extra}`)) return;
    run(id, () => remove({ id: id as Id<"enrollments"> }), "Nie udało się usunąć.");
  }

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: "Oczekujące" },
    { key: "approved", label: "Zaakceptowane" },
    { key: "reserve", label: "Lista rezerwowa" },
    { key: "resigned", label: "Rezygnacje" },
    { key: "rejected", label: "Odrzucone" },
    { key: "all", label: "Wszystkie" },
  ];

  const groupSelect = (id: string, placeholder: string, exclude?: string | null) => (
    <select aria-label="Grupa" value={groupChoice[id] ?? ""} onChange={(ev) => setGroupChoice((g) => ({ ...g, [id]: ev.target.value }))} style={{ ...input, width: "auto", minWidth: 220, flex: "1 1 220px", maxWidth: 340, padding: "9px 12px" }}>
      <option value="">{placeholder}</option>
      {groups?.filter((g) => g._id !== exclude).map((g) => (
        <option key={g._id} value={g._id}>
          {g.name} — {g.freeSpots > 0 ? `wolne: ${g.freeSpots}/${g.capacity}` : "pełna"}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      <h1 className="font-fredoka" style={pageTitle}>Zgłoszenia naboru</h1>
      <p style={pageDesc}>Wszystkie dzieci i ich status. Osoby kontynuujące są wyżej na liście.</p>

      <Hint id="zgloszenia">
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
          <li><strong>Nowe zgłoszenie</strong> (Oczekujące): wybierz grupę i kliknij <strong>Zaakceptuj</strong>. Brak miejsc: <strong>Lista rezerwowa</strong>. Nie przyjmujemy: <strong>Odrzuć</strong>.</li>
          <li><strong>Zwolniło się miejsce</strong>: Lista rezerwowa → wybierz grupę → <strong>Przydziel do grupy</strong>.</li>
          <li><strong>Zmiana grupy</strong>: Zaakceptowane → wybierz nową grupę → <strong>Przenieś</strong>. Rodzic dostanie nowe godziny.</li>
          <li><strong>Dziecko kończy zajęcia</strong> (rodzic dał znać): <strong>Rezygnacja</strong>. Miejsce się zwalnia, historia i płatności zostają.</li>
          <li><strong>Nic nie idzie do rodziców od razu.</strong> Karty z etykietą „czeka na publikację” są widoczne tylko tutaj. Gdy skończysz, kliknij <strong>Opublikuj</strong> na górze strony — tam zobaczysz, kto jaki mail dostanie.</li>
          <li><strong>Usuń</strong> tylko przy pomyłkach i duplikatach (kasuje bez śladu). Każdą inną decyzję można cofnąć.</li>
        </ul>
      </Hint>

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
          const initials = e.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
          const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14, color: "#33495a", background: "#f3f7fa", border: `1px solid ${A.line}`, borderRadius: 9, padding: "6px 10px", textDecoration: "none", maxWidth: "100%", overflowWrap: "anywhere" };
          const isBusy = busy === e._id;
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
                      {!e.isPublished && (
                        <span title="Ta zmiana nie jest jeszcze widoczna dla rodzica. Kliknij „Opublikuj” na górze strony." style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#8a5c00", background: "#fff4e0", border: "1px dashed #e9c98a", borderRadius: 999, padding: "2px 10px" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: A.orange }} /> czeka na publikację
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "#8a9ba7", marginTop: 3 }}>
                      Zgłoszono {fmtDate(e._creationTime)}
                      {e.status === "resigned" && e.resignedAt && <> · rezygnacja {fmtDate(e.resignedAt)}</>}
                    </div>
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
                      <span title={e.lastMail.error ?? "Ostatni mail wysłany do rodzica"} style={{ ...chip, background: ms.bg, borderColor: "transparent", color: ms.color }}>
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
                {e.status === "pending" && (
                  <>
                    {groupSelect(e._id, "— wybierz grupę —")}
                    <button disabled={isBusy} style={btnPrimary} onClick={() => approve(e._id)}><Icon name="check" size={16} stroke={2.2} /> Zaakceptuj</button>
                    <button disabled={isBusy} style={{ ...btnSecondary, color: "#6b4bbd", borderColor: "#d9cff3" }} onClick={() => putReserve(e._id)}>Lista rezerwowa</button>
                    <button disabled={isBusy} style={btnGhost} onClick={() => reject(e._id)}>Odrzuć</button>
                  </>
                )}
                {e.status === "reserve" && (
                  <>
                    {groupSelect(e._id, "— wybierz grupę —")}
                    <button disabled={isBusy} style={btnPrimary} onClick={() => approve(e._id)}><Icon name="check" size={16} stroke={2.2} /> Przydziel do grupy</button>
                    <button disabled={isBusy} style={btnGhost} onClick={() => reject(e._id)}>Odrzuć</button>
                    <button disabled={isBusy} style={btnGhost} onClick={() => undo(e._id, e.status)}><Icon name="undo" size={15} /> Do oczekujących</button>
                  </>
                )}
                {e.status === "approved" && (
                  <>
                    {groupSelect(e._id, "— przenieś do grupy… —", e.assignedGroupId)}
                    <button disabled={isBusy} style={btnSecondary} onClick={() => move(e._id, e.name, e.assignedGroupName)}><Icon name="arrowRight" size={15} /> Przenieś</button>
                    <button disabled={isBusy} style={{ ...btnSecondary, color: "#5b6b77", borderColor: "#d5dde3" }} onClick={() => resign(e._id, e.name, e.assignedGroupName)}><Icon name="logOut" size={15} /> Rezygnacja</button>
                    <button disabled={isBusy} style={btnGhost} onClick={() => undo(e._id, e.status)} title="Zdejmuje przydział i wraca do oczekujących (rodzic dostanie mail o wycofaniu przydziału)"><Icon name="undo" size={15} /> Do oczekujących</button>
                  </>
                )}
                {(e.status === "rejected" || e.status === "resigned") && (
                  <button disabled={isBusy} style={btnGhost} onClick={() => undo(e._id, e.status)}><Icon name="undo" size={15} /> Przywróć do oczekujących</button>
                )}
                <button disabled={isBusy} style={{ ...btnDanger, marginLeft: "auto" }} onClick={() => del(e._id, e.name, e.status)} aria-label="Usuń zgłoszenie" title="Tylko pomyłki i duplikaty — usuwa na stałe"><Icon name="trash" size={15} /> Usuń</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
