import { getEffectiveUser } from "@/lib/current-user";
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
  const current = await getEffectiveUser();

  const user = {
    name: current.name,
    email: current.email,
    image: current.image,
  };

  let workspace = await getCurrentWorkspaceForUser(current.id);
  if (!workspace) workspace = await ensureUserHasWorkspace(current.id);
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
