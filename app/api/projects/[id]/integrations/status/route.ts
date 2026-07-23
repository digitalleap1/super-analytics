import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// Returns this project's live Google connection state for a given service plus
// the currently-saved site/property. Used by the New Project wizard so its
// "Connect Google" and "Pick data sources" steps mirror the project Settings
// page (which reads the same thing server-side) and update after the OAuth
// popup completes.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const accounts = await prisma.projectAccount.findMany({
    where: { projectId: project.id },
    select: { service: true, email: true, connectedAt: true },
  });

  // A dedicated per-service account wins over a shared "all" account — same
  // resolution the settings page uses.
  const resolveConn = (service: "search_console" | "analytics") => {
    const account =
      accounts.find((a) => a.service === service) ??
      accounts.find((a) => a.service === "all");
    return account
      ? {
          email: account.email,
          connectedAt: account.connectedAt.toISOString().slice(0, 10),
          via: account.service as "all" | "search_console" | "analytics",
        }
      : null;
  };

  return NextResponse.json({
    gsc: resolveConn("search_console"),
    ga4: resolveConn("analytics"),
    gscSiteUrl: project.gscSiteUrl,
    ga4PropertyId: project.ga4PropertyId,
  });
}
