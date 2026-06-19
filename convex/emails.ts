import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Wysyłka maili przez Resend (https://resend.com).
// Klucz API trzymany jest jako zmienna środowiskowa Convex: RESEND_API_KEY.
// Nadawca: RESEND_FROM (domyślnie testowy adres Resend — działa zanim
// podepniesz własną domenę; UWAGA: bez zweryfikowanej domeny Resend dostarcza
// maile tylko na adres właściciela konta Resend).
// Funkcje są wywoływane przez ctx.scheduler.runAfter z mutacji (submit/publish).

declare const process: { env: Record<string, string | undefined> };

async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "ALL SWIM <onboarding@resend.dev>";
  // Adres, na który trafią odpowiedzi rodziców (np. skrzynka Gmail szkółki).
  const replyTo = process.env.RESEND_REPLY_TO;
  if (!apiKey) {
    console.log(`[email:brak-klucza] do ${opts.to} — "${opts.subject}"`);
    return;
  }
  const payload: Record<string, unknown> = {
    from,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
  };
  if (replyTo) payload.reply_to = replyTo;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`[email] Resend ${res.status}: ${await res.text()}`);
  }
}

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

// Do administratora: nowe zgłoszenie w naborze (od razu przy submit).
export const sendAdminNewEnrollment = internalAction({
  args: {
    to: v.string(),
    childName: v.string(),
    levelLabel: v.union(v.string(), v.null()),
    parentEmail: v.string(),
    parentPhone: v.union(v.string(), v.null()),
    isContinuing: v.boolean(),
  },
  handler: async (_ctx, args) => {
    const html = layout(
      "Nowe zgłoszenie w naborze",
      `<p style="margin:0 0 8px;font-size:15px"><strong>${args.childName}</strong>${args.isContinuing ? " · <em>kontynuuje</em>" : " · nowy"}</p>
       <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7">
         ${args.levelLabel ? `<li>Poziom: ${args.levelLabel}</li>` : ""}
         <li>E-mail: ${args.parentEmail}</li>
         ${args.parentPhone ? `<li>Telefon: ${args.parentPhone}</li>` : ""}
       </ul>
       <p style="margin:16px 0 0;font-size:14px;color:#5a6b75">Zgłoszenie czeka na rozpatrzenie w panelu administratora.</p>`,
    );
    await sendEmail({ to: args.to, subject: `Nowe zgłoszenie: ${args.childName}`, html });
  },
});

// Do rodzica: potwierdzenie otrzymania zgłoszenia (od razu po wysłaniu formularza).
export const sendParticipantReceived = internalAction({
  args: { to: v.string(), childName: v.string() },
  handler: async (_ctx, args) => {
    const html = layout(
      "Dziękujemy za zgłoszenie!",
      `<p style="margin:0;font-size:15px;line-height:1.6">Otrzymaliśmy zgłoszenie dla <strong>${args.childName}</strong>. Skontaktujemy się z propozycją grupy i terminu. Do zobaczenia w wodzie! 🌊</p>`,
    );
    await sendEmail({ to: args.to, subject: "Dziękujemy za zgłoszenie — ALL SWIM", html });
  },
});

// Do uczestnika: wypisanie z grupy / cofnięcie przydziału (po publikacji).
export const sendParticipantRemoved = internalAction({
  args: { to: v.string(), childName: v.string(), groupName: v.union(v.string(), v.null()) },
  handler: async (_ctx, args) => {
    const html = layout(
      "Aktualizacja przydziału",
      `<p style="margin:0;font-size:15px;line-height:1.6">Przydział dla <strong>${args.childName}</strong>${args.groupName ? ` (grupa „${args.groupName}”)` : ""} został wycofany — wróciliśmy do ustalania grupy. Damy znać, gdy będzie nowy termin.</p>${accountLink()}`,
    );
    await sendEmail({ to: args.to, subject: "Aktualizacja zgłoszenia — ALL SWIM", html });
  },
});

