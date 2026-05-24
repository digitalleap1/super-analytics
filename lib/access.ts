import { prisma } from "@/lib/prisma";

// Workspace roles. "owner" + "admin" both treated as workspace admins for
// access decisions (admins see every project in their workspace; regular
// members only see projects they've been explicitly granted access to).
export function isWorkspaceAdmin(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

// Returns whether the user is an admin of the project's workspace, AND a list
// of project IDs they have explicit access to. Use this to scope project
// listings: admin → return all workspace projects; otherwise → filter by the
// returned ID list.
export async function getProjectAccess(opts: {
  userId: string;
  workspaceId: string;
}): Promise<
  | { admin: true }
  | { admin: false; projectIds: string[] }
  | null // not even a workspace member
> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: opts.userId,
        workspaceId: opts.workspaceId,
      },
    },
  });
  if (!membership) return null;
  if (isWorkspaceAdmin(membership.role)) return { admin: true };

  const rows = await prisma.projectMember.findMany({
    where: {
      userId: opts.userId,
      project: { workspaceId: opts.workspaceId },
    },
    select: { projectId: true },
  });
  return { admin: false, projectIds: rows.map((r) => r.projectId) };
}

// Single project access check. True if the user is a workspace admin OR an
// explicit ProjectMember for the project.
export async function canUserAccessProject(opts: {
  userId: string;
  projectId: string;
}): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: opts.projectId },
    select: { workspaceId: true },
  });
  if (!project) return false;

  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: opts.userId,
        workspaceId: project.workspaceId,
      },
    },
  });
  if (!membership) return false;
  if (isWorkspaceAdmin(membership.role)) return true;

  const pm = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: opts.projectId,
        userId: opts.userId,
      },
    },
    select: { id: true },
  });
  return !!pm;
}
