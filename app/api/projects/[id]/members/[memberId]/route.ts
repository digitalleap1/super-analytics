import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { clearProjectCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/access";

const ALLOWED_ROLES = new Set(["viewer", "editor"]);

async function assertAdmin(userId: string, workspaceId: string) {
  const myMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
    select: { role: true },
  });
  if (!myMembership || !isWorkspaceAdmin(myMembership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners/admins can manage project access" },
      { status: 403 },
    );
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; memberId: string } },
) {
  const { user, project, response } = await getApiProject(params.id);
  if (!project || !user) return response;

  const forbidden = await assertAdmin(user.id, project.workspaceId);
  if (forbidden) return forbidden;

  let body: { role?: string };
  try {
    body = (await request.json()) as { role?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.role || !ALLOWED_ROLES.has(body.role)) {
    return NextResponse.json(
      { error: "Role must be 'viewer' or 'editor'" },
      { status: 400 },
    );
  }

  const member = await prisma.projectMember.findUnique({
    where: { id: params.memberId },
    select: { id: true, projectId: true },
  });
  if (!member || member.projectId !== project.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { role: body.role },
    select: { id: true, role: true },
  });
  return NextResponse.json({ member: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; memberId: string } },
) {
  const { user, project, response } = await getApiProject(params.id);
  if (!project || !user) return response;

  const forbidden = await assertAdmin(user.id, project.workspaceId);
  if (forbidden) return forbidden;

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
