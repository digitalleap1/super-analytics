import { LayoutDashboard } from "lucide-react";

import { listProjectsForWorkspace, requireWorkspace } from "@/lib/projects";
import { NewProjectCard, ProjectCard } from "@/components/projects/project-card";
import { EmptyProjectsState } from "@/components/projects/empty-state";

export const metadata = {
  title: "Dashboard — SEO Dashboard",
};

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const projects = await listProjectsForWorkspace(workspace.id);

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[hsl(230_52%_35%)]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                {projects.length === 0
                  ? "Get your first client project up and running."
                  : `${projects.length} project${projects.length === 1 ? "" : "s"} in `}
                {projects.length === 0 ? (
                  ""
                ) : (
                  <span className="font-medium text-foreground">
                    {workspace.name}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyProjectsState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          <NewProjectCard />
        </div>
      )}
    </div>
  );
}
