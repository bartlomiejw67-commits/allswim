// Szablony maili + niskopoziomowa wysyłka przez Resend (https://resend.com).
// Maile NIE są wysyłane bezpośrednio: trafiają do skrzynki nadawczej (convex/outbox.ts),
// która zapisuje każdy mail, rozkłada wysyłkę w czasie i ponawia próby przy błędach.
// Zmienne środowiskowe Convex: RESEND_API_KEY, RESEND_FROM, RESEND_REPLY_TO, SITE_URL.

declare const process: { env: Record<string, string | undefined> };

export type EmailContent = { subject: string; html: string; text: string };

function layout(title: string, bodyHtml: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:540px;margin:0 auto;color:#1b3a4b">
    <div style="background:linear-gradient(135deg,#6cb4e0,#0f5b8f);color:#fff;padding:20px 24px;border-radius:16px 16px 0 0">
      <div style="font-size:22px;font-weight:800;letter-spacing:.5px">ALL SWIM</div>
      <div style="font-size:13px;opacity:.9">szkółka pływacka</div>
    </div>
    <div style="border:1px solid #e3eef5;border-top:none;border-radius:0 0 16px 16px;padding:24px;background:#fff">
      <h2 style="margin:0 0 14px;color:#0f5b8f;font-size:18px">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="text-align:center;color:#9aabb5;font-size:12px;padding:14px">© ALL SWIM</div>
  </div>`;
}

function accountLink() {
  const site = process.env.SITE_URL;
  if (!site) return "";
  return `<p style="margin:16px 0 0;font-size:14px"><a href="${site}/konto" style="color:#0f5b8f;font-weight:700">Zaloguj się, aby zobaczyć szczegóły →</a></p>`;
}

// Wersja tekstowa z HTML (mail z częścią tekstową rzadziej trafia do spamu).
function toText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h2|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

function build(subject: string, title: string, body: string): EmailContent {
  const html = layout(title, body);
  return { subject, html, text: toText(html) };
}

// --- Szablony (treść bez zmian względem wcześniejszej wersji) ---
export const tpl = {
  // Do administratora: nowe zgłoszenie w naborze.
  adminNewEnrollment(a: { childName: string; levelLabel: string | null; parentEmail: string; parentPhone: string | null; isContinuing: boolean }): EmailContent {
    return build(
      `Nowe zgłoszenie: ${a.childName}`,
      "Nowe zgłoszenie w naborze",
      `<p style="margin:0 0 8px;font-size:15px"><strong>${a.childName}</strong>${a.isContinuing ? " · <em>kontynuuje</em>" : " · nowy"}</p>
       <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7">
         ${a.levelLabel ? `<li>Poziom: ${a.levelLabel}</li>` : ""}
         <li>E-mail: ${a.parentEmail}</li>
         ${a.parentPhone ? `<li>Telefon: ${a.parentPhone}</li>` : ""}
       </ul>
       <p style="margin:16px 0 0;font-size:14px;color:#5a6b75">Zgłoszenie czeka na rozpatrzenie w panelu administratora.</p>`,
    );
  },

  // Do rodzica: potwierdzenie otrzymania zgłoszenia.
  participantReceived(a: { childName: string }): EmailContent {
    return build(
      "Dziękujemy za zgłoszenie — ALL SWIM",
      "Dziękujemy za zgłoszenie!",
      `<p style="margin:0;font-size:15px;line-height:1.6">Otrzymaliśmy zgłoszenie dla <strong>${a.childName}</strong>. Skontaktujemy się z propozycją grupy i terminu. Do zobaczenia w wodzie! 🌊</p>`,
    );
  },

  // Do rodzica: wypisanie z grupy / cofnięcie przydziału.
  participantRemoved(a: { childName: string; groupName: string | null }): EmailContent {
    return build(
      "Aktualizacja zgłoszenia — ALL SWIM",
      "Aktualizacja przydziału",
      `<p style="margin:0;font-size:15px;line-height:1.6">Przydział dla <strong>${a.childName}</strong>${a.groupName ? ` (grupa „${a.groupName}”)` : ""} został wycofany — wróciliśmy do ustalania grupy. Damy znać, gdy będzie nowy termin.</p>${accountLink()}`,
    );
  },

  // Do rodzica: akceptacja BEZ grupy (grupa nie ma jeszcze godzin).
  participantAccepted(a: { childName: string }): EmailContent {
    return build(
      "Zgłoszenie zaakceptowane — ALL SWIM",
      "Zgłoszenie zaakceptowane! 🎉",
      `<p style="margin:0;font-size:15px;line-height:1.6">Dobra wiadomość — zgłoszenie dla <strong>${a.childName}</strong> zostało <strong>zaakceptowane</strong>. Witamy w ALL SWIM! 🌊</p>
       <p style="margin:12px 0 0;font-size:15px;line-height:1.6">Decyzję o <strong>grupie i godzinach zajęć</strong> przekażemy wkrótce w osobnej wiadomości.</p>${accountLink()}`,
    );
  },

  // Do rodzica: przyjęcie do grupy z grupą i godzinami.
  participantAssigned(a: { childName: string; groupName: string; poolName: string | null; times: string }): EmailContent {
    return build(
      "Przyjęcie na zajęcia — ALL SWIM",
      "Dziecko przyjęte na zajęcia! 🎉",
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.6"><strong>${a.childName}</strong> został przyjęty na zajęcia:</p>
       <div style="background:#e8f4fb;border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.7">
         <strong>${a.groupName}</strong><br/>
         ${a.poolName ? `Basen: ${a.poolName}<br/>` : ""}
         ${a.times ? `Terminy: ${a.times}` : ""}
       </div>${accountLink()}`,
    );
  },

  // Do rodzica: odrzucenie zgłoszenia.
  participantRejected(a: { childName: string; note: string | null }): EmailContent {
    return build(
      "Informacja o zgłoszeniu — ALL SWIM",
      "Informacja o zgłoszeniu",
      `<p style="margin:0;font-size:15px;line-height:1.6">Niestety nie możemy obecnie przyjąć zgłoszenia dla <strong>${a.childName}</strong>.</p>
       ${a.note ? `<p style="margin:12px 0 0;font-size:14px;color:#5a6b75">${a.note}</p>` : ""}
       <p style="margin:12px 0 0;font-size:14px;color:#5a6b75">Zapraszamy do kontaktu i przy kolejnym naborze.</p>`,
    );
  },

  // Do rodzica: lista rezerwowa.
  participantReserve(a: { childName: string }): EmailContent {
    return build(
      "Lista rezerwowa — ALL SWIM",
      "Jesteście na liście rezerwowej 🌊",
      `<p style="margin:0;font-size:15px;line-height:1.6">Dziękujemy za zgłoszenie <strong>${a.childName}</strong>! 🌊</p>
       <p style="margin:12px 0 0;font-size:15px;line-height:1.6">Na ten moment grupy są pełne, więc jesteście na naszej <strong>liście rezerwowej</strong>. Gdy zwolni się miejsce, odezwiemy się jako pierwsi z propozycją grupy i terminu.</p>
       <p style="margin:12px 0 0;font-size:15px;line-height:1.6">Trzymamy dla Was miejsce w kolejce — do usłyszenia wkrótce!</p>${accountLink()}`,
    );
  },

  // Do rodzica: zmiana grupy/godzin.
  participantScheduleChanged(a: { childName: string; groupName: string; poolName: string | null; times: string }): EmailContent {
    return build(
      "Zmiana grafiku zajęć — ALL SWIM",
      "Zmiana grafiku zajęć",
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.6">Zaktualizowaliśmy zajęcia dla <strong>${a.childName}</strong>:</p>
       <div style="background:#e8f4fb;border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.7">
         <strong>${a.groupName}</strong><br/>
         ${a.poolName ? `Basen: ${a.poolName}<br/>` : ""}
         ${a.times ? `Terminy: ${a.times}` : ""}
       </div>${accountLink()}`,
    );
  },

  // Do osoby z listy powiadomień: nabór otwarty.
  waitlistOpened(): EmailContent {
    const site = process.env.SITE_URL;
    const cta = site
      ? `<p style="margin:18px 0 0"><a href="${site}/#nabor" style="background:#e9a13b;color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:12px 22px;display:inline-block">Wypełnij zgłoszenie →</a></p>`
      : "";
    return build(
      "Nabór otwarty — ALL SWIM 🌊",
      "Nabór jest już otwarty! 🌊",
      `<p style="margin:0;font-size:15px;line-height:1.6">Dobra wiadomość — w <strong>ALL SWIM</strong> ruszył nabór na zajęcia nauki pływania. Zapisałeś/aś się na liście powiadomień, więc dajemy znać jako pierwszym.</p>
       <p style="margin:12px 0 0;font-size:15px;line-height:1.6">Liczba miejsc jest ograniczona — zachęcamy do szybkiego zgłoszenia dziecka.</p>${cta}`,
    );
  },
};

// --- Niskopoziomowa wysyłka do Resend ---
export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string; retryable: boolean; retryAfterMs?: number; quota?: boolean; network?: boolean };

export async function sendViaResend(opts: { to: string; subject: string; html: string; text?: string; idempotencyKey: string }): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Brak RESEND_API_KEY w ustawieniach Convex.", retryable: false };
  const payload: Record<string, unknown> = {
    from: process.env.RESEND_FROM || "ALL SWIM <onboarding@resend.dev>",
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
  };
  if (opts.text) payload.text = opts.text;
  if (process.env.RESEND_REPLY_TO) payload.reply_to = process.env.RESEND_REPLY_TO;

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Ten sam klucz przy ponowieniu = Resend nie wyśle maila drugi raz.
        "Idempotency-Key": opts.idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Nie wiadomo, czy Resend przyjął maila — ponowienie z TYM SAMYM kluczem nie zdubluje wysyłki.
    return { ok: false, error: `Błąd połączenia z Resend: ${(e as Error).message}`, retryable: true, network: true };
  }

  const body = await res.text();
  if (res.ok) {
    let id = "";
    try { id = (JSON.parse(body) as { id?: string }).id ?? ""; } catch { /* brak id w odpowiedzi */ }
    return { ok: true, id };
  }

  let name = "";
  let message = body.slice(0, 300);
  try { const j = JSON.parse(body) as { name?: string; message?: string }; name = j.name ?? ""; message = j.message ?? message; } catch { /* odpowiedź nie-JSON */ }
  const retryAfter = Number(res.headers.get("retry-after"));
  const retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined;
  const error = `Resend ${res.status}${name ? ` (${name})` : ""}: ${message}`;

  if (res.status === 429) {
    const quota = /quota/i.test(name) || /quota/i.test(message);
    return { ok: false, error, retryable: true, retryAfterMs, quota };
  }
  if (res.status >= 500) return { ok: false, error, retryable: true, retryAfterMs };
  // 400/401/403/422 itp. — błąd trwały (zły adres, zły klucz): nie ponawiamy automatycznie.
  return { ok: false, error, retryable: false };
}
