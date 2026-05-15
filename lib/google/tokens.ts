import { prisma } from "@/lib/prisma";

// Returns a valid Google access token for a user, refreshing if needed.
// Returns null when the user has no linked Google account OR no refresh token
// is available — callers should fall back to stub data in that case.

const OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export async function getValidGoogleAccessToken(
  userId: string,
): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = account.expires_at ?? 0;

  if (account.access_token && expiresAt - 60 > now) {
    return account.access_token;
  }

  if (!account.refresh_token) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
  });

  const res = await fetch(OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;

  const tokens = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
  if (!tokens.access_token) return null;

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      expires_at: now + (tokens.expires_in ?? 3600),
      token_type: tokens.token_type ?? account.token_type,
      scope: tokens.scope ?? account.scope,
    },
  });

  return tokens.access_token;
}
