import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/access";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(200),
  workspaceRole: z.enum(["admin", "member", "viewer"]).default("member"),
  projectIds: z.array(z.string()).optional().default([]),
});

export async function GET() {
  const { user, workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  // Anyone in the workspace can view the member list.
  const memberships = await prisma.membership.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          _count: {
            select: {
              projectMemberships: {
                where: { project: { workspaceId: workspace.id } },
              },
            },
          },
        },
      },
    },
  });

  const users = memberships.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    projectCount: m.user._count.projectMemberships,
    isYou: m.user.id === user.id,
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const { user, workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  // Only workspace admins/owners can create users directly.
  const myMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
    },
    select: { role: true },
  });
  if (!myMembership || !isWorkspaceAdmin(myMembership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners/admins can create users" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, password, workspaceRole, projectIds } = parsed.data;

  // If a user with this email already exists, just add them to the workspace
  // (don't overwrite their password).
  const existing = await prisma.user.findUnique({ where: { email } });
  let userId: string;
  let createdNew = false;

  if (existing) {
    userId = existing.id;
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true },
    });
    userId = created.id;
    createdNew = true;
  }

  // Workspace membership (idempotent)
  await prisma.membership.upsert({
    where: {
      userId_workspaceId: { userId, workspaceId: workspace.id },
    },
    update: { role: workspaceRole },
    create: { userId, workspaceId: workspace.id, role: workspaceRole },
  });

  // Project memberships (only those that belong to this workspace)
  if (projectIds.length > 0) {
    const ownedProjects = await prisma.project.findMany({
      where: { workspaceId: workspace.id, id: { in: projectIds } },
      select: { id: true },
    });
    for (const p of ownedProjects) {
      await prisma.projectMember.upsert({
        where: {
          projectId_userId: { projectId: p.id, userId },
        },
        update: {},
        create: {
          projectId: p.id,
          userId,
          addedById: user.id,
        },
      });
    }
  }

  return NextResponse.json(
    {
      user: { id: userId, email, name },
      createdNew,
      workspaceRole,
    },
    { status: 201 },
  );
}
