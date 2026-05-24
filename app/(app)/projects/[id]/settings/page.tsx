import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireProject } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceDefaultTemplate } from "@/lib/templates";
import { isWorkspaceAdmin } from "@/lib/access";
import { EditProjectForm } from "@/components/projects/edit-project-form";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { DataSourcesForm } from "@/components/projects/data-sources-form";
import { ProjectGoogleConnect } from "@/components/projects/project-google-connect";
import { ProjectTemplatePicker } from "@/components/projects/project-template-picker";
import { TeamAccessSection } from "@/components/projects/team-access-section";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const { project } = await requireProject(params.id);
  return { title: `${project.name} settings — SEO Dashboard` };
}

export default async function ProjectSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, workspace, project } = await requireProject(params.id);

  const [userGoogleAccount, projectGoogleAccount] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: user.id, provider: "google" },
      select: { id: true },
    }),
    prisma.projectAccount.findUnique({
      where: { projectId: project.id },
      select: { email: true, connectedAt: true },
    }),
  ]);

  await ensureWorkspaceDefaultTemplate(workspace.id);
  const [templates, allMemberships, projectMembers] = await Promise.all([
    prisma.reportTemplate.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isDefault: true },
    }),
    prisma.membership.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const adminUsers = allMemberships.filter((m) => isWorkspaceAdmin(m.role));
  const memberUserIds = new Set(projectMembers.map((pm) => pm.userId));
  const adminUserIds = new Set(adminUsers.map((m) => m.user.id));

  const candidates = allMemberships
    .filter((m) => !adminUserIds.has(m.user.id) && !memberUserIds.has(m.user.id))
    .map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
    }));

  const canManageTeam = isWorkspaceAdmin(workspace.role);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Project settings
        </h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          General
        </h2>
        <EditProjectForm
          projectId={project.id}
          initial={{ name: project.name, domain: project.domain }}
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Data sources
        </h2>
        <ProjectGoogleConnect
          projectId={project.id}
          connection={
            projectGoogleAccount
              ? {
                  email: projectGoogleAccount.email,
                  connectedAt: projectGoogleAccount.connectedAt
                    .toISOString()
                    .slice(0, 10),
                }
              : null
          }
          canManage={canManageTeam}
        />
        {projectGoogleAccount || userGoogleAccount ? (
          <DataSourcesForm
            projectId={project.id}
            initial={{
              gscSiteUrl: project.gscSiteUrl,
              ga4PropertyId: project.ga4PropertyId,
            }}
          />
        ) : (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Connect a Google account above for this specific project (or
            your personal Google in{" "}
            <a href="/settings" className="text-primary hover:underline">
              account settings
            </a>
            ) to pick a Search Console site and GA4 property.
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Team access
        </h2>
        <TeamAccessSection
          projectId={project.id}
          members={projectMembers.map((pm) => ({
            id: pm.id,
            userId: pm.user.id,
            email: pm.user.email,
            name: pm.user.name,
            role: pm.role,
          }))}
          implicitAdmins={adminUsers.map((m) => ({
            userId: m.user.id,
            email: m.user.email,
            name: m.user.name,
          }))}
          candidates={candidates}
          canManage={canManageTeam}
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Report template
        </h2>
        <ProjectTemplatePicker
          projectId={project.id}
          currentTemplateId={project.templateId}
          templates={templates}
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-destructive">
          Danger zone
        </h2>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm">
            Permanently delete this project and all its associated data.
          </p>
          <div className="mt-4">
            <DeleteProjectDialog
              projectId={project.id}
              projectName={project.name}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
