import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireWorkspace } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { Separator } from "@/components/ui/separator";
import { InviteSection } from "@/components/workspace/invite-section";
import { MembersList } from "@/components/workspace/members-list";

export const metadata = {
  title: "Workspace — SEO Dashboard",
};

export default async function WorkspaceSettingsPage() {
  const { user, workspace } = await requireWorkspace();

  const memberships = await prisma.membership.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const canManage = workspace.role === "owner" || workspace.role === "admin";

  const members = memberships.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    isYou: m.user.id === user.id,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {workspace.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage who has access to projects in this workspace.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Members ({members.length})
        </h2>
        <MembersList members={members} canManage={canManage} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Invite teammates
        </h2>
        <InviteSection canInvite={canManage} />
      </section>
    </div>
  );
}
