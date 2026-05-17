import { listProjectsForWorkspace, requireWorkspace } from "@/lib/projects";
import { NewProjectCard, ProjectCard } from "@/components/projects/project-card";
import { EmptyProjectsState } from "@/components/projects/empty-state";

export const metadata = {
  title: "Dashboard — SEO Dashboard",
};

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const projects = await listProjectsForWorkspace(workspace.id);

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            All projects in <span className="font-medium">{workspace.name}</span>.
          </p>
        </div>
        <EmptyProjectsState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            All projects in <span className="font-medium">{workspace.name}</span>.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        <NewProjectCard />
      </div>
    </div>
  );
}
