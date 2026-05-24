import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { listGa4Properties } from "@/lib/google/ga4";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { user, project, response } = await getApiProject(params.id);
  if (!project || !user) return response;
  const properties = await listGa4Properties({
    userId: user.id,
    projectId: project.id,
  });
  return NextResponse.json({ properties });
}
