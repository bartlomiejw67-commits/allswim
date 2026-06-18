import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Logowanie e-mail + hasło. Google dodamy, gdy będą dane OAuth
// (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) — wtedy dopiszemy tu provider Google.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
