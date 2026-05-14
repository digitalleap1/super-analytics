import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

export async function requireProject(projectId: string) {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) {
    redirect("/dashboard");
  }
  return { user, project };
}

export async function listProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { userId },
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
  ReturnType<typeof listProjectsForUser>
>[number];
