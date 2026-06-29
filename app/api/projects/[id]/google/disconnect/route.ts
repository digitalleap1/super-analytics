import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { clearProjectCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  // ?service=gsc|ga4|all disconnects just that connection; no param = all.
  const raw = new URL(req.url).searchParams.get("service");
  const service =
    raw === "gsc" || raw === "search_console"
      ? "search_console"
      : raw === "ga4" || raw === "analytics"
        ? "analytics"
        : raw === "all"
          ? "all"
          : null;

  await prisma.projectAccount.deleteMany({
    where: { projectId: project.id, ...(service ? { service } : {}) },
  });
  await clearProjectCache(project.id);
  return NextResponse.json({ ok: true });
}
