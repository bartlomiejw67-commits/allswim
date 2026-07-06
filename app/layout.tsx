import type { Metadata } from "next";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://allswim.pl"),
  title: "Nauka pływania dla dzieci w Tczewie – ALL SWIM",
  description:
    "ALL SWIM – szkółka pływacka w Tczewie. Nauka pływania dla dzieci: małe grupy, cierpliwe i bezpieczne podejście, doświadczona instruktorka. Zapisz dziecko na zajęcia.",
  keywords: [
    "nauka pływania Tczew",
    "nauka pływania dla dzieci Tczew",
    "szkółka pływacka Tczew",
    "lekcje pływania Tczew",
    "pływanie dzieci Tczew",
    "instruktor pływania Tczew",
    "ALL SWIM",
  ],
  applicationName: "ALL SWIM",
  authors: [{ name: "ALL SWIM" }],
  alternates: { canonical: "/" },
  icons: { icon: "/logo.png", apple: "/logo.png" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    title: "Nauka pływania dla dzieci w Tczewie – ALL SWIM",
    description:
      "Szkółka pływacka ALL SWIM w Tczewie. Cierpliwa, bezpieczna nauka pływania dla dzieci w małych grupach.",
    url: "/",
    siteName: "ALL SWIM",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "ALL SWIM – nauka pływania Tczew" }],
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Nauka pływania dla dzieci w Tczewie – ALL SWIM",
    description: "Szkółka pływacka ALL SWIM · nauka pływania dla dzieci · Tczew",
    images: ["/logo.png"],
  },
};

// Dane strukturalne (dla Google) — lokalna działalność w Tczewie.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: "ALL SWIM",
  description: "Szkółka pływacka – nauka pływania dla dzieci w Tczewie.",
  url: "https://allswim.pl",
  logo: "https://allswim.pl/logo.png",
  image: "https://allswim.pl/logo.png",
  telephone: "+48 601 180 250",
  email: "allswimkontakt@gmail.com",
  areaServed: { "@type": "City", name: "Tczew" },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Tczew",
    addressRegion: "pomorskie",
    addressCountry: "PL",
  },
  sport: "Swimming",
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
