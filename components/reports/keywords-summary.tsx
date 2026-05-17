"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Minus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CsvExportButton } from "./csv-export-button";
import {
  cn,
  formatNumber,
  formatPosition,
} from "@/lib/utils";
import type { KeywordRow } from "@/lib/keywords";

function deltaBadge(delta: number | null) {
  if (delta === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center text-muted-foreground">
        <Minus className="mr-0.5 h-3 w-3" />0
      </span>
    );
  }
  const improved = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium",
        improved
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400",
      )}
    >
      {improved ? (
        <ArrowUp className="mr-0.5 h-3 w-3" />
      ) : (
        <ArrowDown className="mr-0.5 h-3 w-3" />
      )}
      {Math.abs(delta).toFixed(1)}
    </span>
  );
}

type Props = {
  projectId: string;
  projectName: string;
  rows: KeywordRow[];
  limit?: number;
};

export function KeywordsSummary({
  projectId,
  projectName,
  rows,
  limit = 25,
}: Props) {
  // Sort: rows with a current position first, then by best current rank.
  const sorted = [...rows].sort((a, b) => {
    if (a.currentPosition == null && b.currentPosition == null) return 0;
    if (a.currentPosition == null) return 1;
    if (b.currentPosition == null) return -1;
    return a.currentPosition - b.currentPosition;
  });
  const top = sorted.slice(0, limit);

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Tracked keywords</h3>
          <p className="text-xs text-muted-foreground">
            Position changes over the selected range.
            {rows.length > limit
              ? ` Showing top ${limit} of ${rows.length}.`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <CsvExportButton
            filename={`${projectName}-keywords`}
            rows={
              rows.map((r) => ({
                query: r.query,
                country: r.country,
                device: r.device,
                startPosition: r.startPosition?.toFixed(1) ?? "",
                currentPosition: r.currentPosition?.toFixed(1) ?? "",
                delta: r.delta?.toFixed(1) ?? "",
                clicks: r.clicks,
                impressions: r.impressions,
                bestPosition: r.bestPosition?.toFixed(1) ?? "",
                tag: r.tag ?? "",
                source: r.source,
              })) as Record<string, unknown>[]
            }
            columns={[
              { key: "query", header: "Query" },
              { key: "country", header: "Country" },
              { key: "device", header: "Device" },
              { key: "startPosition", header: "Range start" },
              { key: "currentPosition", header: "Current" },
              { key: "delta", header: "Δ" },
              { key: "clicks", header: "Clicks" },
              { key: "impressions", header: "Impressions" },
              { key: "bestPosition", header: "Best" },
              { key: "tag", header: "Tag" },
              { key: "source", header: "Source" },
            ]}
          />
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectId}/keywords`}>
              View all
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
          No keywords tracked yet.{" "}
          <Link
            href={`/projects/${projectId}/keywords`}
            className="text-primary hover:underline"
          >
            Add some
          </Link>{" "}
          to see ranking changes here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Query
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Country
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Device
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Start
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Δ
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Clicks
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Best
                </th>
              </tr>
            </thead>
            <tbody>
              {top.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.query}</td>
                  <td className="px-3 py-2 uppercase text-muted-foreground">
                    {row.country}
                  </td>
                  <td className="px-3 py-2 capitalize text-muted-foreground">
                    {row.device}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatPosition(row.startPosition)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatPosition(row.currentPosition)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {deltaBadge(row.delta)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(row.clicks)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatPosition(row.bestPosition)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
