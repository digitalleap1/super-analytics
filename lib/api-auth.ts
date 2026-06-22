import { NextResponse } from "next/server";

import { getEffectiveUser, type EffectiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import {
  ensureUserHasWorkspace,
  getCurrentWorkspaceForUser,
  type WorkspaceForUser,
} from "@/lib/workspaces";

// Login is disabled — every request resolves to the effective (default) user,
// so API routes never return 401 for lack of a session. The return type keeps
// the original null-user union so existing `if (!user) return response` guards
// in routes still narrow `response` to a NextResponse (that branch is now dead).
export async function getApiUser(): Promise<
  | { user: EffectiveUser; response: null }
  | { user: null; response: NextResponse }
> {
  const user = await getEffectiveUser();
  return { user, response: null };
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
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) {
    return {
      user,
      project: null,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  const { canUserAccessProject } = await import("@/lib/access");
  const ok = await canUserAccessProject({
    userId: user.id,
    projectId: project.id,
  });
  if (!ok) {
    return {
      user,
      project: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user, project, response: null };
}
