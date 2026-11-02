"use client";

import { Analytics } from "@vercel/analytics/next";

// Statystyki odwiedzin (Vercel Web Analytics) — bez ciasteczek i bez danych osobowych.
// Panel admina i logowanie pomijamy, żeby własne wejścia nie zawyżały liczb.
export default function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const path = new URL(event.url).pathname;
        if (path.startsWith("/admin") || path.startsWith("/login")) return null;
        return event;
      }}
    />
  );
}
