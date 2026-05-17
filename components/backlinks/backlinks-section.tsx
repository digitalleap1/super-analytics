"use client";

import { Card } from "@/components/ui/card";
import { AddBacklinkDialog } from "./add-backlink-dialog";
import { ImportBacklinksDialog } from "./import-backlinks-dialog";
import { BacklinksPieChart } from "./backlinks-pie-chart";
import { BacklinksTable } from "./backlinks-table";
import { BacklinksMonthlyTrend } from "./backlinks-monthly-trend";
import type { BacklinkMonthBucket, BacklinkRow } from "@/lib/backlinks";

type Props = {
  projectId: string;
  projectName: string;
  rangeLabel: string;
  rows: BacklinkRow[];
  monthly: BacklinkMonthBucket[];
};

export function BacklinksSection({
  projectId,
  projectName,
  rangeLabel,
  rows,
  monthly,
}: Props) {
  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Backlinks</h3>
          <p className="text-xs text-muted-foreground">
            Showing entries from {rangeLabel}. Monthly trend covers the last{" "}
            {monthly.length} months regardless of the date filter.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <ImportBacklinksDialog projectId={projectId} />
          <AddBacklinkDialog projectId={projectId} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Categories in range
          </p>
          <BacklinksPieChart rows={rows} />
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Monthly trend
          </p>
          <BacklinksMonthlyTrend months={monthly} />
        </div>
      </div>

      <BacklinksTable
        projectId={projectId}
        projectName={projectName}
        rows={rows}
      />
    </Card>
  );
}
