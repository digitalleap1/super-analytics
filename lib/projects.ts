import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureUserHasWorkspace,
  getCurrentWorkspaceForUser,
  type WorkspaceForUser,
} from "@/lib/workspaces";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

// Returns the user's current workspace. If they somehow don't have one (e.g.
// stale account created before the workspace schema landed), we create one
// here so the request can continue.
export async function requireWorkspace(): Promise<{
  user: Awaited<ReturnType<typeof requireUser>>;
  workspace: WorkspaceForUser;
}> {
  const user = await requireUser();
  let workspace = await getCurrentWorkspaceForUser(user.id);
  if (!workspace) {
    workspace = await ensureUserHasWorkspace(user.id);
  }
  return { user, workspace };
}

// Loads a project iff the current user is a member of its workspace.
// Redirects to /dashboard otherwise.
export async function requireProject(projectId: string) {
  const { user, workspace } = await requireWorkspace();
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: { memberships: { some: { userId: user.id } } },
    },
  });
  if (!project) {
    redirect("/dashboard");
  }
  return { user, workspace, project };
}

export async function listProjectsForWorkspace(workspaceId: string) {
  return prisma.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      domain: true,
      logoUrl: true,
      gscSiteUrl: true,
      ga4PropertyId: true,
      createdAt: true,
      _count: { select: { keywords: true } },
    },
  });
}

export type ProjectListItem = Awaited<
  ReturnType<typeof listProjectsForWorkspace>
>[number];
