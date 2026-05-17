"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CsvExportButton } from "./csv-export-button";
import { SortableTable } from "./sortable-table";
import { formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import type {
  Ga4ChannelRow,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";

type Props = {
  projectName: string;
  queries: GscQueryRow[];
  pages: GscPageRow[];
  channels: Ga4ChannelRow[];
  showQueries?: boolean;
  showPages?: boolean;
  showChannels?: boolean;
  rowLimit?: number;
};

export function ReportTables({
  projectName,
  queries,
  pages,
  channels,
  showQueries = true,
  showPages = true,
  showChannels = true,
  rowLimit = 50,
}: Props) {
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
        cell: (info) => formatNumber(info.getValue<number>()),
      },
      {
        accessorKey: "impressions",
        header: "Impressions",
        cell: (info) => formatNumber(info.getValue<number>()),
      },
      {
        accessorKey: "ctr",
        header: "CTR",
        cell: (info) => formatPercent(info.getValue<number>()),
      },
      {
        accessorKey: "position",
        header: "Avg position",
        cell: (info) => formatPosition(info.getValue<number>()),
      },
    ],
    [],
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
        cell: (info) => formatNumber(info.getValue<number>()),
      },
      {
        accessorKey: "impressions",
        header: "Impressions",
        cell: (info) => formatNumber(info.getValue<number>()),
      },
      {
        accessorKey: "ctr",
        header: "CTR",
        cell: (info) => formatPercent(info.getValue<number>()),
      },
      {
        accessorKey: "position",
        header: "Avg position",
        cell: (info) => formatPosition(info.getValue<number>()),
      },
    ],
    [],
  );

  const channelColumns = useMemo<ColumnDef<Ga4ChannelRow, unknown>[]>(
    () => [
      { accessorKey: "channel", header: "Channel" },
      {
        accessorKey: "sessions",
        header: "Sessions",
        cell: (info) => formatNumber(info.getValue<number>()),
      },
      {
        accessorKey: "totalUsers",
        header: "Users",
        cell: (info) => formatNumber(info.getValue<number>()),
      },
      {
        accessorKey: "engagementRate",
        header: "Engagement",
        cell: (info) => formatPercent(info.getValue<number>()),
      },
      {
        accessorKey: "keyEvents",
        header: "Key events",
        cell: (info) => formatNumber(info.getValue<number>()),
      },
      {
        accessorKey: "eventCount",
        header: "Events",
        cell: (info) => formatNumber(info.getValue<number>()),
      },
      {
        accessorKey: "conversions",
        header: "Conversions",
        cell: (info) => formatNumber(info.getValue<number>()),
      },
    ],
    [],
  );

  return (
    <Tabs defaultValue={defaultTab} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
        <TabsContent value="queries" className="space-y-2">
          <div className="flex justify-end">
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
          </div>
          <SortableTable
            columns={queryColumns}
            data={queries.slice(0, rowLimit)}
            pageSize={Math.min(10, rowLimit)}
            emptyMessage="No queries in this range yet"
          />
        </TabsContent>
      ) : null}
      {showPages ? (
        <TabsContent value="pages" className="space-y-2">
          <div className="flex justify-end">
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
          </div>
          <SortableTable
            columns={pageColumns}
            data={pages.slice(0, rowLimit)}
            pageSize={Math.min(10, rowLimit)}
            emptyMessage="No pages in this range yet"
          />
        </TabsContent>
      ) : null}
      {showChannels ? (
        <TabsContent value="channels" className="space-y-2">
          <div className="flex justify-end">
            <CsvExportButton
              filename={`${projectName}-channels`}
              rows={channels as unknown as Record<string, unknown>[]}
              columns={[
                { key: "channel", header: "Channel" },
                { key: "sessions", header: "Sessions" },
                { key: "totalUsers", header: "Users" },
                { key: "engagementRate", header: "Engagement" },
                { key: "keyEvents", header: "Key events" },
                { key: "eventCount", header: "Events" },
                { key: "conversions", header: "Conversions" },
              ]}
            />
          </div>
          <SortableTable
            columns={channelColumns}
            data={channels.slice(0, rowLimit)}
            pageSize={Math.min(10, rowLimit)}
            emptyMessage="No GA4 data in this range"
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
