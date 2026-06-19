# Notatka dla programisty — ALL SWIM

Kontekst: przebudowa logiki **naboru** i **grafiku** oraz seria poprawek na stronie szkółki
(Next.js 16 + Convex). Backend pracuje na **dev** deploymencie Convex `grand-eagle-507`
(team `bartlomiej-c4184`). Maile są na razie **placeholderami** — czekają na Twoje podłączenie Resend.

---

## Co zostało zrobione

### 1. Rozdzielenie naboru od grafiku + nowy model danych
- **Grupa** = sam roster: `name` + `instructor` + `capacity`. **Bez poziomu i bez basenu.**
- **Poziom** = etykieta wybierana przez rodzica w formularzu (zapisywana na zgłoszeniu jako `levelLabel`).
- **Basen** wynika z terminów grupy — *cała grupa chodzi na jeden basen* (brak wyboru basenu per dziecko).
- **Usunięto tabelę `memberships`** — jedyne źródło prawdy o przydziale to `enrollments.assignedGroupId`.
  Roster, liczniki miejsc i harmonogram rodzica liczone z tego samego miejsca.
- Terminy zajęć: **poniedziałek–niedziela**, osobna siatka **dla każdego basenu** w panelu „Grafik".

### 2. Model „stan roboczy → Opublikuj zmiany" (`convex/publish.ts`)
- Zmiany w panelu są robocze. Rodzic widzi przydział i dostaje maile **dopiero po „Opublikuj zmiany"**.
- Na zgłoszeniu trzymany jest snapshot `published*` → liczony jest **diff** → maile tylko za realne zmiany.
- W popupie publikacji są **checkboxy** (które kategorie powiadomić) oraz przycisk **„Opublikuj bez maili"**.
- Kategorie zmian: `assigned` (przydział), `rejected` (odrzucenie), `scheduleChanged` (zmiana grupy/godzin),
  `removed` (wypisanie z grupy). „Przydział" wysyłany dopiero, gdy grupa ma już terminy (brak pustych maili).
- `scheduleLive` (widoczność grafiku) włącza się tylko przy **pierwszej** publikacji; ręczne ukrycie jest respektowane.

### 3. RODO
- Strona `/polityka-prywatnosci` (`app/polityka-prywatnosci/page.tsx`) — **szablon, wymaga weryfikacji prawnej**.
- **Wymagana zgoda** w formularzu naboru (checkbox + link), zapis momentu zgody w `enrollments.consentAt`.

### 4. Antyspam / walidacja formularza (`convex/enrollments.ts -> submit`)
- Walidacja formatu e-maila po stronie serwera, **honeypot** (ukryte pole), **blokada duplikatów**.

### 5. Lista oczekujących („Powiadom mnie")
- Tabela `waitlist` + publiczny zapis z banera przy zamkniętym naborze.
- Podgląd i usuwanie listy w panelu **Ustawienia i nabór**.

### 6. Zdjęcie sekcji „O mnie"
- Upload/zmiana/usunięcie zdjęcia w panelu **Ustawienia** (`settings.setAboutImage`, `aboutImageId`).

### 7. SEO / OG / favicon (`app/layout.tsx`).

---

## TWOJE DALSZE DZIAŁANIA

### A. Resend — podłączenie maili  ⬅️ najważniejsze
Wszystkie maile to `console.log` w **`convex/emails.ts`**. Każda funkcja dostaje już gotowe argumenty
(adres, imię dziecka, nazwa grupy, basen, godziny) — wystarczy złożyć treść i wywołać API Resend
zamiast `console.log`. Funkcje do wypełnienia:
- `sendAdminNewEnrollment` — do administratora o nowym zgłoszeniu (wysyłane od razu przy `submit`),
- `sendParticipantReceived` — potwierdzenie otrzymania zgłoszenia dla rodzica (od razu przy `submit`),
- `sendParticipantAssigned` — przydział do grupy (przy publikacji),
- `sendParticipantScheduleChanged` — zmiana grupy/godzin (przy publikacji),
- `sendParticipantRejected` — odrzucenie (przy publikacji),
- `sendParticipantRemoved` — wypisanie z grupy (przy publikacji).

To `internalAction` — możesz użyć `fetch` (lub SDK Resend z `"use node"`). Klucz trzymaj jako zmienną
środowiskową Convex (`RESEND_API_KEY`), a adres administratora bierz z `siteSettings.contactEmail`.
Podgląd bieżących logów: `npx convex logs`.

### B. Vercel + Convex produkcja
- Wdrożenie backendu na prod: `npx convex deploy`, a na **prod** deploymencie ustaw zmienne Convex Auth
  (`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`) oraz `RESEND_API_KEY`.
- Vercel: ustaw `NEXT_PUBLIC_CONVEX_URL` na URL **produkcyjnego** deploymentu Convex.
- W `app/layout.tsx` podmień `metadataBase: new URL("https://allswim.pl")` na właściwą domenę (poprawne linki OG).

### C. Polityka prywatności
- Treść w `app/polityka-prywatnosci/page.tsx` to szablon — zweryfikuj prawnie i uzupełnij
  (administrator danych, okresy przechowywania, podmioty przetwarzające).

### D. Drobne
- `.mcp.json` jest specyficzny dla maszyny (ścieżka projektu) — u Ciebie zostaje Twoja wersja.

---

## Świadomie odłożone (do wspólnej decyzji — to nowe moduły, nie poprawki)
Dashboard admina, eksport zgłoszeń do CSV / grafiku do ICS, obecności + status płatności,
rezygnacja przez rodzica z konta, migracja `<img>` → `next/image`, refaktor inline-styli.

---

## Uruchomienie lokalne
```bash
npm install
npx convex dev      # backend (dopisze CONVEX_DEPLOYMENT / NEXT_PUBLIC_CONVEX_URL do .env.local)
npm run dev         # frontend
```
Pierwszy administrator: zarejestruj konto na `/login`, wejdź na `/admin` → „Zostań administratorem".
