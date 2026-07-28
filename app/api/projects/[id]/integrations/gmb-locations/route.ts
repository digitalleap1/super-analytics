import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { listGmbLocations } from "@/lib/google/gmb";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { user, project, response } = await getApiProject(params.id);
  if (!project || !user) return response;
  const locations = await listGmbLocations({
    userId: user.id,
    projectId: project.id,
    strict: true,
  });
  return NextResponse.json({ locations });
}
