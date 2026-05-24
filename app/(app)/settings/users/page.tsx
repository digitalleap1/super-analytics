import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Shield, ShieldCheck, UserCircle } from "lucide-react";

import { requireWorkspace } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { isWorkspaceAdmin } from "@/lib/access";
import { Card } from "@/components/ui/card";
import { CreateUserForm } from "@/components/settings/create-user-form";
import { UserRowActions } from "@/components/settings/user-row-actions";

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

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function UsersPage() {
  const { user, workspace } = await requireWorkspace();

  if (!isWorkspaceAdmin(workspace.role)) {
    redirect("/settings/workspace");
  }

  // Pull EVERY registered user on the platform. For each, attach their
  // membership in THIS workspace (if any) plus their project-access count
  // for projects in this workspace. This lets the admin see who registered
  // via /register but never got added to the workspace.
  const [allUsers, projects] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        passwordHash: true, // only used to detect "has a password" — never sent to client
        memberships: {
          where: { workspaceId: workspace.id },
          select: { id: true, role: true, createdAt: true },
        },
        accounts: {
          where: { provider: "google" },
          select: { id: true },
        },
        _count: {
          select: {
            projectMemberships: {
              where: { project: { workspaceId: workspace.id } },
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

  // Sort: in-workspace first, then outsiders. Within each group, newest first.
  const ordered = allUsers.slice().sort((a, b) => {
    const aIn = a.memberships.length > 0 ? 0 : 1;
    const bIn = b.memberships.length > 0 ? 0 : 1;
    if (aIn !== bIn) return aIn - bIn;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const inWorkspaceCount = allUsers.filter((u) => u.memberships.length > 0).length;
  const outsideCount = allUsers.length - inWorkspaceCount;

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
              Every registered account on this dashboard.{" "}
              <span className="font-medium text-foreground">
                {inWorkspaceCount}
              </span>{" "}
              in {workspace.name},{" "}
              <span className="font-medium text-foreground">
                {outsideCount}
              </span>{" "}
              outside.
            </p>
          </div>
          <CreateUserForm projects={projects} />
        </div>
      </div>

      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        <strong>Passwords can&apos;t be displayed.</strong> They&apos;re stored
        as bcrypt hashes — once set, the original is unrecoverable by anyone.
        Use <strong>Reset password</strong> in the row menu to set a new one
        and share that with the user.
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                User
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Auth
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Project access
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Registered
              </th>
              <th className="w-12 px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((u) => {
              const m = u.memberships[0] ?? null;
              const isInWorkspace = !!m;
              const isAdmin = m ? isWorkspaceAdmin(m.role) : false;
              const hasGoogle = u.accounts.length > 0;
              const hasPassword = !!u.passwordHash;
              return (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                        {u.name
                          ? u.name
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                          : u.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {u.name ?? "—"}
                          {u.id === user.id ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs font-mono text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isInWorkspace ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleColor(m!.role)}`}
                      >
                        {isAdmin ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <Shield className="h-3 w-3" />
                        )}
                        {m!.role}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <UserCircle className="h-3 w-3" />
                        Outside workspace
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {[hasPassword && "password", hasGoogle && "google"]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {!isInWorkspace
                      ? "—"
                      : isAdmin
                        ? `All ${projects.length} project${projects.length === 1 ? "" : "s"}`
                        : `${u._count.projectMemberships} of ${projects.length}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {ymd(u.createdAt)}
                  </td>
                  <td className="px-2 py-3">
                    <UserRowActions
                      userId={u.id}
                      email={u.email}
                      isInWorkspace={isInWorkspace}
                      workspaceRole={(m?.role as "owner" | "admin" | "member" | "viewer") ?? null}
                      isYou={u.id === user.id}
                    />
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
