"use client";

import { Card } from "@/components/ui/card";
import { AddBacklinkDialog } from "./add-backlink-dialog";
import { ImportBacklinksDialog } from "./import-backlinks-dialog";
import { BacklinksPieChart } from "./backlinks-pie-chart";
import { BacklinksTable } from "./backlinks-table";
import type { BacklinkRow } from "@/lib/backlinks";

type Props = {
  projectId: string;
  projectName: string;
  rangeLabel: string;
  rows: BacklinkRow[];
};

export function BacklinksSection({
  projectId,
  projectName,
  rangeLabel,
  rows,
}: Props) {
  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Backlinks</h3>
          <p className="text-xs text-muted-foreground">
            Created during {rangeLabel}. Categories breakdown shown in the pie.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <ImportBacklinksDialog projectId={projectId} />
          <AddBacklinkDialog projectId={projectId} />
        </div>
      </div>

      <BacklinksPieChart rows={rows} />

      <BacklinksTable
        projectId={projectId}
        projectName={projectName}
        rows={rows}
      />
    </Card>
  );
}
