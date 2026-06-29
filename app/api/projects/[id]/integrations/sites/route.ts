import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { listGscSites } from "@/lib/google/gsc";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { user, project, response } = await getApiProject(params.id);
  if (!project || !user) return response;
  const sites = await listGscSites({
    userId: user.id,
    projectId: project.id,
    strict: true,
  });
  return NextResponse.json({ sites });
}
