import { createHmac, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken } from "@/lib/google/tokens";

const OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const OAUTH_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

export const GOOGLE_PROJECT_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
].join(" ");

export function projectOAuthRedirectUri(): string {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}/api/google/project-callback`;
}

// Sign (projectId, nonce) with NEXTAUTH_SECRET so callers can't tamper with
// state on the round-trip through Google. Returned token is opaque — projectId
// is encoded, not encrypted.
export function signProjectState(projectId: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret-fallback";
  const nonce = randomBytes(8).toString("base64url");
  const payload = `${projectId}.${nonce}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyProjectState(token: string): string | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payload = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret-fallback";
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");
    if (expected !== sig) return null;
    const [projectId] = payload.split(".");
    return projectId || null;
  } catch {
    return null;
  }
}

// Builds the Google OAuth authorize URL for this project.
export function buildProjectAuthorizeUrl(projectId: string): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: projectOAuthRedirectUri(),
    response_type: "code",
    scope: GOOGLE_PROJECT_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: signProjectState(projectId),
  });
  return `${OAUTH_AUTH_ENDPOINT}?${params.toString()}`;
}

export type ExchangedTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
};

export async function exchangeCodeForTokens(
  code: string,
): Promise<ExchangedTokens | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: projectOAuthRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  return (await res.json()) as ExchangedTokens;
}

export async function fetchGoogleUserEmail(
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}

// Returns a valid access token for the project's connected Google account.
// Refreshes if expired. Returns null if no ProjectAccount exists or refresh
// fails. Caller can then fall back to the user's personal token.
export async function getValidProjectGoogleAccessToken(
  projectId: string,
): Promise<string | null> {
  const account = await prisma.projectAccount.findUnique({
    where: { projectId },
  });
  if (!account) return null;

  const now = Math.floor(Date.now() / 1000);
  if (account.access_token && (account.expires_at ?? 0) - 60 > now) {
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

  await prisma.projectAccount.update({
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

// Picks the best available Google token for a (project, user) pair.
// Order: project-scoped account → fall back to the viewing user's personal
// account. Returns null when neither is available.
export async function resolveGoogleAccessToken(opts: {
  projectId: string | null;
  userId: string | null;
}): Promise<string | null> {
  if (opts.projectId) {
    const tok = await getValidProjectGoogleAccessToken(opts.projectId);
    if (tok) return tok;
  }
  if (opts.userId) {
    return getValidGoogleAccessToken(opts.userId);
  }
  return null;
}
