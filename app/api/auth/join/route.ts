import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { redeemInvite } from "@/lib/invites";

// Used by the post-login/register redirect: ?next=/api/auth/join?token=XYZ.
// Picks the now-authenticated user's session and consumes the invite, then
// redirects to /dashboard.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/dashboard", url));
  }
  const session = await auth();
  if (!session?.user?.id) {
    // Punt them back through login; preserve the token.
    return NextResponse.redirect(
      new URL(
        `/login?from=${encodeURIComponent(`/api/auth/join?token=${token}`)}`,
        url,
      ),
    );
  }
  const result = await redeemInvite(token, session.user.id);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/dashboard?invite=invalid", url));
  }
  return NextResponse.redirect(new URL("/dashboard", url));
}
