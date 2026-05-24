import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/access";

const schema = z.object({
  password: z.string().min(8).max(200),
});

export async function POST(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const { user, workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  // Only workspace admins can reset passwords, AND only for users that are
  // members of THEIR workspace (so admin of workspace A can't reset the
  // password of someone only in workspace B).
  const myMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
    },
    select: { role: true },
  });
  if (!myMembership || !isWorkspaceAdmin(myMembership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners/admins can reset passwords" },
      { status: 403 },
    );
  }

  const targetMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: params.userId,
        workspaceId: workspace.id,
      },
    },
    select: { id: true },
  });
  if (!targetMembership) {
    return NextResponse.json(
      {
        error:
          "You can only reset passwords for users in your workspace. Add them first.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: params.userId },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
