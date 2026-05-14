import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe NextAuth config (no database adapter, no bcrypt).
// This is imported by middleware.ts where Edge runtime is required.
// The full config in lib/auth.ts extends this with the PrismaAdapter and Credentials provider.

const protectedPrefixes = ["/dashboard", "/projects", "/settings"];
const authPrefixes = ["/login", "/register"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isAuthPage = authPrefixes.some((p) => path.startsWith(p));
      const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (isProtected && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("from", path);
        return Response.redirect(loginUrl);
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
