import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe NextAuth config (no database adapter, no bcrypt).
// This is imported by middleware.ts where Edge runtime is required.
// The full config in lib/auth.ts extends this with the PrismaAdapter and Credentials provider.

// Login is disabled — the app is open and opens straight to the dashboard.
const authPrefixes = ["/login", "/register"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Auto-link a Google account to an existing credentials user when the
      // emails match. Trade-off: trusts Google's email verification. Acceptable
      // here because credentials users are created by their own password
      // (they already proved email ownership at registration).
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/webmasters.readonly",
            "https://www.googleapis.com/auth/analytics.readonly",
          ].join(" "),
        },
      },
    }),
  ],
  callbacks: {
    authorized({ request: { nextUrl } }) {
      // Login is disabled — allow everything. Send anyone landing on the auth
      // pages straight to the dashboard.
      const path = nextUrl.pathname;
      const isAuthPage = authPrefixes.some((p) => path.startsWith(p));
      if (isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id as string;
      }
      if (account?.provider === "google") {
        token.googleAccountId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;

export default authConfig;
