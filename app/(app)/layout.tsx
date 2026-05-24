import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import {
  ensureUserHasWorkspace,
  getCurrentWorkspaceForUser,
} from "@/lib/workspaces";
import { isWorkspaceAdmin } from "@/lib/access";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  let workspace = await getCurrentWorkspaceForUser(session.user.id);
  if (!workspace) workspace = await ensureUserHasWorkspace(session.user.id);
  const isAdmin = isWorkspaceAdmin(workspace.role);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        user={user}
        workspaceName={workspace.name}
        isAdmin={isAdmin}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} isAdmin={isAdmin} />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
