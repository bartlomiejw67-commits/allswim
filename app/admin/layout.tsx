"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { A, ADMIN_NAV, btnPrimary, btnGhost } from "@/components/admin/ui";

function Center({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: A.bg, padding: 24 }}>
      <div style={{ width: "min(440px,100%)", background: "#fff", borderRadius: 24, boxShadow: "0 16px 40px rgba(15,91,143,0.12)", padding: 32, textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me);
  const claimAdmin = useMutation(api.users.claimAdmin);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return <Center><p style={{ color: A.grey }}>Ładowanie…</p></Center>;
  }

  if (!isAuthenticated) {
    return (
      <Center>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ALL SWIM" style={{ height: 52, marginBottom: 16 }} />
        <h1 className="font-fredoka" style={{ fontSize: 22, color: A.navy, margin: "0 0 8px" }}>Panel administratora</h1>
        <p style={{ color: A.grey, fontSize: 14, marginBottom: 20 }}>Zaloguj się, aby zarządzać treścią strony.</p>
        <Link href="/login" style={{ ...btnPrimary, textDecoration: "none", display: "inline-block" }}>Przejdź do logowania</Link>
        <div style={{ marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 13, color: A.grey, textDecoration: "none", fontWeight: 700 }}>← Wróć na stronę główną</Link>
        </div>
      </Center>
    );
  }

  if (me === undefined) {
    return <Center><p style={{ color: A.grey }}>Ładowanie konta…</p></Center>;
  }

  if (!me || me.role !== "admin") {
    return (
      <Center>
        <h1 className="font-fredoka" style={{ fontSize: 22, color: A.navy, margin: "0 0 8px" }}>Brak uprawnień</h1>
        <p style={{ color: A.grey, fontSize: 14, marginBottom: 20 }}>
          Twoje konto ({me?.email}) nie ma roli administratora. Jeśli to pierwsza konfiguracja, przejmij rolę administratora.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            style={btnPrimary}
            onClick={async () => {
              try {
                await claimAdmin();
              } catch (e) {
                alert((e as { data?: string }).data ?? "Administrator już istnieje. Skontaktuj się z właścicielem konta admina.");
              }
            }}
          >
            Zostań administratorem
          </button>
          <button style={btnGhost} onClick={async () => { await signOut(); router.push("/"); }}>Wyloguj</button>
        </div>
      </Center>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: A.bg, fontFamily: "var(--font-nunito), sans-serif", color: "#1b3a4b" }}>
      <aside style={{ width: 240, flexShrink: 0, background: "#fff", borderRight: `1px solid ${A.line}`, padding: "20px 14px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "0 8px 16px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ALL SWIM" style={{ height: 38 }} />
        </Link>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ADMIN_NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "10px 12px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: active ? "#fff" : "#1b3a4b", background: active ? A.navy : "transparent" }}>
                <span>{n.icon}</span> {n.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ borderTop: `1px solid ${A.line}`, marginTop: 16, paddingTop: 16 }}>
          <Link href="/" style={{ fontSize: 13, color: A.grey, textDecoration: "none", display: "block", padding: "6px 12px" }}>← Podgląd strony</Link>
          <button style={{ ...btnGhost, width: "100%", marginTop: 8 }} onClick={async () => { await signOut(); router.push("/"); }}>Wyloguj ({me.email})</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1100 }}>{children}</main>
    </div>
  );
}
