# ALL SWIM — strona szkółki pływackiej

Strona WWW szkółki pływackiej **ALL SWIM** (Aleksandra Laskowska) z panelem
administracyjnym i kontami rodziców. Strona główna, nabór, grafik tygodniowy,
cennik, galeria, obozy, regulamin.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Convex** — backend: baza danych, funkcje, autoryzacja (Convex Auth), pliki
- Fonty: Baloo 2 + Nunito (Google Fonts)
- Hosting docelowy: Vercel

## Wymagania

- Node.js 20+ (zalecane LTS)
- Konto Convex (https://convex.dev) — poproś właściciela o **dodanie do projektu
  Convex**, żeby pracować na wspólnym backendzie (albo użyj własnego dev
  deploymentu do testów).

## Uruchomienie (lokalnie)

```bash
# 1. zależności
npm install

# 2. backend Convex — zaloguje i połączy z deploymentem,
#    dopisze CONVEX_DEPLOYMENT i NEXT_PUBLIC_CONVEX_URL do .env.local
npx convex dev

# 3. w drugim terminalu — frontend
npm run dev
```

Aplikacja: http://localhost:3000 · panel: http://localhost:3000/admin

> `.env.local` jest w `.gitignore` (zawiera sekrety) — wzór zmiennych jest w
> `.env.example`. Klucze Convex Auth (`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`)
> ustawione są jako **zmienne środowiskowe na deploymencie Convex**, nie w repo.

## Konto administratora

Pierwsza osoba: zarejestruj konto na `/login`, wejdź na `/admin` i kliknij
„Zostań administratorem" (działa, dopóki nie istnieje żaden admin). Kolejne role
nadaje się w panelu → **Użytkownicy**.

## Struktura

```
app/                 # strony Next.js (App Router)
  page.tsx           # strona główna (hero, nabór, cennik, galeria, obozy, regulamin)
  konto/             # panel rodzica
  admin/             # panel administratora (zgłoszenia, grafik tygodniowy, cennik, ...)
  login/             # logowanie / rejestracja
convex/              # backend: schema.ts + funkcje (queries/mutations) + auth
components/          # ConvexClientProvider + komponenty panelu (admin/)
public/              # logo i statyczne pliki
```

## Konwencje Convex

Przed pracą nad `convex/` przeczytaj `convex/_generated/ai/guidelines.md`
(walidatory argumentów, indeksy zamiast `filter`, autoryzacja po stronie
serwera). Autoryzacja: helpery w `convex/lib.ts` (`requireUser`, `requireAdmin`).
