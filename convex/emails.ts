import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// SZKIELETY wysyłki maili. Po podłączeniu Resend (zweryfikowana domena)
// wystarczy podmienić `console.log` na realne wywołanie API Resend w każdej
// z funkcji (treść wiadomości można złożyć z przekazanych argumentów).
// Funkcje są wywoływane przez `ctx.scheduler.runAfter` z mutacji (submit /
// publish), więc nie blokują transakcji.

// Do administratora: nowe zgłoszenie w naborze (wysyłane od razu przy submit).
export const sendAdminNewEnrollment = internalAction({
  args: {
    to: v.string(),
    childName: v.string(),
    levelLabel: v.union(v.string(), v.null()),
    parentEmail: v.string(),
    parentPhone: v.union(v.string(), v.null()),
    isContinuing: v.boolean(),
  },
  handler: async (ctx, args) => {
    console.log(
      `[email:placeholder] NOWE ZGŁOSZENIE → admin ${args.to}: ` +
        `${args.childName}` +
        `${args.levelLabel ? `, poziom: ${args.levelLabel}` : ""}` +
        `${args.isContinuing ? " (kontynuuje)" : ""}` +
        ` · kontakt: ${args.parentEmail}${args.parentPhone ? `, ${args.parentPhone}` : ""}`,
    );
    // TODO(Resend): wysłać powiadomienie do administratora o nowym zgłoszeniu.
  },
});

// Do rodzica: potwierdzenie otrzymania zgłoszenia (od razu po wysłaniu formularza).
export const sendParticipantReceived = internalAction({
  args: {
    to: v.string(),
    childName: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(
      `[email:placeholder] POTWIERDZENIE ZGŁOSZENIA → ${args.to}: ${args.childName} — dziękujemy, odezwiemy się wkrótce.`,
    );
    // TODO(Resend): wysłać rodzicowi potwierdzenie otrzymania zgłoszenia.
  },
});

// Do uczestnika: wypisanie z grupy / cofnięcie przydziału (po publikacji).
export const sendParticipantRemoved = internalAction({
  args: {
    to: v.string(),
    childName: v.string(),
    groupName: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    console.log(
      `[email:placeholder] WYPISANIE → ${args.to}: ${args.childName}` +
        `${args.groupName ? ` z grupy „${args.groupName}”` : ""} — wróciliśmy do ustalania przydziału.`,
    );
    // TODO(Resend): wysłać informację o wypisaniu / cofnięciu przydziału.
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
  handler: async (ctx, args) => {
    console.log(
      `[email:placeholder] PRZYDZIAŁ → ${args.to}: ${args.childName} ` +
        `do grupy „${args.groupName}”` +
        `${args.poolName ? `, basen: ${args.poolName}` : ""}` +
        `${args.times ? `, terminy: ${args.times}` : ""}`,
    );
    // TODO(Resend): wysłać informację o przydzieleniu do grupy.
  },
});

// Do uczestnika: odrzucenie zgłoszenia (po publikacji).
export const sendParticipantRejected = internalAction({
  args: {
    to: v.string(),
    childName: v.string(),
    note: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    console.log(
      `[email:placeholder] ODRZUCENIE → ${args.to}: ${args.childName}` +
        `${args.note ? ` (uwaga: ${args.note})` : ""}`,
    );
    // TODO(Resend): wysłać informację o odrzuceniu zgłoszenia.
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
  handler: async (ctx, args) => {
    console.log(
      `[email:placeholder] ZMIANA GRAFIKU → ${args.to}: ${args.childName} ` +
        `(grupa „${args.groupName}”` +
        `${args.poolName ? `, basen: ${args.poolName}` : ""}` +
        `${args.times ? `, terminy: ${args.times}` : ""})`,
    );
    // TODO(Resend): wysłać informację o zmianie grupy / godzin zajęć.
  },
});
