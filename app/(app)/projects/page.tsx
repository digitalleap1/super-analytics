import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";

import { requireWorkspace } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { ProjectsTable, type ProjectRow } from "@/components/projects/projects-table";

export const metadata = {
  title: "Projects — Super Analytics",
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function ProjectsListPage() {
  const { user, workspace } = await requireWorkspace();
  const access = await getProjectAccess({
    userId: user.id,
    workspaceId: workspace.id,
  });
  if (!access) {
    return (
      <div className="text-sm text-muted-foreground">
        You&apos;re not a member of this workspace yet.
      </div>
    );
  }

  const where = access.admin
    ? { workspaceId: workspace.id }
    : { workspaceId: workspace.id, id: { in: access.projectIds } };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      template: { select: { id: true, name: true } },
      googleAccounts: { select: { id: true } },
      _count: {
        select: {
          keywords: true,
          backlinks: true,
          members: true,
        },
      },
    },
  });

  const rows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    domain: p.domain,
    logoUrl: p.logoUrl,
    gscSiteUrl: p.gscSiteUrl,
    ga4PropertyId: p.ga4PropertyId,
    googleConnected: p.googleAccounts.length > 0,
    templateName: p.template?.name ?? null,
    keywordCount: p._count.keywords,
    backlinkCount: p._count.backlinks,
    // Admins implicitly access every project; show "all workspace members" count
    // for them, else the ProjectMember count.
    memberCount: p._count.members,
    isImplicitAdmin: access.admin,
    createdAt: ymd(p.createdAt),
    updatedAt: ymd(p.updatedAt),
  }));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[hsl(230_52%_35%)]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Projects
              </h1>
              <p className="text-sm text-muted-foreground">
                {projects.length} project{projects.length === 1 ? "" : "s"} in{" "}
                <span className="font-medium text-foreground">
                  {workspace.name}
                </span>
                {access.admin ? null : (
                  <span className="ml-2 text-xs">· filtered to projects you can access</span>
                )}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Link>
          </Button>
        </div>
      </div>

      <ProjectsTable projects={rows} />
    </div>
  );
}
