import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { clearProjectCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/access";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; memberId: string } },
) {
  const { user, project, response } = await getApiProject(params.id);
  if (!project || !user) return response;

  const myMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: project.workspaceId,
      },
    },
    select: { role: true },
  });
  if (!myMembership || !isWorkspaceAdmin(myMembership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners/admins can revoke project access" },
      { status: 403 },
    );
  }

  const member = await prisma.projectMember.findUnique({
    where: { id: params.memberId },
    select: { id: true, projectId: true },
  });
  if (!member || member.projectId !== project.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.projectMember.delete({ where: { id: member.id } });
  await clearProjectCache(project.id);
  return NextResponse.json({ ok: true });
}
