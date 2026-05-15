"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn, formatNumber, formatPosition } from "@/lib/utils";
import { CsvExportButton } from "@/components/reports/csv-export-button";
import { KeywordHistoryChart } from "./keyword-history-chart";
import type { KeywordRow } from "@/lib/keywords";

type SortKey =
  | "query"
  | "currentPosition"
  | "delta7d"
  | "delta28d"
  | "clicks28d"
  | "impressions28d"
  | "bestPosition";

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
  // Positive delta = position improved (number went down by `delta`)
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
  initialRows: KeywordRow[];
};

export function KeywordsTable({ projectId, projectName, initialRows }: Props) {
  const router = useRouter();
  const [rows] = useState<KeywordRow[]>(initialRows);
  const [sortKey, setSortKey] = useState<SortKey>("currentPosition");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") {
        return sortDir === "asc"
          ? va.localeCompare(vb as string)
          : (vb as string).localeCompare(va);
      }
      return sortDir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} keyword(s)?`)) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/keywords?ids=${Array.from(selected).join(",")}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Could not delete keywords");
        return;
      }
      const body = (await res.json()) as { deleted: number };
      toast.success(`Deleted ${body.deleted} keyword${body.deleted === 1 ? "" : "s"}`);
      setSelected(new Set());
      router.refresh();
    });
  }

  function SortHeader({ k, label }: { k: SortKey; label: string }) {
    const isActive = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        {label}
        {isActive ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/40 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No keywords tracked yet. Use the &ldquo;Add keywords&rdquo; button
          above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteSelected}
                disabled={isPending}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {rows.length} keyword{rows.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <CsvExportButton
          filename={`${projectName}-keywords`}
          rows={
            rows.map((r) => ({
              query: r.query,
              country: r.country,
              device: r.device,
              currentPosition: r.currentPosition?.toFixed(1) ?? "",
              delta7d: r.delta7d?.toFixed(1) ?? "",
              delta28d: r.delta28d?.toFixed(1) ?? "",
              clicks28d: r.clicks28d,
              impressions28d: r.impressions28d,
              bestPosition: r.bestPosition?.toFixed(1) ?? "",
              tag: r.tag ?? "",
            })) as Record<string, unknown>[]
          }
          columns={[
            { key: "query", header: "Query" },
            { key: "country", header: "Country" },
            { key: "device", header: "Device" },
            { key: "currentPosition", header: "Current position" },
            { key: "delta7d", header: "7d Δ" },
            { key: "delta28d", header: "28d Δ" },
            { key: "clicks28d", header: "Clicks (28d)" },
            { key: "impressions28d", header: "Impressions (28d)" },
            { key: "bestPosition", header: "Best position" },
            { key: "tag", header: "Tag" },
          ]}
        />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-primary"
                />
              </th>
              <th className="w-8 px-1 py-2"></th>
              <th className="px-3 py-2 text-left">
                <SortHeader k="query" label="Query" />
              </th>
              <th className="px-3 py-2 text-left">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Country
                </span>
              </th>
              <th className="px-3 py-2 text-left">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Device
                </span>
              </th>
              <th className="px-3 py-2 text-right">
                <SortHeader k="currentPosition" label="Position" />
              </th>
              <th className="px-3 py-2 text-right">
                <SortHeader k="delta7d" label="7d Δ" />
              </th>
              <th className="px-3 py-2 text-right">
                <SortHeader k="delta28d" label="28d Δ" />
              </th>
              <th className="px-3 py-2 text-right">
                <SortHeader k="clicks28d" label="Clicks" />
              </th>
              <th className="px-3 py-2 text-right">
                <SortHeader k="impressions28d" label="Impr." />
              </th>
              <th className="px-3 py-2 text-right">
                <SortHeader k="bestPosition" label="Best" />
              </th>
              <th className="px-3 py-2 text-left">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tag
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isExpanded = expanded.has(row.id);
              const isSelected = selected.has(row.id);
              return (
                <Fragment key={row.id}>
                  <tr className="border-t">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(row.id)}
                        className="accent-primary"
                      />
                    </td>
                    <td className="px-1 py-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.id)}
                        className="rounded p-1 hover:bg-accent"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-medium">{row.query}</td>
                    <td className="px-3 py-2 uppercase text-muted-foreground">
                      {row.country}
                    </td>
                    <td className="px-3 py-2 capitalize text-muted-foreground">
                      {row.device}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatPosition(row.currentPosition)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {deltaBadge(row.delta7d)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {deltaBadge(row.delta28d)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatNumber(row.clicks28d)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatNumber(row.impressions28d)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatPosition(row.bestPosition)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.tag ?? ""}
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="border-t bg-muted/30">
                      <td colSpan={12} className="px-6 py-4">
                        <KeywordHistoryChart data={row.history} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
