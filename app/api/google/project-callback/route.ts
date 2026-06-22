import { NextResponse } from "next/server";

import { getEffectiveUser } from "@/lib/current-user";
import { canUserAccessProject } from "@/lib/access";
import { clearProjectCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForTokens,
  fetchGoogleUserEmail,
  verifyProjectState,
} from "@/lib/google/project-tokens";

function backToProject(
  projectId: string,
  url: URL,
  status: "connected" | "error",
  message?: string,
) {
  const dest = new URL(`/projects/${projectId}/settings`, url);
  dest.searchParams.set("google", status);
  if (message) dest.searchParams.set("reason", message);
  return NextResponse.redirect(dest);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (!state) {
    return NextResponse.json({ error: "Missing state" }, { status: 400 });
  }
  const projectId = verifyProjectState(state);
  if (!projectId) {
    return NextResponse.json({ error: "Bad state signature" }, { status: 400 });
  }

  if (error || !code) {
    return backToProject(projectId, url, "error", error ?? "missing_code");
  }

  // Login is disabled — attribute the connection to the effective (default)
  // user, who must still be able to access the project being connected.
  const user = await getEffectiveUser();
  const ok = await canUserAccessProject({
    userId: user.id,
    projectId,
  });
  if (!ok) {
    return backToProject(projectId, url, "error", "forbidden");
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens?.access_token) {
    return backToProject(projectId, url, "error", "token_exchange_failed");
  }

  const email = await fetchGoogleUserEmail(tokens.access_token);
  const now = Math.floor(Date.now() / 1000);

  // We need a providerAccountId; userinfo doesn't include sub, but we can get
  // it from the id_token's payload. Quick base64 decode of the middle segment.
  let providerAccountId = "";
  if (tokens.id_token) {
    try {
      const [, payloadB64] = tokens.id_token.split(".");
      if (payloadB64) {
        const payload = JSON.parse(
          Buffer.from(payloadB64, "base64url").toString("utf-8"),
        );
        providerAccountId = payload.sub ?? "";
      }
    } catch {
      /* leave empty */
    }
  }
  if (!providerAccountId) providerAccountId = email ?? `unknown-${projectId}`;

  await prisma.projectAccount.upsert({
    where: { projectId },
    create: {
      projectId,
      provider: "google",
      providerAccountId,
      email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: now + (tokens.expires_in ?? 3600),
      token_type: tokens.token_type,
      scope: tokens.scope,
      connectedById: user.id,
    },
    update: {
      provider: "google",
      providerAccountId,
      email,
      access_token: tokens.access_token,
      ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      expires_at: now + (tokens.expires_in ?? 3600),
      token_type: tokens.token_type,
      scope: tokens.scope,
      connectedById: user.id,
      connectedAt: new Date(),
    },
  });

  // Drop any cached sample/stub data so the next page load fetches live data.
  await clearProjectCache(projectId);

  return backToProject(projectId, url, "connected");
}
