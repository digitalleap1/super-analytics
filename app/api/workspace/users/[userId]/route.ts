import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/access";

const patchSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

async function requireAdmin(workspaceId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { role: true },
  });
  return !!membership && isWorkspaceAdmin(membership.role);
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const { user, workspace, response } = await getApiWorkspace();
  if (!workspace) return response;
  if (!(await requireAdmin(workspace.id, user.id))) {
    return NextResponse.json(
      { error: "Only workspace owners/admins can change roles" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const target = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: params.userId,
        workspaceId: workspace.id,
      },
    },
  });
  if (!target) {
    return NextResponse.json(
      { error: "User is not a member of this workspace" },
      { status: 404 },
    );
  }

  // Don't allow demoting the last owner.
  if (target.role === "owner" && parsed.data.role !== "owner") {
    const otherOwners = await prisma.membership.count({
      where: {
        workspaceId: workspace.id,
        role: "owner",
        userId: { not: params.userId },
      },
    });
    if (otherOwners === 0) {
      return NextResponse.json(
        { error: "Cannot demote the last owner. Promote someone else first." },
        { status: 400 },
      );
    }
  }

  await prisma.membership.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
  });

  return NextResponse.json({ ok: true });
}

// Idempotent add: if the user already has a membership, returns ok with the existing role.
const addSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export async function POST(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const { user, workspace, response } = await getApiWorkspace();
  if (!workspace) return response;
  if (!(await requireAdmin(workspace.id, user.id))) {
    return NextResponse.json(
      { error: "Only workspace owners/admins can add users to the workspace" },
      { status: 403 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* allow empty body */
  }
  const parsed = addSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const member = await prisma.membership.upsert({
    where: {
      userId_workspaceId: {
        userId: target.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: target.id,
      workspaceId: workspace.id,
      role: parsed.data.role,
    },
  });
  return NextResponse.json(
    { membership: { id: member.id, role: member.role } },
    { status: 201 },
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: { userId: string } },
) {
  const { user, workspace, response } = await getApiWorkspace();
  if (!workspace) return response;
  if (!(await requireAdmin(workspace.id, user.id))) {
    return NextResponse.json(
      { error: "Only workspace owners/admins can remove users" },
      { status: 403 },
    );
  }

  const target = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: params.userId,
        workspaceId: workspace.id,
      },
    },
  });
  if (!target) {
    return NextResponse.json({ error: "Not a member" }, { status: 404 });
  }

  if (target.role === "owner") {
    const otherOwners = await prisma.membership.count({
      where: {
        workspaceId: workspace.id,
        role: "owner",
        userId: { not: params.userId },
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
