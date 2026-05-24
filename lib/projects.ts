import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUserAccessProject, getProjectAccess } from "@/lib/access";
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

// Loads a project iff the current user can access it (workspace admin OR an
// explicit ProjectMember). Redirects to /dashboard otherwise.
export async function requireProject(projectId: string) {
  const { user, workspace } = await requireWorkspace();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) redirect("/dashboard");
  const ok = await canUserAccessProject({
    userId: user.id,
    projectId: project.id,
  });
  if (!ok) redirect("/dashboard");
  return { user, workspace, project };
}

// Returns the projects the user can see in their current workspace.
// Workspace admins see all; regular members only see projects they've been
// added to via ProjectMember.
export async function listAccessibleProjectsForUser(opts: {
  userId: string;
  workspaceId: string;
}) {
  const access = await getProjectAccess(opts);
  if (!access) return [];

  const where = access.admin
    ? { workspaceId: opts.workspaceId }
    : { workspaceId: opts.workspaceId, id: { in: access.projectIds } };

  return prisma.project.findMany({
    where,
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

// Backwards-compatible alias. Returns ALL projects in the workspace — only call
// from code paths where admin scoping is intentional. Most pages should use
// listAccessibleProjectsForUser.
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
