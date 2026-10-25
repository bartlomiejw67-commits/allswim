"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { A, ADMIN_NAV, btnPrimary, btnGhost } from "@/components/admin/ui";
import { Icon } from "@/components/Icons";
import PublishBar from "@/components/admin/PublishBar";

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="adm" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "linear-gradient(165deg,#e8f3fb,#f2f6fa)" }}>
      <div style={{ width: "min(440px,100%)", background: "#fff", borderRadius: 22, border: `1px solid ${A.line}`, boxShadow: "0 24px 60px rgba(16,42,67,0.12)", padding: "34px 30px", textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

// Grupy nawigacji w kolejności występowania.
const GROUPS = ADMIN_NAV.reduce<string[]>((acc, n) => (acc.includes(n.group) ? acc : [...acc, n.group]), []);

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me);
  const isAdmin = me?.role === "admin";
  const pendingCount = useQuery(api.enrollments.pendingCount, isAdmin ? {} : "skip");
  const claimAdmin = useMutation(api.users.claimAdmin);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  // Na telefonie: po przejściu do innej zakładki chowamy szufladę nawigacji.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  if (isLoading) {
    return <Center><p style={{ color: A.grey, margin: 0 }}>Ładowanie…</p></Center>;
  }

  if (!isAuthenticated) {
    return (
      <Center>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ALL SWIM" style={{ height: 54, marginBottom: 18 }} />
        <h1 className="font-fredoka" style={{ fontSize: 23, color: A.navyDeep, margin: "0 0 8px" }}>Panel administratora</h1>
        <p style={{ color: A.grey, fontSize: 14.5, margin: "0 0 22px" }}>Zaloguj się, aby zarządzać treścią strony.</p>
        <Link href="/login" style={{ ...btnPrimary, textDecoration: "none", width: "100%" }}>Przejdź do logowania</Link>
        <div style={{ marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 13.5, color: A.grey, textDecoration: "none", fontWeight: 600 }}>← Wróć na stronę główną</Link>
        </div>
      </Center>
    );
  }

  if (me === undefined) {
    return <Center><p style={{ color: A.grey, margin: 0 }}>Ładowanie konta…</p></Center>;
  }

  if (!me || me.role !== "admin") {
    return (
      <Center>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, color: A.orange }}><Icon name="alert" size={34} /></div>
        <h1 className="font-fredoka" style={{ fontSize: 23, color: A.navyDeep, margin: "0 0 8px" }}>Brak uprawnień</h1>
        <p style={{ color: A.grey, fontSize: 14.5, margin: "0 0 22px", lineHeight: 1.55 }}>
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

  const current = ADMIN_NAV.find((n) => n.href === pathname);

  return (
    <div className="adm" style={{ display: "flex", fontFamily: "var(--font-nunito), sans-serif" }}>
      <div className="adm-overlay" data-open={navOpen} onClick={() => setNavOpen(false)} />

      <aside className="adm-side" data-open={navOpen}>
        <Link href="/" className="adm-logo" aria-label="Strona główna">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ALL SWIM" style={{ height: 36, display: "block" }} />
        </Link>

        <nav aria-label="Nawigacja panelu">
          {GROUPS.map((g) => (
            <div key={g}>
              <div className="adm-group">{g}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {ADMIN_NAV.filter((n) => n.group === g).map((n) => {
                  const active = pathname === n.href;
                  const badge = n.href === "/admin" && pendingCount ? pendingCount : 0;
                  return (
                    <Link key={n.href} href={n.href} className="adm-link" data-active={active} aria-current={active ? "page" : undefined}>
                      <Icon name={n.icon} size={19} />
                      <span>{n.label}</span>
                      {badge > 0 && <span className="adm-badge" title="Oczekujące zgłoszenia">{badge}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noreferrer" className="adm-link">
            <Icon name="externalLink" size={18} /> Zobacz stronę
          </a>
          <div className="adm-user" title={me.email ?? ""}>{me.email}</div>
          <button
            className="adm-link"
            style={{ background: "none", border: "none", width: "100%", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
            onClick={async () => { await signOut(); router.push("/"); }}
          >
            <Icon name="logOut" size={18} /> Wyloguj
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <button className="adm-burger" onClick={() => setNavOpen(true)} aria-label="Otwórz menu" style={{ alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 11, border: `1.5px solid ${A.line}`, background: "#fff", color: A.navy, cursor: "pointer" }}>
            <Icon name="menu" size={21} stroke={2} />
          </button>
          <div className="adm-crumb" style={{ alignItems: "center", gap: 8, fontSize: 14, color: A.grey }}>
            <span>Panel</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ fontWeight: 700, color: A.navyDeep }}>{current?.label ?? "Administracja"}</span>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <PublishBar />
          </div>
        </header>
        <main className="adm-content">{children}</main>
      </div>
    </div>
  );
}
