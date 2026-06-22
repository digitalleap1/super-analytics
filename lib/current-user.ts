import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type EffectiveUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

function shape(u: {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}): EffectiveUser {
  return { id: u.id, email: u.email, name: u.name, image: u.image };
}

// Login is disabled for this deployment — the app opens straight to the
// dashboard. When there is no real session we resolve a default user so every
// workspace/project query still works.
//
// Default selection: the owner of the workspace that has the most projects (so
// the dashboard shows the real data). Override by setting DEFAULT_USER_EMAIL to
// pin a specific account.
export async function getEffectiveUser(): Promise<EffectiveUser> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    };
  }
  return getDefaultUser();
}

async function getDefaultUser(): Promise<EffectiveUser> {
  const preferred = process.env.DEFAULT_USER_EMAIL;
  if (preferred) {
    const u = await prisma.user.findUnique({ where: { email: preferred } });
    if (u) return shape(u);
  }

  // Owner of the workspace with the most projects → dashboard shows real data.
  const owners = await prisma.membership.findMany({
    where: { role: "owner" },
    include: {
      user: true,
      workspace: { select: { _count: { select: { projects: true } } } },
    },
  });
  owners.sort(
    (a, b) => b.workspace._count.projects - a.workspace._count.projects,
  );
  if (owners[0]?.user) return shape(owners[0].user);

  // Fallback: any user at all.
  const anyUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!anyUser) {
    throw new Error(
      "Login is disabled but no users exist to use as the default account.",
    );
  }
  return shape(anyUser);
}
