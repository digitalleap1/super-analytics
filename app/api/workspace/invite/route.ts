import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createInvite } from "@/lib/invites";

const bodySchema = z.object({
  role: z.enum(["admin", "member", "viewer"]).default("member"),
  expiresInDays: z.number().int().min(1).max(60).optional(),
});

export async function POST(request: Request) {
  const { user, workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  // Only owners + admins can create invites.
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
    },
  });
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json(
      { error: "Only workspace owners or admins can create invites" },
      { status: 403 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* allow empty body */
  }
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const invite = await createInvite({
    workspaceId: workspace.id,
    createdBy: user.id,
    role: parsed.data.role,
    expiresInDays: parsed.data.expiresInDays ?? 14,
  });

  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return NextResponse.json(
    {
      invite: {
        token: invite.token,
        role: invite.role,
        expiresAt: invite.expiresAt,
        url: `${baseUrl}/join/${invite.token}`,
      },
    },
    { status: 201 },
  );
}
