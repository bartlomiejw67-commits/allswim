"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const linkMine = useMutation(api.enrollments.linkMine);
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn("password", { email: email.trim(), password, flow });
      try { await linkMine({}); } catch { /* połączenie zgłoszeń best-effort */ }
      router.push("/konto");
    } catch (err) {
      const m = err as { data?: string; message?: string };
      setError(
        flow === "signUp"
          ? "Nie udało się utworzyć konta. Hasło min. 8 znaków, e-mail poprawny."
          : "Błędny e-mail lub hasło.",
      );
      void m;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(170deg,#2f8fcf 0%,#0d5286 100%)", padding: 24 }}>
      <div style={{ width: "min(420px,100%)", background: "#fff", borderRadius: 28, boxShadow: "0 24px 60px rgba(8,50,80,0.35)", padding: "38px 34px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ALL SWIM" style={{ height: 56 }} />
        </div>
        <h1 className="font-fredoka" style={{ textAlign: "center", margin: "0 0 4px", fontSize: 26, fontWeight: 700, color: "#0f5b8f" }}>
          {flow === "signIn" ? "Logowanie" : "Załóż konto"}
        </h1>
        <p style={{ textAlign: "center", color: "#5a6b75", fontSize: 14, margin: "0 0 24px" }}>Panel ALL SWIM</p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontWeight: 800, fontSize: 13, color: "#1b3a4b", marginBottom: 6 }}>E-mail</label>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="as-input" style={inputStyle} placeholder="twoj@email.pl" />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 800, fontSize: 13, color: "#1b3a4b", marginBottom: 6 }}>Hasło</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete={flow === "signUp" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="as-input"
                style={{ ...inputStyle, paddingRight: 48 }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                title={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, border: "none", background: "none", cursor: "pointer", color: "#5a6b75", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.4 4.3M6.6 6.6A16 16 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.1-.9" />
                    <path d="M3 3l18 18" />
                    <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <div style={{ fontSize: 13, fontWeight: 700, color: "#b4232a", background: "#fdeaea", borderRadius: 12, padding: "10px 12px" }}>{error}</div>}

          <button type="submit" disabled={loading} className="font-fredoka" style={{ marginTop: 4, fontWeight: 600, fontSize: 16, color: "#fff", background: loading ? "#caa46a" : "#e9a13b", border: "none", borderRadius: 999, padding: "14px 24px", cursor: loading ? "default" : "pointer", boxShadow: "0 10px 24px rgba(233,161,59,0.35)" }}>
            {loading ? "Chwila…" : flow === "signIn" ? "Zaloguj się" : "Utwórz konto"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 14, color: "#5a6b75" }}>
          {flow === "signIn" ? "Nie masz konta? " : "Masz już konto? "}
          <button onClick={() => { setError(null); setFlow(flow === "signIn" ? "signUp" : "signIn"); }} style={{ background: "none", border: "none", color: "#0f5b8f", fontWeight: 800, cursor: "pointer", textDecoration: "underline", fontSize: 14 }}>
            {flow === "signIn" ? "Zarejestruj się" : "Zaloguj się"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid #eef3f6" }}>
          <Link href="/" style={{ fontSize: 14, color: "#5a6b75", textDecoration: "none", fontWeight: 700 }}>← Wróć na stronę główną</Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 15,
  padding: "12px 14px",
  borderRadius: 14,
  border: "2px solid #e3eef5",
  background: "#f8fcff",
  color: "#1b3a4b",
};
