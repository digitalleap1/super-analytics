import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { buildProjectAuthorizeUrl } from "@/lib/google/project-tokens";

// Kicks off an OAuth flow scoped to this project. Redirects the browser to
// Google with state=signed(projectId). Google later POSTs back to
// /api/google/project-callback which finishes the exchange.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const url = buildProjectAuthorizeUrl(project.id);
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
