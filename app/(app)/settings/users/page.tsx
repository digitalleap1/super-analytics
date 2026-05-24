import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Shield, ShieldCheck } from "lucide-react";

import { requireWorkspace } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/access";
import { Card } from "@/components/ui/card";
import { CreateUserForm } from "@/components/settings/create-user-form";

export const metadata = {
  title: "Users — SEO Dashboard",
};

function roleColor(role: string): string {
  switch (role) {
    case "owner":
      return "bg-primary/10 text-primary";
    case "admin":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "viewer":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

export default async function UsersPage() {
  const { user, workspace } = await requireWorkspace();

  if (!isWorkspaceAdmin(workspace.role)) {
    redirect("/settings/workspace");
  }

  const [memberships, projects] = await Promise.all([
    prisma.membership.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            _count: {
              select: {
                projectMemberships: {
                  where: { project: { workspaceId: workspace.id } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, domain: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to settings
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage who can sign in to{" "}
              <span className="font-medium text-foreground">
                {workspace.name}
              </span>{" "}
              and which projects each person sees.
            </p>
          </div>
          <CreateUserForm projects={projects} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Workspace role
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Project access
              </th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((m) => {
              const isAdmin = isWorkspaceAdmin(m.role);
              return (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium">
                      {isAdmin ? (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      )}
                      {m.user.name ?? "—"}
                      {m.user.id === user.id ? (
                        <span className="text-xs text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {m.user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleColor(m.role)}`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {isAdmin
                      ? `All ${projects.length} project${projects.length === 1 ? "" : "s"}`
                      : `${m.user._count.projectMemberships} of ${projects.length}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Tip: to change a teammate&apos;s project access, open the project →
        Settings → Team access.
      </p>
    </div>
  );
}
