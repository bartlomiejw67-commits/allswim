import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Logowanie e-mail + hasło. E-mail zawsze zapisywany i porównywany małymi literami,
// żeby „Kowalska@wp.pl" i „kowalska@wp.pl" były tym samym kontem (telefony często
// same zmieniają pierwszą literę na wielką).
// Google dodamy, gdy będą dane OAuth (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET).
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return { email: String(params.email ?? "").trim().toLowerCase() };
      },
    }),
  ],
});
