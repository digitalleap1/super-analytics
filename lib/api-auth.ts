import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function getApiProject(projectId: string) {
  const { user, response } = await getApiUser();
  if (!user) return { user: null, project: null, response };
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
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
