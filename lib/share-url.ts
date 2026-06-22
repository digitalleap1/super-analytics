// Base URL for client-facing report share links.
//
// Reports are shared with clients (no sign-in), and the link should read as the
// agency's branded domain rather than the raw *.vercel.app deployment URL. The
// tools site (tools.digitalleapmarketing.com) exposes a public /r/<token> route
// that renders this app's share view full-screen (see the tools_dashboard repo:
// src/app/r/[token]/route.ts), so share links point there.
//
// Override with SHARE_BASE_URL (server) or NEXT_PUBLIC_SHARE_BASE_URL (client)
// if the branded domain ever changes. NOTE: this is intentionally separate from
// NEXTAUTH_URL — that one must stay the real app domain for Google OAuth.
const DEFAULT_SHARE_BASE = "https://tools.digitalleapmarketing.com";

export function shareBaseUrl(): string {
  const v =
    process.env.SHARE_BASE_URL ||
    process.env.NEXT_PUBLIC_SHARE_BASE_URL ||
    DEFAULT_SHARE_BASE;
  return v.replace(/\/$/, "");
}
