import type { Metadata } from "next";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  // TODO: ustawić właściwą domenę po wdrożeniu na Vercel (dla poprawnych linków OG).
  metadataBase: new URL("https://allswim.pl"),
  title: "ALL SWIM – nauka pływania dla dzieci",
  description:
    "ALL SWIM – szkółka pływacka prowadzona przez Olę. Cierpliwa, bezpieczna nauka pływania dla dzieci. Małe grupy, dwa baseny w Tczewie.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  // PRZED STARTEM: strona ukryta przed wyszukiwarkami. Usuń przy publikacji.
  robots: { index: false, follow: false },
  openGraph: {
    title: "ALL SWIM – nauka pływania dla dzieci",
    description:
      "Cierpliwa, bezpieczna nauka pływania dla dzieci. Małe grupy, dwa baseny w Tczewie.",
    url: "/",
    siteName: "ALL SWIM",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "ALL SWIM" }],
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ALL SWIM – nauka pływania dla dzieci",
    description: "Nauka pływania dla dzieci · Tczew",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
