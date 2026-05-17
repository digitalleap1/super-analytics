import { NextResponse } from "next/server";

import { getApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { user, workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  const currentMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
    },
  });
  if (!currentMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const target = await prisma.membership.findUnique({
    where: { id: params.id },
  });
  if (!target || target.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isSelf = target.userId === user.id;
  const canManage =
    currentMembership.role === "owner" || currentMembership.role === "admin";

  if (!isSelf && !canManage) {
    return NextResponse.json(
      { error: "Only owners or admins can remove others" },
      { status: 403 },
    );
  }

  // Don't allow removing the last owner — workspace must always have one.
  if (target.role === "owner") {
    const otherOwners = await prisma.membership.count({
      where: {
        workspaceId: workspace.id,
        role: "owner",
        id: { not: target.id },
      },
    });
    if (otherOwners === 0) {
      return NextResponse.json(
        { error: "Cannot remove the last owner. Promote someone else first." },
        { status: 400 },
      );
    }
  }

  await prisma.membership.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true });
}
