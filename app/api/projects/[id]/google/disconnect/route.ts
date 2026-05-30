import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { clearProjectCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  await prisma.projectAccount.deleteMany({ where: { projectId: project.id } });
  await clearProjectCache(project.id);
  return NextResponse.json({ ok: true });
}
