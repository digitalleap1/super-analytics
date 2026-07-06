import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// --- Embed gate -------------------------------------------------------------
// This app is meant to be used ONLY inside the Digital Leap tools hub
// (https://tools.digitalleapmarketing.com/seodashboard.html). Logins are
// disabled, so to stop the raw Vercel URL being opened directly we check the
// browser's Sec-Fetch-* headers — which page JavaScript cannot forge:
//   • in-app requests (client nav, RSC, data fetches, server actions) carry
//     Sec-Fetch-Site: same-origin
//   • the tools iframe's document load carries Sec-Fetch-Dest: iframe
// Anyone pasting the URL into a tab, a bot, or curl gets Sec-Fetch-Site: none /
// cross-site with no iframe dest → blocked and shown the "open via the hub"
// screen. No cookies are involved, so there are no third-party-cookie pitfalls.
// The frame-ancestors CSP (next.config.mjs) guarantees only the tools hub can
// actually render the frame, so trusting an iframe request is safe.

const TOOLS_ORIGIN = "https://tools.digitalleapmarketing.com";

// When served behind the tools-hub reverse proxy (basePath mode) the app already
// lives on the trusted tools domain at /super-analytics, so the iframe-only embed
// gate is not just unnecessary — it's harmful: a direct deep link or a browser
// refresh sends Sec-Fetch-Site: none and would be blocked. Skip the gate entirely
// in proxied mode. NEXT_PUBLIC_ vars are inlined at build, so this is a constant.
const PROXIED = !!process.env.NEXT_PUBLIC_BASE_PATH;

// Paths that must stay reachable outside the iframe on purpose.
const EXEMPT_PREFIXES = [
  "/r/", // public, client-facing shared reports
  "/api/google/", // Google OAuth callback (cross-site redirect back from Google)
  "/google/connected", // post-OAuth confirmation shown in the popup tab
  "/embed-required", // the block screen itself (avoid a rewrite loop)
  "/join/", // workspace invite links
];

// Login is disabled; bounce the legacy auth pages to the dashboard.
const AUTH_PAGES = ["/login", "/register"];

function isExempt(pathname: string): boolean {
  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // OAuth connect / disconnect live under /api/projects/<id>/google/*
  if (pathname.includes("/google/")) return true;
  return false;
}

// True only when the Referer's origin is exactly the tools hub — the trailing
// slash boundary stops look-alikes like tools.digitalleapmarketing.com.evil.com.
function fromTools(referer: string): boolean {
  return referer === TOOLS_ORIGIN || referer.startsWith(TOOLS_ORIGIN + "/");
}

function isAllowed(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  const dest = req.headers.get("sec-fetch-dest");
  const referer = req.headers.get("referer") ?? "";

  // Requests the running app makes to itself (client nav, RSC, data, actions).
  if (site === "same-origin") return true;

  // Any request coming straight from the logged-in tools hub — covers both the
  // iframe document load and a top-level link, should the hub ever navigate
  // instead of embed.
  if (fromTools(referer)) return true;

  // Iframe load whose Referer was stripped by a referrer policy. Safe because
  // the frame-ancestors CSP still only lets the tools hub render the frame.
  if (dest === "iframe" && referer === "") return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Behind the hub proxy the whole app is a subpath of the trusted tools domain;
  // let every request through so deep links, refresh and shares work normally.
  if (PROXIED) {
    return NextResponse.next();
  }

  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (isExempt(pathname) || isAllowed(req)) {
    return NextResponse.next();
  }

  // Blocked. Page navigations get the friendly screen (rewritten in place so the
  // URL is preserved); data/API calls get a bare 403.
  const dest = req.headers.get("sec-fetch-dest");
  if (dest === "document" || dest === null) {
    return NextResponse.rewrite(new URL("/embed-required", req.nextUrl));
  }
  return NextResponse.json(
    { error: "This tool is only available inside the Digital Leap hub." },
    { status: 403 },
  );
}

export const config = {
  matcher: [
    // Run on everything except NextAuth routes, static assets and Next internals.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
