"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const C = { navy: "#0f5b8f", orange: "#e9a13b", grey: "#5a6b75", bg: "#f4fafe" };

export default function PrivacyPolicy() {
  const settings = useQuery(api.settings.get);
  const email = settings?.contactEmail || "kontakt@allswim.pl";
  const phone = settings?.contactPhone || "";
  const address = settings?.contactAddress || "Tczew";

  const h2: React.CSSProperties = { fontWeight: 700, fontSize: 20, color: C.navy, margin: "26px 0 8px" };
  const p: React.CSSProperties = { fontSize: 15, lineHeight: 1.7, color: "#1b3a4b", margin: "0 0 8px" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "var(--font-nunito), sans-serif", color: "#1b3a4b" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e3eef5" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ALL SWIM" style={{ height: 40 }} />
          </Link>
          <Link href="/" style={{ fontSize: 14, color: C.grey, textDecoration: "none", fontWeight: 700 }}>← Strona główna</Link>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 22px 64px" }}>
        <h1 className="font-fredoka" style={{ fontSize: 30, color: C.navy, margin: "0 0 6px" }}>Polityka prywatności</h1>
        <p style={{ color: C.grey, fontSize: 14, margin: "0 0 8px" }}>
          Informacja o przetwarzaniu danych osobowych w szkółce pływackiej ALL SWIM.
        </p>

        <h2 style={h2}>1. Administrator danych</h2>
        <p style={p}>
          Administratorem danych jest szkółka pływacka <strong>ALL SWIM</strong> (Aleksandra Laskowska){address ? `, ${address}` : ""}.
          Kontakt: <a href={`mailto:${email}`} style={{ color: C.navy, fontWeight: 700 }}>{email}</a>{phone ? `, tel. ${phone}` : ""}.
        </p>

        <h2 style={h2}>2. Jakie dane zbieramy</h2>
        <p style={p}>
          W formularzu naboru zbieramy: imię i nazwisko dziecka, wiek dziecka, wybrany poziom zaawansowania oraz dane
          kontaktowe rodzica/opiekuna (adres e-mail, numer telefonu) i ewentualne uwagi przekazane w zgłoszeniu.
        </p>

        <h2 style={h2}>3. Cel i podstawa prawna</h2>
        <p style={p}>
          Dane przetwarzamy w celu rozpatrzenia zgłoszenia, kontaktu, organizacji zajęć i ich harmonogramu. Podstawą
          przetwarzania jest zgoda (art. 6 ust. 1 lit. a RODO) oraz podjęcie działań przed zawarciem i wykonanie umowy
          o świadczenie zajęć (art. 6 ust. 1 lit. b RODO).
        </p>

        <h2 style={h2}>4. Okres przechowywania</h2>
        <p style={p}>
          Dane przechowujemy przez czas niezbędny do obsługi zgłoszenia i prowadzenia zajęć, a po ich zakończeniu — do
          czasu cofnięcia zgody lub przedawnienia ewentualnych roszczeń.
        </p>

        <h2 style={h2}>5. Odbiorcy danych</h2>
        <p style={p}>
          Dane mogą być powierzone dostawcom usług technicznych (hosting, system rezerwacji/poczty) wyłącznie w zakresie
          niezbędnym do działania serwisu. Nie sprzedajemy danych ani nie przekazujemy ich poza tych dostawców.
        </p>

        <h2 style={h2}>6. Twoje prawa</h2>
        <p style={p}>
          Masz prawo dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, przenoszenia danych
          oraz cofnięcia zgody w dowolnym momencie (bez wpływu na zgodność z prawem przetwarzania sprzed cofnięcia).
          Przysługuje Ci też skarga do Prezesa Urzędu Ochrony Danych Osobowych. W sprawach danych pisz na{" "}
          <a href={`mailto:${email}`} style={{ color: C.navy, fontWeight: 700 }}>{email}</a>.
        </p>

        <h2 style={h2}>7. Dobrowolność</h2>
        <p style={p}>
          Podanie danych jest dobrowolne, ale niezbędne do rozpatrzenia zgłoszenia i udziału w zajęciach.
        </p>

        <p style={{ ...p, marginTop: 28, fontSize: 13, color: C.grey }}>
          Dokument ma charakter informacyjny i wymaga weryfikacji pod kątem aktualnego stanu prawnego oraz faktycznego
          sposobu przetwarzania danych.
        </p>
      </main>
    </div>
  );
}
