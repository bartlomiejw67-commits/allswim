"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, btnDanger } from "@/components/admin/ui";

export default function Page() {
  const users = useQuery(api.users.list);
  const me = useQuery(api.users.me);
  const setRole = useMutation(api.users.setRole);
  const remove = useMutation(api.users.remove);
  const [busy, setBusy] = useState<string | null>(null);

  async function changeRole(id: string, role: "admin" | "user") {
    setBusy(id);
    try {
      await setRole({ userId: id as Id<"users">, role });
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się zmienić roli.");
    } finally {
      setBusy(null);
    }
  }

  async function del(id: string, email: string | undefined) {
    if (!confirm(`Usunąć konto ${email ?? ""}? Tej operacji nie można cofnąć.`)) return;
    setBusy(id);
    try {
      await remove({ userId: id as Id<"users"> });
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się usunąć konta.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Użytkownicy</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 20px" }}>Konta rodziców i administratorów. Możesz zmienić rolę lub usunąć konto. Własnego konta nie można zmienić ani usunąć.</p>

      {users === undefined && <p style={{ color: A.grey }}>Ładowanie…</p>}
      {users && users.length === 0 && <div style={{ ...card, textAlign: "center", color: A.grey }}>Brak użytkowników.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 820 }}>
        {users?.map((u) => {
          const self = me?._id === u._id;
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
          return (
            <div key={u._id} style={card}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="font-fredoka" style={{ fontWeight: 700, fontSize: 16 }}>{u.email ?? "—"}</span>
                    {u.role === "admin" && <span style={{ fontSize: 11, fontWeight: 800, color: "#1f6feb", background: "#e7f0ff", borderRadius: 999, padding: "3px 10px" }}>ADMIN</span>}
                    {self && <span style={{ fontSize: 11, fontWeight: 800, color: A.grey, background: "#eef3f6", borderRadius: 999, padding: "3px 10px" }}>to Ty</span>}
                  </div>
                  {name && <div style={{ fontSize: 13, color: A.grey, marginTop: 4 }}>{name}</div>}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    value={u.role}
                    disabled={self || busy === u._id}
                    onChange={(e) => changeRole(u._id, e.target.value as "admin" | "user")}
                    style={{ ...input, width: 170, opacity: self ? 0.5 : 1 }}
                  >
                    <option value="user">Użytkownik</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <button style={{ ...btnDanger, opacity: self ? 0.4 : 1 }} disabled={self || busy === u._id} onClick={() => del(u._id, u.email)}>Usuń</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
