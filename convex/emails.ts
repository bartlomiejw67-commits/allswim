import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// PLACEHOLDER wysyłki maili. Po podłączeniu Resend (zweryfikowana domena)
// zamienimy console.log na faktyczne wywołanie API Resend.
// Akcje są wywoływane z mutacji przez ctx.scheduler.runAfter, więc nie
// blokują transakcji i nie wstrzymują odpowiedzi dla użytkownika.

export const sendEnrollmentReceived = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { to, name }) => {
    console.log(
      `[email:placeholder] Potwierdzenie zgłoszenia naboru do ${to} (${name})`,
    );
    // TODO(Resend): wysłać potwierdzenie otrzymania zgłoszenia.
  },
});

export const sendEnrollmentDecision = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    approved: v.boolean(),
    groupName: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { to, name, approved, groupName }) => {
    console.log(
      `[email:placeholder] Decyzja (${approved ? "AKCEPTACJA" : "ODRZUCENIE"}) ` +
        `do ${to} (${name})${groupName ? `, grupa: ${groupName}` : ""}`,
    );
    // TODO(Resend): wysłać informację o decyzji administratora.
  },
});
