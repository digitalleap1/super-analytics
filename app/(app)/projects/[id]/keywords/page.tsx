import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireProject } from "@/lib/projects";
import { getKeywordSnapshot } from "@/lib/keywords";
import { AddKeywordsModal } from "@/components/keywords/add-keywords-modal";
import { KeywordsTable } from "@/components/keywords/keywords-table";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const { project } = await requireProject(params.id);
  return { title: `Keywords — ${project.name}` };
}

export default async function KeywordsPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, project } = await requireProject(params.id);
  const rows = await getKeywordSnapshot({
    userId: user.id,
    projectId: project.id,
    siteUrl: project.gscSiteUrl,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to project
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Keywords
            </h1>
            <p className="text-sm text-muted-foreground">
              Tracking ranking positions for {project.name}.
            </p>
          </div>
          <AddKeywordsModal projectId={project.id} />
        </div>
      </div>
      <KeywordsTable
        projectId={project.id}
        projectName={project.name}
        initialRows={rows}
      />
    </div>
  );
}
