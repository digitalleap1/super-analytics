import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import {
  buildProjectAuthorizeUrl,
  type GoogleService,
} from "@/lib/google/project-tokens";

// Kicks off an OAuth flow scoped to this project (and optionally a single
// service). ?service=gsc connects only Search Console, ?service=ga4 only
// Analytics, otherwise both. Google POSTs back to /api/google/project-callback.
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const raw = new URL(request.url).searchParams.get("service");
  const service: GoogleService =
    raw === "gsc" || raw === "search_console"
      ? "search_console"
      : raw === "ga4" || raw === "analytics"
        ? "analytics"
        : "all";

  const url = buildProjectAuthorizeUrl(project.id, service);
  if (!url) {
    return NextResponse.json(
      {
        error:
          "Google OAuth isn't configured on this install (GOOGLE_CLIENT_ID/SECRET missing in .env)",
      },
      { status: 500 },
    );
  }
  return NextResponse.redirect(url);
}
