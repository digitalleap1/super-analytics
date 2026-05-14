import Link from "next/link";
import { ExternalLink, Settings } from "lucide-react";

import { requireProject } from "@/lib/projects";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const { project } = await requireProject(params.id);
  return { title: `${project.name} — SEO Dashboard` };
}

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const { project } = await requireProject(params.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <a
            href={`https://${project.domain}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {project.domain}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${project.id}/settings`}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-dashed bg-card/40 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Reports load here after you connect Google in Phase 4 and KPIs/charts
          are wired in Phase 5.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${project.id}/keywords`}>
              Keywords (Phase 6)
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ConnectionPill
          label="Search Console"
          value={project.gscSiteUrl}
          empty="Not connected"
        />
        <ConnectionPill
          label="Google Analytics 4"
          value={project.ga4PropertyId}
          empty="Not connected"
        />
      </div>
    </div>
  );
}

function ConnectionPill({
  label,
  value,
  empty,
}: {
  label: string;
  value: string | null;
  empty: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-sm ${value ? "" : "text-muted-foreground"}`}>
        {value ?? empty}
      </p>
    </div>
  );
}