// Do uczestnika: przydzielenie do grupy (po publikacji zatwierdzonej osoby).
export const sendParticipantAssigned = internalAction({
  args: {
    to: v.string(),
    childName: v.string(),
    groupName: v.string(),
    poolName: v.union(v.string(), v.null()),
    times: v.string(),
  },
  handler: async (_ctx, args) => {
    const html = layout(
      "Zgłoszenie zaakceptowane! 🎉",
      `<p style="margin:0;font-size:15px;line-height:1.6">Dobra wiadomość — zgłoszenie dla <strong>${args.childName}</strong> zostało <strong>zaakceptowane</strong>. Witamy w ALL SWIM! 🌊</p>
       <p style="margin:12px 0 0;font-size:15px;line-height:1.6">Decyzję o <strong>grupie i godzinach zajęć</strong> przekażemy wkrótce w osobnej wiadomości.</p>${accountLink()}`,
    );
    await sendEmail({ to: args.to, subject: "Zgłoszenie zaakceptowane — ALL SWIM", html });
  },
});

// Do uczestnika: odrzucenie zgłoszenia (po publikacji).
export const sendParticipantRejected = internalAction({
  args: { to: v.string(), childName: v.string(), note: v.union(v.string(), v.null()) },
  handler: async (_ctx, args) => {
    const html = layout(
      "Informacja o zgłoszeniu",
      `<p style="margin:0;font-size:15px;line-height:1.6">Niestety nie możemy obecnie przyjąć zgłoszenia dla <strong>${args.childName}</strong>.</p>
       ${args.note ? `<p style="margin:12px 0 0;font-size:14px;color:#5a6b75">${args.note}</p>` : ""}
       <p style="margin:12px 0 0;font-size:14px;color:#5a6b75">Zapraszamy do kontaktu i przy kolejnym naborze.</p>`,
    );
    await sendEmail({ to: args.to, subject: "Informacja o zgłoszeniu — ALL SWIM", html });
  },
});

// Do uczestnika: zmiana grupy/godzin u już przydzielonego (po publikacji).
export const sendParticipantScheduleChanged = internalAction({
  args: {
    to: v.string(),
    childName: v.string(),
    groupName: v.string(),
    poolName: v.union(v.string(), v.null()),
    times: v.string(),
  },
  handler: async (_ctx, args) => {
    const html = layout(
      "Zmiana grafiku zajęć",
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.6">Zaktualizowaliśmy zajęcia dla <strong>${args.childName}</strong>:</p>
       <div style="background:#e8f4fb;border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.7">
         <strong>${args.groupName}</strong><br/>
         ${args.poolName ? `Basen: ${args.poolName}<br/>` : ""}
         ${args.times ? `Terminy: ${args.times}` : ""}
       </div>${accountLink()}`,
    );
    await sendEmail({ to: args.to, subject: "Zmiana grafiku zajęć — ALL SWIM", html });
  },
});

// Do osoby z listy oczekujących: nabór został właśnie otwarty.
export const sendWaitlistOpened = internalAction({
  args: { to: v.string() },
  handler: async (_ctx, args) => {
    const site = process.env.SITE_URL;
    const cta = site
      ? `<p style="margin:18px 0 0"><a href="${site}/#nabor" style="background:#e9a13b;color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:12px 22px;display:inline-block">Wypełnij zgłoszenie →</a></p>`
      : "";
    const html = layout(
      "Nabór jest już otwarty! 🌊",
      `<p style="margin:0;font-size:15px;line-height:1.6">Dobra wiadomość — w <strong>ALL SWIM</strong> ruszył nabór na zajęcia nauki pływania. Zapisałeś/aś się na liście powiadomień, więc dajemy znać jako pierwszym.</p>
       <p style="margin:12px 0 0;font-size:15px;line-height:1.6">Liczba miejsc jest ograniczona — zachęcamy do szybkiego zgłoszenia dziecka.</p>${cta}`,
    );
    await sendEmail({ to: args.to, subject: "Nabór otwarty — ALL SWIM 🌊", html });
  },
});
