"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

const DAY_NAMES = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

const C = { navy: "#0f5b8f", orange: "#e9a13b", grey: "#5a6b75", bg: "#f4fafe" };

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Oczekuje na decyzję", color: "#9a6a00", bg: "#fff3da" },
  approved: { label: "Zaakceptowane", color: "#1f8a5b", bg: "#e8f7ee" },
  rejected: { label: "Odrzucone", color: "#b4232a", bg: "#fdeaea" },
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  border: "1px solid #eaf2f8",
  boxShadow: "0 8px 22px rgba(15,91,143,0.07)",
  padding: 22,
};

export default function Konto() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me);
  const myEnroll = useQuery(api.enrollments.myEnrollments, isAuthenticated ? {} : "skip");
  const mySchedule = useQuery(api.schedule.mySchedule, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();
  const linkMine = useMutation(api.enrollments.linkMine);
  const router = useRouter();
  const [linkedDone, setLinkedDone] = useState(false);

  // Administrator trafia do panelu admina.
  useEffect(() => {
    if (!isLoading && me && me.role === "admin") router.replace("/admin");
  }, [isLoading, me, router]);

  // Podepnij zgłoszenia wysłane wcześniej na ten sam e-mail (po zalogowaniu).
  useEffect(() => {
    if (isAuthenticated && me && me.role !== "admin" && !linkedDone) {
      setLinkedDone(true);
      linkMine({}).catch(() => {});
    }
  }, [isAuthenticated, me, linkedDone, linkMine]);

  if (isLoading || (isAuthenticated && me === undefined)) {
    return <Center>Ładowanie…</Center>;
  }

  if (!isAuthenticated) {
    return (
      <Center>
        <h1 className="font-fredoka" style={{ fontSize: 24, color: C.navy, margin: "0 0 8px" }}>Moje konto</h1>
        <p style={{ color: C.grey, fontSize: 15, marginBottom: 20 }}>Zaloguj się, aby zobaczyć status zgłoszenia i swój harmonogram.</p>
        <Link href="/login" style={{ display: "inline-block", textDecoration: "none", fontWeight: 600, color: "#fff", background: C.orange, borderRadius: 999, padding: "12px 24px" }} className="font-fredoka">Przejdź do logowania</Link>
        <div style={{ marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 14, color: C.grey, textDecoration: "none", fontWeight: 700 }}>← Wróć na stronę główną</Link>
        </div>
      </Center>
    );
  }

  const sortedSchedule = mySchedule ? [...mySchedule].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)) : [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "var(--font-nunito)", color: "#1b3a4b" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e3eef5" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ALL SWIM" style={{ height: 40 }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ fontSize: 14, color: C.grey, textDecoration: "none", fontWeight: 700 }}>← Strona główna</Link>
            <button onClick={async () => { await signOut(); router.push("/"); }} className="font-fredoka" style={{ fontWeight: 700, fontSize: 14, color: C.navy, background: "#eef3f6", border: "none", borderRadius: 999, padding: "8px 16px", cursor: "pointer" }}>Wyloguj</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "28px 22px 60px" }}>
        <h1 className="font-fredoka" style={{ fontSize: 28, color: C.navy, margin: "0 0 4px" }}>Cześć!</h1>
        <p style={{ color: C.grey, fontSize: 14, margin: "0 0 24px" }}>Zalogowano jako {me?.email}</p>

        {/* Status zgłoszeń */}
        <h2 className="font-fredoka" style={{ fontSize: 18, color: C.navy, margin: "0 0 12px" }}>Twoje zgłoszenia</h2>
        {myEnroll === undefined ? (
          <p style={{ color: C.grey }}>Ładowanie…</p>
        ) : myEnroll.length === 0 ? (
          <div style={{ ...card, textAlign: "center" }}>
            <p style={{ color: C.grey, margin: "0 0 14px" }}>Nie masz jeszcze żadnego zgłoszenia.</p>
            <Link href="/#nabor" style={{ display: "inline-block", textDecoration: "none", fontWeight: 600, color: "#fff", background: C.orange, borderRadius: 999, padding: "11px 22px" }} className="font-fredoka">Wypełnij formularz naboru</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myEnroll.map((e) => {
              const st = STATUS[e.status];
              const date = new Date(e.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
              return (
                <div key={e._id} style={card}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <span className="font-fredoka" style={{ fontWeight: 700, fontSize: 17 }}>{e.name}</span>
                    {st && <span style={{ fontSize: 12, fontWeight: 800, color: st.color, background: st.bg, borderRadius: 999, padding: "3px 12px" }}>{st.label}</span>}
                  </div>
                  <div style={{ fontSize: 14, color: C.grey, marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                    {e.levelLabel && <span>📊 Poziom: {e.levelLabel}</span>}
                    {e.assignedGroupName && <span>👥 Przydzielona grupa: <strong style={{ color: C.navy }}>{e.assignedGroupName}</strong></span>}
                    {e.status === "approved" && !e.assignedGroupName && (
                      <span style={{ color: "#9a6a00" }}>⏳ Grupa i godziny zajęć pojawią się po zakończeniu naboru.</span>
                    )}
                    {e.decisionNote && <span>📝 {e.decisionNote}</span>}
                    <span style={{ fontSize: 12, color: "#9aabb5" }}>Zgłoszono: {date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Harmonogram */}
        <h2 className="font-fredoka" style={{ fontSize: 18, color: C.navy, margin: "28px 0 12px" }}>Mój harmonogram</h2>
        {sortedSchedule.length === 0 ? (
          <div style={{ ...card, color: C.grey }}>Po zaakceptowaniu zgłoszenia i przydzieleniu do grupy zobaczysz tu swoje terminy zajęć.</div>
        ) : (
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            {sortedSchedule.map((r, i) => (
              <div key={r._id} style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", padding: "14px 20px", borderTop: i ? "1px solid #eef4f8" : "none" }}>
                <div style={{ fontWeight: 800 }}>{DAY_NAMES[r.dayOfWeek]} · <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.startTime}–{r.endTime}</span></div>
                <div style={{ color: C.grey, fontSize: 14 }}>{r.groupName}{r.poolName ? ` · ${r.poolName}` : ""}{r.instructor ? ` · ${r.instructor}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 24, fontFamily: "var(--font-nunito)" }}>
      <div style={{ width: "min(440px,100%)", background: "#fff", borderRadius: 24, boxShadow: "0 16px 40px rgba(15,91,143,0.12)", padding: 32, textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}
