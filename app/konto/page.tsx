"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { KontoView, KC } from "@/components/KontoView";

// Konto rodzica: logowanie/uprawnienia i dane; wygląd w components/KontoView.tsx.
// Rodzic widzi stan OPUBLIKOWANY (status, grupa, godziny).
export default function Konto() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me);
  const myEnroll = useQuery(api.enrollments.myEnrollments, isAuthenticated ? {} : "skip");
  const mySchedule = useQuery(api.schedule.mySchedule, isAuthenticated ? {} : "skip");
  const settings = useQuery(api.settings.get);
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
    return <Center><p style={{ color: KC.grey, margin: 0 }}>Ładowanie…</p></Center>;
  }

  if (!isAuthenticated) {
    return (
      <Center>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ALL SWIM" style={{ height: 54, marginBottom: 16 }} />
        <h1 className="font-fredoka" style={{ fontSize: 24, color: KC.navyDeep, margin: "0 0 8px" }}>Moje konto</h1>
        <p style={{ color: KC.grey, fontSize: 15, margin: "0 0 22px", lineHeight: 1.55 }}>Zaloguj się, aby zobaczyć status zgłoszenia, grupę i plan zajęć dziecka.</p>
        <Link href="/login" className="font-fredoka" style={{ display: "block", textDecoration: "none", fontWeight: 600, color: "#fff", background: KC.orange, borderRadius: 14, padding: "13px 24px" }}>Przejdź do logowania</Link>
        <div style={{ marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 14, color: KC.grey, textDecoration: "none", fontWeight: 600 }}>← Wróć na stronę główną</Link>
        </div>
      </Center>
    );
  }

  return (
    <KontoView
      email={me?.email ?? ""}
      firstName={me?.firstName}
      enrollments={myEnroll}
      schedule={mySchedule}
      contactPhone={settings?.contactPhone || ""}
      contactEmail={settings?.contactEmail || ""}
      onSignOut={async () => { await signOut(); router.push("/"); }}
    />
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(165deg,#e8f3fb,#f2f6fa)", padding: 24, fontFamily: "var(--font-nunito)" }}>
      <div style={{ width: "min(440px,100%)", background: "#fff", borderRadius: 22, border: `1px solid ${KC.line}`, boxShadow: "0 24px 60px rgba(16,42,67,0.12)", padding: "34px 30px", textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}
