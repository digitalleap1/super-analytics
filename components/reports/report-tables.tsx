"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CsvExportButton } from "./csv-export-button";
import { DeltaCell } from "./delta-cell";
import { PrintTableButton } from "./print-table-button";
import { SortableTable } from "./sortable-table";
import { formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import type {
  Ga4ChannelRow,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";

type Props = {
  projectName: string;
  rangeLabel: string;
  queries: GscQueryRow[];
  prevQueries?: GscQueryRow[] | null;
  pages: GscPageRow[];
  prevPages?: GscPageRow[] | null;
  channels: Ga4ChannelRow[];
  prevChannels?: Ga4ChannelRow[] | null;
  showQueries?: boolean;
  showPages?: boolean;
  showChannels?: boolean;
  rowLimit?: number;
};

function valueWithDelta(
  current: number,
  previous: number | null | undefined,
  formatted: string,
  invert = false,
) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-medium">{formatted}</span>
      {previous != null ? (
        <DeltaCell current={current} previous={previous} invert={invert} />
      ) : null}
    </span>
  );
}

export function ReportTables({
  projectName,
  rangeLabel,
  queries,
  prevQueries,
  pages,
  prevPages,
  channels,
  prevChannels,
  showQueries = true,
  showPages = true,
  showChannels = true,
  rowLimit = 50,
}: Props) {
  // Build O(1) lookup maps for previous-period rows so each table cell can
  // render a delta indicator next to the current value.
  const prevQueryByKey = useMemo(
    () => new Map((prevQueries ?? []).map((r) => [r.query, r])),
    [prevQueries],
  );
  const prevPageByKey = useMemo(
    () => new Map((prevPages ?? []).map((r) => [r.page, r])),
    [prevPages],
  );
  const prevChannelByKey = useMemo(
    () => new Map((prevChannels ?? []).map((r) => [r.channel, r])),
    [prevChannels],
  );
  // Pick the first visible tab as the default.
  const defaultTab = showQueries
    ? "queries"
    : showPages
      ? "pages"
      : showChannels
        ? "channels"
        : "queries";
  const queryColumns = useMemo<ColumnDef<GscQueryRow, unknown>[]>(
    () => [
      { accessorKey: "query", header: "Query" },
      {
        accessorKey: "clicks",
        header: "Clicks",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevQueryByKey.get(row.query);
          return valueWithDelta(row.clicks, prev?.clicks, formatNumber(row.clicks));
        },
      },
      {
        accessorKey: "impressions",
        header: "Impressions",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevQueryByKey.get(row.query);
          return valueWithDelta(
            row.impressions,
            prev?.impressions,
            formatNumber(row.impressions),
          );
        },
      },
      {
        accessorKey: "ctr",
        header: "CTR",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevQueryByKey.get(row.query);
          return valueWithDelta(row.ctr, prev?.ctr, formatPercent(row.ctr));
        },
      },
      {
        accessorKey: "position",
        header: "Avg position",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevQueryByKey.get(row.query);
          return valueWithDelta(
            row.position,
            prev?.position,
            formatPosition(row.position),
            true,
          );
        },
      },
    ],
    [prevQueryByKey],
  );

  const pageColumns = useMemo<ColumnDef<GscPageRow, unknown>[]>(
    () => [
      {
        accessorKey: "page",
        header: "Page",
        cell: (info) => {
          const v = info.getValue<string>();
          return (
            <a
              href={v}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {v.replace(/^https?:\/\//, "")}
            </a>
          );
        },
      },
      {
        accessorKey: "clicks",
        header: "Clicks",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevPageByKey.get(row.page);
          return valueWithDelta(row.clicks, prev?.clicks, formatNumber(row.clicks));
        },
      },
      {
        accessorKey: "impressions",
        header: "Impressions",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevPageByKey.get(row.page);
          return valueWithDelta(
            row.impressions,
            prev?.impressions,
            formatNumber(row.impressions),
          );
        },
      },
      {
        accessorKey: "ctr",
        header: "CTR",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevPageByKey.get(row.page);
          return valueWithDelta(row.ctr, prev?.ctr, formatPercent(row.ctr));
        },
      },
      {
        accessorKey: "position",
        header: "Avg position",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevPageByKey.get(row.page);
          return valueWithDelta(
            row.position,
            prev?.position,
            formatPosition(row.position),
            true,
          );
        },
      },
    ],
    [prevPageByKey],
  );

  const channelColumns = useMemo<ColumnDef<Ga4ChannelRow, unknown>[]>(
    () => [
      { accessorKey: "channel", header: "Channel" },
      {
        accessorKey: "sessions",
        header: "Sessions",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevChannelByKey.get(row.channel);
          return valueWithDelta(row.sessions, prev?.sessions, formatNumber(row.sessions));
        },
      },
      {
        accessorKey: "totalUsers",
        header: "Users",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevChannelByKey.get(row.channel);
          return valueWithDelta(
            row.totalUsers,
            prev?.totalUsers,
            formatNumber(row.totalUsers),
          );
        },
      },
      {
        accessorKey: "engagementRate",
        header: "Engagement",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevChannelByKey.get(row.channel);
          return valueWithDelta(
            row.engagementRate,
            prev?.engagementRate,
            formatPercent(row.engagementRate),
          );
        },
      },
      {
        accessorKey: "newUsers",
        header: "New users",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevChannelByKey.get(row.channel);
          return valueWithDelta(
            row.newUsers,
            prev?.newUsers,
            formatNumber(row.newUsers),
          );
        },
      },
      {
        accessorKey: "eventCount",
        header: "Events",
        cell: (info) => {
          const row = info.row.original;
          const prev = prevChannelByKey.get(row.channel);
          return valueWithDelta(
            row.eventCount,
            prev?.eventCount,
            formatNumber(row.eventCount),
          );
        },
      },
    ],
    [prevChannelByKey],
  );

  return (
    <Tabs defaultValue={defaultTab} className="space-y-2">
      <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          {showQueries ? (
            <TabsTrigger value="queries">Top queries</TabsTrigger>
          ) : null}
          {showPages ? <TabsTrigger value="pages">Top pages</TabsTrigger> : null}
          {showChannels ? (
            <TabsTrigger value="channels">GA4 channels</TabsTrigger>
          ) : null}
        </TabsList>
      </div>
      {showQueries ? (
        <TabsContent
          value="queries"
          forceMount
          className="space-y-2 data-[state=inactive]:hidden print:!block print:space-y-2 print:[&]:!block"
        >
          <h3 className="hidden text-sm font-semibold print:block">
            Top queries
          </h3>
          <div className="flex justify-end gap-2 print:hidden">
            <CsvExportButton
              filename={`${projectName}-queries`}
              rows={queries as unknown as Record<string, unknown>[]}
              columns={[
                { key: "query", header: "Query" },
                { key: "clicks", header: "Clicks" },
                { key: "impressions", header: "Impressions" },
                { key: "ctr", header: "CTR" },
                { key: "position", header: "Avg Position" },
              ]}
            />
            <PrintTableButton
              title="Top queries"
              projectName={projectName}
              rangeLabel={rangeLabel}
              rows={
                queries.slice(0, rowLimit).map((r) => ({
                  query: r.query,
                  clicks: formatNumber(r.clicks),
                  impressions: formatNumber(r.impressions),
                  ctr: formatPercent(r.ctr),
                  position: formatPosition(r.position),
                })) as Record<string, unknown>[]
              }
              columns={[
                { key: "query", header: "Query" },
                { key: "clicks", header: "Clicks" },
                { key: "impressions", header: "Impressions" },
                { key: "ctr", header: "CTR" },
                { key: "position", header: "Avg position" },
              ]}
            />
          </div>
          <SortableTable
            columns={queryColumns}
            data={queries.slice(0, rowLimit)}
            pageSize={rowLimit}
            emptyMessage="No queries in this range yet"
          />
        </TabsContent>
      ) : null}
      {showPages ? (
        <TabsContent
          value="pages"
          forceMount
          className="space-y-2 data-[state=inactive]:hidden print:!block print:mt-6 print:space-y-2 print:[&]:!block"
        >
          <h3 className="hidden text-sm font-semibold print:block">
            Top pages
          </h3>
          <div className="flex justify-end gap-2 print:hidden">
            <CsvExportButton
              filename={`${projectName}-pages`}
              rows={pages as unknown as Record<string, unknown>[]}
              columns={[
                { key: "page", header: "Page" },
                { key: "clicks", header: "Clicks" },
                { key: "impressions", header: "Impressions" },
                { key: "ctr", header: "CTR" },
                { key: "position", header: "Avg Position" },
              ]}
            />
            <PrintTableButton
              title="Top pages"
              projectName={projectName}
              rangeLabel={rangeLabel}
              rows={
                pages.slice(0, rowLimit).map((r) => ({
                  page: r.page.replace(/^https?:\/\//, ""),
                  clicks: formatNumber(r.clicks),
                  impressions: formatNumber(r.impressions),
                  ctr: formatPercent(r.ctr),
                  position: formatPosition(r.position),
                })) as Record<string, unknown>[]
              }
              columns={[
                { key: "page", header: "Page" },
                { key: "clicks", header: "Clicks" },
                { key: "impressions", header: "Impressions" },
                { key: "ctr", header: "CTR" },
                { key: "position", header: "Avg position" },
              ]}
            />
          </div>
          <SortableTable
            columns={pageColumns}
            data={pages.slice(0, rowLimit)}
            pageSize={rowLimit}
            emptyMessage="No pages in this range yet"
          />
        </TabsContent>
      ) : null}
      {showChannels ? (
        <TabsContent
          value="channels"
          forceMount
          className="space-y-2 data-[state=inactive]:hidden print:!block print:mt-6 print:space-y-2 print:[&]:!block"
        >
          <h3 className="hidden text-sm font-semibold print:block">
            GA4 channels
          </h3>
          <div className="flex justify-end gap-2 print:hidden">
            <CsvExportButton
              filename={`${projectName}-channels`}
              rows={channels as unknown as Record<string, unknown>[]}
              columns={[
                { key: "channel", header: "Channel" },
                { key: "sessions", header: "Sessions" },
                { key: "totalUsers", header: "Users" },
                { key: "engagementRate", header: "Engagement" },
                { key: "newUsers", header: "New users" },
                { key: "eventCount", header: "Events" },
              ]}
            />
            <PrintTableButton
              title="GA4 channels"
              projectName={projectName}
              rangeLabel={rangeLabel}
              rows={
                channels.slice(0, rowLimit).map((r) => ({
                  channel: r.channel,
                  sessions: formatNumber(r.sessions),
                  totalUsers: formatNumber(r.totalUsers),
                  engagementRate: formatPercent(r.engagementRate),
                  newUsers: formatNumber(r.newUsers),
                  eventCount: formatNumber(r.eventCount),
                })) as Record<string, unknown>[]
              }
              columns={[
                { key: "channel", header: "Channel" },
                { key: "sessions", header: "Sessions" },
                { key: "totalUsers", header: "Users" },
                { key: "engagementRate", header: "Engagement" },
                { key: "newUsers", header: "New users" },
                { key: "eventCount", header: "Events" },
              ]}
            />
          </div>
          <SortableTable
            columns={channelColumns}
            data={channels.slice(0, rowLimit)}
            pageSize={rowLimit}
            emptyMessage="No GA4 data in this range"
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
