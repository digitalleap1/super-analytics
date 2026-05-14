import Link from "next/link";
import { ExternalLink, MousePointerClick, Eye, TrendingUp, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { ProjectListItem } from "@/lib/projects";

function StatBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Eye;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

export function ProjectCard({ project }: { project: ProjectListItem }) {
  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <Card className="relative h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-primary/5 to-primary/0" />
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold leading-tight">
                {project.name}
              </h3>
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                {project.domain}
                <ExternalLink className="h-3 w-3" />
              </p>
            </div>
            {project.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.logoUrl}
                alt=""
                className="h-9 w-9 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold uppercase text-primary">
                {project.name.slice(0, 2)}
              </div>
            )}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatBlock label="Clicks" value="—" icon={MousePointerClick} />
            <StatBlock label="Impressions" value="—" icon={Eye} />
            <StatBlock label="Avg Position" value="—" icon={TrendingUp} />
            <StatBlock label="Users" value="—" icon={Users} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {project.gscSiteUrl
              ? "Connected to Search Console"
              : "Connect Search Console to see stats"}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export function NewProjectCard() {
  return (
    <Link
      href="/projects/new"
      className="group block h-full min-h-[200px] rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card/40 p-5 transition-colors hover:border-primary/60 hover:bg-card"
    >
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="text-2xl leading-none">+</span>
        </div>
        <div>
          <p className="text-sm font-medium">New project</p>
          <p className="text-xs text-muted-foreground">
            Add a client and connect data
          </p>
        </div>
      </div>
    </Link>
  );
}
