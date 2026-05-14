// Route protection for /(app) section. Real NextAuth integration is wired in Phase 2.
// For now this is a no-op so the dev server starts without crashing.
import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/settings/:path*"],
};
