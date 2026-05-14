import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireProject } from "@/lib/projects";
import { EditProjectForm } from "@/components/projects/edit-project-form";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
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
  const { project } = await requireProject(params.id);

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
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Reconnect Search Console and Google Analytics in Phase 4.
        </div>
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
