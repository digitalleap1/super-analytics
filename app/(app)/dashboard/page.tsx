import { LayoutDashboard } from "lucide-react";

import { listAccessibleProjectsForUser, requireWorkspace } from "@/lib/projects";
import { NewProjectCard, ProjectCard } from "@/components/projects/project-card";
import { EmptyProjectsState } from "@/components/projects/empty-state";
import { presetRange, ymd } from "@/lib/date-ranges";
import { withCache } from "@/lib/cache";
import { getGscOverview } from "@/lib/google/gsc";
import { getGa4Overview } from "@/lib/google/ga4";

export const metadata = {
  title: "Dashboard — Super Analytics",
};

export default async function DashboardPage() {
  const { user, workspace } = await requireWorkspace();
  const projects = await listAccessibleProjectsForUser({
    userId: user.id,
    workspaceId: workspace.id,
  });

  // Pull last-28-days stats for every connected project in parallel. Each
  // fetch goes through ReportCache (6h TTL), so the dashboard pays the
  // Google API cost once per project per 6h and is instant on repeat loads.
  const range = presetRange("last28");
  const cacheSuffix = "dashboard";

  const projectsWithStats = await Promise.all(
    projects.map(async (p) => {
      const baseKey = {
        from: ymd(range.from),
        to: ymd(range.to),
        suffix: cacheSuffix,
      };

      const [gsc, ga4] = await Promise.all([
        p.gscSiteUrl
          ? withCache(p.id, "gsc_overview", baseKey, () =>
              getGscOverview({
                userId: user.id,
                projectId: p.id,
                siteUrl: p.gscSiteUrl,
                from: range.from,
                to: range.to,
              }),
            )
          : null,
        p.ga4PropertyId
          ? withCache(p.id, "ga4_overview", baseKey, () =>
              getGa4Overview({
                userId: user.id,
                projectId: p.id,
                propertyId: p.ga4PropertyId,
                from: range.from,
                to: range.to,
              }),
            )
          : null,
      ]);

      return {
        ...p,
        stats: {
          clicks: gsc?.totals.clicks ?? null,
          impressions: gsc?.totals.impressions ?? null,
          position: gsc?.totals.position ?? null,
          users: ga4?.totals.totalUsers ?? null,
          gscSource: gsc?.source ?? null,
          ga4Source: ga4?.source ?? null,
        },
      };
    }),
  );

  return (
    <div className="space-y-6">
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
                {projects.length > 0 ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    · stats over last 28 days
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyProjectsState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projectsWithStats.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          <NewProjectCard />
        </div>
      )}
    </div>
  );
}
