import { createHmac, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken } from "@/lib/google/tokens";

const OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const OAUTH_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

// A project can connect Google once for both services ("all"), or use separate
// accounts when a client's Search Console and Analytics live under different
// logins.
export type GoogleService = "all" | "search_console" | "analytics";

const BASE_SCOPES = ["openid", "email", "profile"];
const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export function scopesFor(service: GoogleService): string {
  const extra =
    service === "search_console"
      ? [GSC_SCOPE]
      : service === "analytics"
        ? [GA4_SCOPE]
        : [GSC_SCOPE, GA4_SCOPE];
  return [...BASE_SCOPES, ...extra].join(" ");
}

// Back-compat: both scopes.
export const GOOGLE_PROJECT_SCOPES = scopesFor("all");

export function projectOAuthRedirectUri(): string {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}/api/google/project-callback`;
}

// Sign (projectId, service, nonce) with NEXTAUTH_SECRET so callers can't tamper
// with state on the round-trip through Google. Opaque, not encrypted.
export function signProjectState(
  projectId: string,
  service: GoogleService = "all",
): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret-fallback";
  const nonce = randomBytes(24).toString("base64url");
  const payload = `${projectId}.${service}.${nonce}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyProjectState(
  token: string,
): { projectId: string; service: GoogleService } | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payload = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret-fallback";
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");
    if (expected !== sig) return null;
    const [projectId, service] = payload.split(".");
    if (!projectId) return null;
    const svc: GoogleService =
      service === "search_console" || service === "analytics"
        ? service
        : "all";
    return { projectId, service: svc };
  } catch {
    return null;
  }
}

// Builds the Google OAuth authorize URL for this project + service.
export function buildProjectAuthorizeUrl(
  projectId: string,
  service: GoogleService = "all",
): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: projectOAuthRedirectUri(),
    response_type: "code",
    scope: scopesFor(service),
    access_type: "offline",
    // "select_account" forces Google's account chooser every time, so a client's
    // GSC and GA4 can be connected under *different* Google accounts instead of
    // silently reusing whichever account is already signed in. "consent" keeps
    // refresh tokens flowing.
    prompt: "select_account consent",
    include_granted_scopes: "true",
    state: signProjectState(projectId, service),
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

// Returns a valid access token for the project's connected Google account for a
// given service. Prefers an account connected specifically for that service,
// falling back to an "all" account that covers both. Refreshes if expired.
export async function getValidProjectGoogleAccessToken(
  projectId: string,
  service: "search_console" | "analytics",
): Promise<string | null> {
  const accounts = await prisma.projectAccount.findMany({
    where: { projectId, service: { in: [service, "all"] } },
  });
  const account =
    accounts.find((a) => a.service === service) ??
    accounts.find((a) => a.service === "all");
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  let res: Response;
  try {
    res = await fetch(OAUTH_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return null;

  const tokens = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    refresh_token?: string;
  };
  if (!tokens.access_token) return null;

  await prisma.projectAccount.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      expires_at: now + (tokens.expires_in ?? 3600),
      token_type: tokens.token_type ?? account.token_type,
      scope: tokens.scope ?? account.scope,
      // Persist a rotated refresh token if Google ever returns one.
      ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
    },
  });

  return tokens.access_token;
}

// Picks the best available Google token for a (project, user, service) tuple.
// Order: project-scoped account (service-specific → "all") → the viewing user's
// personal account. Returns null when neither is available.
export async function resolveGoogleAccessToken(opts: {
  projectId: string | null;
  userId: string | null;
  service: "search_console" | "analytics";
}): Promise<string | null> {
  if (opts.projectId) {
    const tok = await getValidProjectGoogleAccessToken(
      opts.projectId,
      opts.service,
    );
    if (tok) return tok;
  }
  if (opts.userId) {
    return getValidGoogleAccessToken(opts.userId);
  }
  return null;
}
