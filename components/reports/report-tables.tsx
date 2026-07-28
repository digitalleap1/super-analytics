"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeOff, ListFilter, Loader2, RotateCcw, Save, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CsvExportButton } from "./csv-export-button";
import { DeltaCell } from "./delta-cell";
import { PrintTableButton } from "./print-table-button";
import { SortableTable } from "./sortable-table";
import { formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import {
  applyExclusions,
  matcherFor,
  type FilterMode,
  type ReportExclusions,
} from "@/lib/report-exclusions";
import type {
  Ga4ChannelRow,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";

type CTab = "queries" | "pages" | "channels";

// When present (live report only), the tables gain an inline "Curate rows"
// mode: a real-time per-table filter + per-row hide, applied to the report and
// every export from the persisted `exclusions`. Absent for snapshot/share
// views (their data is already curated).
export type ReportCuration = {
  raw: { queries: GscQueryRow[]; pages: GscPageRow[]; channels: Ga4ChannelRow[] };
  limit: { queries: number; pages: number; channels: number };
  exclusions: ReportExclusions;
  onChange: (next: ReportExclusions) => void;
  onSave: () => Promise<void>;
  saving: boolean;
};

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
  curation?: ReportCuration;
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
  curation,
}: Props) {
  // Inline curation UI: off by default so the report reads clean; toggling it
  // on reveals the filter bar + per-row hide controls (all print:hidden, so
  // they never reach an export). The curation itself always applies regardless.
  const [curateMode, setCurateMode] = useState(false);
  const [showHidden, setShowHidden] = useState<Record<CTab, boolean>>({
    queries: false,
    pages: false,
    channels: false,
  });

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

  const defaultTab = showQueries
    ? "queries"
    : showPages
      ? "pages"
      : showChannels
        ? "channels"
        : "queries";

  // --- curation helpers ----------------------------------------------------
  const ex = curation?.exclusions;
  const setFilter = (tab: CTab, patch: Partial<{ mode: FilterMode; text: string }>) => {
    if (!curation || !ex) return;
    curation.onChange({
      ...ex,
      filters: { ...ex.filters, [tab]: { ...ex.filters[tab], ...patch } },
    });
  };
  const setHidden = (tab: CTab, key: string, hide: boolean) => {
    if (!curation || !ex) return;
    const set = new Set(ex[tab]);
    if (hide) set.add(key);
    else set.delete(key);
    curation.onChange({ ...ex, [tab]: Array.from(set) });
  };
  const bulkHidden = (tab: CTab, keys: string[], hide: boolean) => {
    if (!curation || !ex) return;
    const set = new Set(ex[tab]);
    for (const k of keys) {
      if (hide) set.add(k);
      else set.delete(k);
    }
    curation.onChange({ ...ex, [tab]: Array.from(set) });
  };

  // The rows to display for a tab: persisted filter + hidden always applied
  // (matches parent + every export). In curate mode we optionally append the
  // explicitly-hidden rows (struck-through) so they can be restored.
  function tabData<T>(
    tab: CTab,
    fallback: T[],
    rawRows: T[] | undefined,
    keyOf: (r: T) => string,
  ): { display: T[]; hiddenKeys: Set<string>; limit: number } {
    if (!curation || !ex || !rawRows) {
      return { display: fallback, hiddenKeys: new Set(), limit: rowLimit };
    }
    const limit = curation.limit[tab];
    const hiddenKeys = new Set(ex[tab]);
    const match = matcherFor(ex.filters[tab]);
    const kept = rawRows.filter((r) => match(keyOf(r)) && !hiddenKeys.has(keyOf(r)));
    const limited = kept.slice(0, limit);
    if (curateMode && showHidden[tab]) {
      const hiddenRows = rawRows.filter((r) => hiddenKeys.has(keyOf(r)));
      return { display: [...limited, ...hiddenRows], hiddenKeys, limit };
    }
    return { display: limited, hiddenKeys, limit };
  }

  function actionColumn<T>(tab: CTab, keyOf: (r: T) => string): ColumnDef<T, unknown> {
    return {
      id: "__curate",
      header: () => null,
      enableSorting: false,
      meta: { tdClassName: "print:hidden w-8", thClassName: "print:hidden w-8" },
      cell: ({ row }) => {
        const key = keyOf(row.original);
        const isHidden = ex ? ex[tab].includes(key) : false;
        return (
          <button
            type="button"
            onClick={() => setHidden(tab, key, !isHidden)}
            title={isHidden ? "Show in report" : "Hide from report"}
            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
          >
            {isHidden ? (
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-rose-500" />
            )}
          </button>
        );
      },
    };
  }

  const rowClassName = <T,>(tab: CTab, keyOf: (r: T) => string) =>
    curation && ex
      ? (row: T) =>
          ex[tab].includes(keyOf(row))
            ? "opacity-50 line-through"
            : undefined
      : undefined;

  // Inline filter bar for a tab (real-time; print:hidden so it never exports).
  function CurateBar({
    tab,
    matchedCount,
    keptCount,
    totalCount,
  }: {
    tab: CTab;
    matchedCount: number;
    keptCount: number;
    totalCount: number;
  }) {
    if (!curation || !ex) return null;
    const f = ex.filters[tab];
    const filtering = f.text.trim().length > 0;
    const hiddenCount = ex[tab].length;
    return (
      <div className="print:hidden space-y-2 rounded-md border border-primary/30 bg-primary/5 p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={f.mode}
            onValueChange={(v) => setFilter(tab, { mode: v as FilterMode })}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="not_contains">Doesn&apos;t contain</SelectItem>
              <SelectItem value="regex">Custom regex</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={f.text}
              onChange={(e) => setFilter(tab, { text: e.target.value })}
              placeholder={
                f.mode === "regex" ? `Regex for ${tab}…` : `Filter ${tab}…`
              }
              className="h-8 pl-8"
            />
          </div>
          <Button
            size="sm"
            onClick={() => curation.onSave()}
            disabled={curation.saving}
          >
            {curation.saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {keptCount} of {totalCount} shown
            {hiddenCount ? ` · ${hiddenCount} hidden` : ""}
            {filtering ? ` · ${matchedCount} match filter` : ""}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {hiddenCount ? (
              <button
                type="button"
                className="hover:text-foreground hover:underline"
                onClick={() =>
                  setShowHidden((s) => ({ ...s, [tab]: !s[tab] }))
                }
              >
                {showHidden[tab] ? "Hide hidden rows" : `Show ${hiddenCount} hidden`}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded border px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
              onClick={() => bulkHidden(tab, ex[tab], false)}
              disabled={!hiddenCount}
            >
              Clear hidden
            </button>
          </div>
        </div>
      </div>
    );
  }

  const curateToggle = curation ? (
    <Button
      variant={curateMode ? "default" : "outline"}
      size="sm"
      onClick={() => setCurateMode((v) => !v)}
      className="print:hidden"
    >
      <ListFilter className="mr-1.5 h-4 w-4" />
      {curateMode ? "Done curating" : "Curate rows"}
      {ex && (ex.queries.length || ex.pages.length || ex.channels.length) ? (
        <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {ex.queries.length + ex.pages.length + ex.channels.length}
        </span>
      ) : null}
    </Button>
  ) : null;

  // --- column defs (base; action col prepended in curate mode) -------------
  const queryColumnsBase = useMemo<ColumnDef<GscQueryRow, unknown>[]>(
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

  const pageColumnsBase = useMemo<ColumnDef<GscPageRow, unknown>[]>(
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

  const channelColumnsBase = useMemo<ColumnDef<Ga4ChannelRow, unknown>[]>(
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

  // Precompute filtered counts (for the CurateBar labels).
  const filteredAll =
    curation && ex
      ? applyExclusions(curation.raw, ex)
      : { queries, pages, channels };

  const q = tabData("queries", queries, curation?.raw.queries, (r: GscQueryRow) => r.query);
  const pg = tabData("pages", pages, curation?.raw.pages, (r: GscPageRow) => r.page);
  const ch = tabData("channels", channels, curation?.raw.channels, (r: Ga4ChannelRow) => r.channel);

  const queryColumns = curateMode
    ? [actionColumn<GscQueryRow>("queries", (r) => r.query), ...queryColumnsBase]
    : queryColumnsBase;
  const pageColumns = curateMode
    ? [actionColumn<GscPageRow>("pages", (r) => r.page), ...pageColumnsBase]
    : pageColumnsBase;
  const channelColumns = curateMode
    ? [actionColumn<Ga4ChannelRow>("channels", (r) => r.channel), ...channelColumnsBase]
    : channelColumnsBase;

  // CSV/print export the kept (curated, non-hidden) rows — what's in the report.
  const csvQueries = curation ? filteredAll.queries.slice(0, q.limit) : queries;
  const csvPages = curation ? filteredAll.pages.slice(0, pg.limit) : pages;
  const csvChannels = curation ? filteredAll.channels.slice(0, ch.limit) : channels;

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
        {curateToggle}
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
          {curateMode
            ? CurateBar({
                tab: "queries",
                totalCount: curation?.raw.queries.length ?? 0,
                keptCount: filteredAll.queries.length,
                matchedCount: filteredAll.queries.length,
              })
            : null}
          <div className="flex flex-wrap justify-end gap-2 print:hidden">
            <CsvExportButton
              filename={`${projectName}-queries`}
              rows={csvQueries.map((r) => ({
                query: r.query,
                clicks: r.clicks,
                impressions: r.impressions,
                ctr: formatPercent(r.ctr),
                position: formatPosition(r.position),
              }))}
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
                csvQueries.map((r) => ({
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
            data={q.display}
            pageSize={q.display.length || 1}
            emptyMessage="No queries in this range yet"
            rowClassName={rowClassName<GscQueryRow>("queries", (r) => r.query)}
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
          {curateMode
            ? CurateBar({
                tab: "pages",
                totalCount: curation?.raw.pages.length ?? 0,
                keptCount: filteredAll.pages.length,
                matchedCount: filteredAll.pages.length,
              })
            : null}
          <div className="flex flex-wrap justify-end gap-2 print:hidden">
            <CsvExportButton
              filename={`${projectName}-pages`}
              rows={csvPages.map((r) => ({
                page: r.page,
                clicks: r.clicks,
                impressions: r.impressions,
                ctr: formatPercent(r.ctr),
                position: formatPosition(r.position),
              }))}
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
                csvPages.map((r) => ({
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
            data={pg.display}
            pageSize={pg.display.length || 1}
            emptyMessage="No pages in this range yet"
            rowClassName={rowClassName<GscPageRow>("pages", (r) => r.page)}
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
          {curateMode
            ? CurateBar({
                tab: "channels",
                totalCount: curation?.raw.channels.length ?? 0,
                keptCount: filteredAll.channels.length,
                matchedCount: filteredAll.channels.length,
              })
            : null}
          <div className="flex flex-wrap justify-end gap-2 print:hidden">
            <CsvExportButton
              filename={`${projectName}-channels`}
              rows={csvChannels.map((r) => ({
                channel: r.channel,
                sessions: r.sessions,
                totalUsers: r.totalUsers,
                engagementRate: formatPercent(r.engagementRate),
                eventCount: r.eventCount,
              }))}
              columns={[
                { key: "channel", header: "Channel" },
                { key: "sessions", header: "Sessions" },
                { key: "totalUsers", header: "Users" },
                { key: "engagementRate", header: "Engagement" },
                { key: "eventCount", header: "Events" },
              ]}
            />
            <PrintTableButton
              title="GA4 channels"
              projectName={projectName}
              rangeLabel={rangeLabel}
              rows={
                csvChannels.map((r) => ({
                  channel: r.channel,
                  sessions: formatNumber(r.sessions),
                  totalUsers: formatNumber(r.totalUsers),
                  engagementRate: formatPercent(r.engagementRate),
                  eventCount: formatNumber(r.eventCount),
                })) as Record<string, unknown>[]
              }
              columns={[
                { key: "channel", header: "Channel" },
                { key: "sessions", header: "Sessions" },
                { key: "totalUsers", header: "Users" },
                { key: "engagementRate", header: "Engagement" },
                { key: "eventCount", header: "Events" },
              ]}
            />
          </div>
          <SortableTable
            columns={channelColumns}
            data={ch.display}
            pageSize={ch.display.length || 1}
            emptyMessage="No GA4 data in this range"
            rowClassName={rowClassName<Ga4ChannelRow>("channels", (r) => r.channel)}
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
