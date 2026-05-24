import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { parseSnapshot } from "@/lib/saved-reports";
import { reportPeriodLabel } from "@/lib/date-ranges";
import { EditableProjectReport } from "@/components/reports/editable-project-report";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}) {
  const saved = await prisma.savedReport.findUnique({
    where: { shareToken: params.token },
    select: { name: true },
  });
  return { title: saved ? `${saved.name} — Shared report` : "Shared report" };
}

export default async function PublicReportPage({
  params,
}: {
  params: { token: string };
}) {
  const saved = await prisma.savedReport.findUnique({
    where: { shareToken: params.token },
  });
  if (!saved) notFound();

  const snapshot = parseSnapshot(saved.snapshot);
  if (!snapshot) notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal public-only header — no app shell */}
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span>SEO Dashboard</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            Shared report — read only
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <EditableProjectReport
          project={{
            id: "",
            name: snapshot.projectName,
            domain: snapshot.projectDomain,
            logoUrl: snapshot.projectLogoUrl ?? null,
          }}
          template={null}
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
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-center text-xs text-muted-foreground md:px-8">
        Powered by SEO Dashboard
      </footer>
    </div>
  );
}
