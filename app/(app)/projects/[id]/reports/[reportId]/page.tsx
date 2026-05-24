import { notFound } from "next/navigation";

import { requireProject } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { parseSnapshot } from "@/lib/saved-reports";
import { reportPeriodLabel } from "@/lib/date-ranges";
import { EditableProjectReport } from "@/components/reports/editable-project-report";
import { Card } from "@/components/ui/card";
import { SavedReportShare } from "@/components/reports/saved-report-share";

export async function generateMetadata({
  params,
}: {
  params: { id: string; reportId: string };
}) {
  return { title: `Saved report — SEO Dashboard` };
}

export default async function ViewSavedReportPage({
  params,
}: {
  params: { id: string; reportId: string };
}) {
  const { project } = await requireProject(params.id);

  const saved = await prisma.savedReport.findFirst({
    where: { id: params.reportId, projectId: project.id },
  });
  if (!saved) notFound();

  const snapshot = parseSnapshot(saved.snapshot);
  if (!snapshot) notFound();

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary/5 p-4 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Sharing
          </p>
          <p className="text-sm text-muted-foreground">
            Generate a public link to send this exact snapshot to a client.
          </p>
        </div>
        <SavedReportShare
          projectId={project.id}
          reportId={saved.id}
          initialToken={saved.shareToken}
        />
      </Card>

      <EditableProjectReport
        project={{
          id: project.id,
          name: snapshot.projectName,
          domain: snapshot.projectDomain,
        }}
        template={snapshot.template}
        initialConfig={snapshot.config}
        rangeLabel={snapshot.rangeLabel}
        compare={snapshot.compare}
        isStub={snapshot.isStub}
        pdfFilename={snapshot.pdfFilename}
        overview={snapshot.overview}
        prevOverview={snapshot.prevOverview}
        ga4Overview={snapshot.ga4Overview}
        prevGa4={snapshot.prevGa4}
        queries={snapshot.queries}
        pages={snapshot.pages}
        channels={snapshot.channels}
        keywords={snapshot.keywords}
        backlinks={snapshot.backlinks}
        backlinkMonthly={snapshot.backlinkMonthly}
        fromDate={snapshot.fromDate}
        toDate={snapshot.toDate}
        reportPeriodLabel={reportPeriodLabel({
          from: new Date(snapshot.fromDate),
          to: new Date(snapshot.toDate),
        })}
        mode="snapshot"
        snapshotMeta={{
          name: saved.name,
          createdAt: saved.createdAt.toISOString().slice(0, 10),
        }}
      />
    </div>
  );
}
