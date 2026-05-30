import Link from "next/link";
import { ChevronLeft, Bookmark, Globe, ExternalLink } from "lucide-react";

import { requireProject } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SavedReportRowActions } from "@/components/reports/saved-report-row-actions";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const { project } = await requireProject(params.id);
  return { title: `Past reports — ${project.name}` };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SavedReportsPage({
  params,
}: {
  params: { id: string };
}) {
  const { project } = await requireProject(params.id);

  const reports = await prisma.savedReport.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fromDate: true,
      toDate: true,
      shareToken: true,
      createdAt: true,
    },
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
              Past reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Every report you&apos;ve saved for{" "}
              <span className="font-medium text-foreground">{project.name}</span>
              . Open any one to view it, share it, or send the public link to
              your client.
            </p>
          </div>
          <Button asChild>
            <Link href={`/projects/${project.id}`}>
              <Bookmark className="mr-2 h-4 w-4" />
              Save current view
            </Link>
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <Bookmark className="h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">No past reports yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Open the project, set the date range you want to share, click{" "}
            <strong>Save report</strong> and it&apos;ll show up here. You can
            then share each past report with a public link for clients.
          </p>
          <Button asChild className="mt-5">
            <Link href={`/projects/${project.id}`}>Go to project →</Link>
          </Button>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date range
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Saved
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Shared
                </th>
                <th className="w-32 px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}/reports/${r.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {formatDate(r.fromDate)} → {formatDate(r.toDate)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {r.shareToken ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Globe className="h-3 w-3" />
                        Public
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Private
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/projects/${project.id}/reports/${r.id}`}>
                          Open
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                      <SavedReportRowActions
                        projectId={project.id}
                        reportId={r.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
