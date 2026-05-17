import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureUserHasWorkspace,
  getCurrentWorkspaceForUser,
  type WorkspaceForUser,
} from "@/lib/workspaces";

export async function getApiUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user: session.user, response: null };
}

// Returns the user's current workspace. Auto-creates one if missing so we
// never hand an unscoped request to a route.
export async function getApiWorkspace(): Promise<
  | { user: { id: string; email?: string | null; name?: string | null }; workspace: WorkspaceForUser; response: null }
  | { user: null; workspace: null; response: NextResponse }
> {
  const { user, response } = await getApiUser();
  if (!user) return { user: null, workspace: null, response: response! };
  let workspace = await getCurrentWorkspaceForUser(user.id);
  if (!workspace) workspace = await ensureUserHasWorkspace(user.id);
  return { user, workspace, response: null };
}

export async function getApiProject(projectId: string) {
  const { user, response } = await getApiUser();
  if (!user) return { user: null, project: null, response };
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: { memberships: { some: { userId: user.id } } },
    },
  });
  if (!project) {
    return {
      user,
      project: null,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { user, project, response: null };
}
