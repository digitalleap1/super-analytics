import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiProject } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/access";

const addSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["viewer", "editor"]).default("viewer"),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { user, project, response } = await getApiProject(params.id);
  if (!project || !user) return response;

  // Only workspace admins can grant project access.
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
      { error: "Only workspace owners/admins can grant project access" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Target user must be a member of the same workspace.
  const targetMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: parsed.data.userId,
        workspaceId: project.workspaceId,
      },
    },
    select: { id: true },
  });
  if (!targetMembership) {
    return NextResponse.json(
      { error: "User is not a member of this workspace" },
      { status: 400 },
    );
  }

  const member = await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: parsed.data.userId,
      },
    },
    update: { role: parsed.data.role },
    create: {
      projectId: project.id,
      userId: parsed.data.userId,
      role: parsed.data.role,
      addedById: user.id,
    },
  });
  return NextResponse.json({ member }, { status: 201 });
}
