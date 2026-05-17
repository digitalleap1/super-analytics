import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createInvite(opts: {
  workspaceId: string;
  createdBy: string;
  role?: "member" | "admin" | "viewer";
  expiresInDays?: number;
}) {
  const expiresAt = opts.expiresInDays
    ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000)
    : null;
  return prisma.workspaceInvite.create({
    data: {
      workspaceId: opts.workspaceId,
      createdBy: opts.createdBy,
      role: opts.role ?? "member",
      token: generateInviteToken(),
      expiresAt,
    },
  });
}

export type InviteLookup =
  | { ok: true; invite: { id: string; workspaceId: string; role: string; workspaceName: string } }
  | { ok: false; reason: "not_found" | "expired" | "used" };

export async function lookupInvite(token: string): Promise<InviteLookup> {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { name: true } } },
  });
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.usedAt) return { ok: false, reason: "used" };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }
  return {
    ok: true,
    invite: {
      id: invite.id,
      workspaceId: invite.workspaceId,
      role: invite.role,
      workspaceName: invite.workspace.name,
    },
  };
}

export async function redeemInvite(token: string, userId: string) {
  const lookup = await lookupInvite(token);
  if (!lookup.ok) return lookup;

  const { invite } = lookup;

  // Idempotent: if already a member, just mark invite consumed.
  await prisma.membership.upsert({
    where: {
      userId_workspaceId: { userId, workspaceId: invite.workspaceId },
    },
    update: {},
    create: {
      userId,
      workspaceId: invite.workspaceId,
      role: invite.role,
    },
  });

  await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date(), usedBy: userId },
  });

  return { ok: true as const, workspaceId: invite.workspaceId };
}
