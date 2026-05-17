import { prisma } from "@/lib/prisma";

export type WorkspaceForUser = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export function slugify(seed: string): string {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "workspace";
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 1;
  while (await prisma.workspace.findUnique({ where: { slug: candidate } })) {
    n++;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

// Idempotently ensures the user has a personal workspace + owner membership.
// Returns the workspace they were/are in. Called from the register endpoint
// and from NextAuth's events.createUser hook so both sign-up paths converge.
export async function ensureUserHasWorkspace(
  userId: string,
): Promise<WorkspaceForUser> {
  const existing = await prisma.membership.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    return {
      id: existing.workspace.id,
      name: existing.workspace.name,
      slug: existing.workspace.slug,
      role: existing.role,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User ${userId} not found`);

  const seed = user.name ?? user.email.split("@")[0] ?? "workspace";
  const slug = await uniqueSlug(slugify(seed));
  const workspace = await prisma.workspace.create({
    data: {
      name: user.name ? `${user.name}'s workspace` : `${user.email}'s workspace`,
      slug,
      memberships: { create: { userId, role: "owner" } },
    },
  });

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role: "owner",
  };
}

// Returns the user's primary workspace (their oldest membership). For multi-
// workspace support later, this is where the "current workspace from cookie"
// lookup would go.
export async function getCurrentWorkspaceForUser(
  userId: string,
): Promise<WorkspaceForUser | null> {
  const m = await prisma.membership.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!m) return null;
  return {
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    role: m.role,
  };
}

// True iff the user has any membership in the given workspace.
export async function userIsInWorkspace(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const m = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return !!m;
}
