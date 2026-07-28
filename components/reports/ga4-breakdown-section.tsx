"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeOff, ListFilter, Loader2, RotateCcw, Save, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CsvExportButton } from "./csv-export-button";
import { DeltaCell } from "./delta-cell";
import { SortableTable } from "./sortable-table";
import { formatNumber, formatPercent } from "@/lib/utils";
import {
  applyDim,
  type FilterMode,
  type SectionCuration,
} from "@/lib/report-exclusions";
import type { Ga4SectionDef } from "@/lib/google/ga4-sections";
import type { Ga4BreakdownRow } from "@/lib/google/types";

export type BreakdownCuration = {
  section: SectionCuration;
  onChange: (next: SectionCuration) => void;
  onSave: () => Promise<void>;
  saving: boolean;
};

type Props = {
  def: Ga4SectionDef;
  projectName: string;
  rows: Ga4BreakdownRow[];
  prevRows?: Ga4BreakdownRow[] | null;
  limit: number;
  // Live report only. Absent for snapshot/share (rows already curated).
  curation?: BreakdownCuration;
  editing?: boolean;
  onHide?: () => void;
};

function fmt(value: number, format: "number" | "percent"): string {
  return format === "percent" ? formatPercent(value) : formatNumber(value);
}

export function Ga4BreakdownSection({
  def,
  projectName,
  rows,
  prevRows,
  limit,
  curation,
  editing = false,
  onHide,
}: Props) {
  const [curateMode, setCurateMode] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const prevByKey = useMemo(
    () => new Map((prevRows ?? []).map((r) => [r.key, r])),
    [prevRows],
  );

  const sc = curation?.section;
  const hiddenKeys = useMemo(() => new Set(sc?.hidden ?? []), [sc]);

  const setFilter = (patch: Partial<{ mode: FilterMode; text: string }>) => {
    if (!curation || !sc) return;
    curation.onChange({ ...sc, filter: { ...sc.filter, ...patch } });
  };
  const setHidden = (key: string, hide: boolean) => {
    if (!curation || !sc) return;
    const set = new Set(sc.hidden);
    if (hide) set.add(key);
    else set.delete(key);
    curation.onChange({ ...sc, hidden: Array.from(set) });
  };
  const clearHidden = () => {
    if (!curation || !sc) return;
    curation.onChange({ ...sc, hidden: [] });
  };

  // Kept rows (filter + hidden applied) — identical to what every export uses.
  const kept = curation && sc ? applyDim(rows, (r) => r.key, sc) : rows;
  const limited = kept.slice(0, limit);
  const display =
    curation && curateMode && showHidden
      ? [...limited, ...rows.filter((r) => hiddenKeys.has(r.key))]
      : limited;

  const columns = useMemo<ColumnDef<Ga4BreakdownRow, unknown>[]>(() => {
    const cols: ColumnDef<Ga4BreakdownRow, unknown>[] = [
      {
        accessorKey: "key",
        header: def.keyHeader,
        cell: (info) => {
          const v = info.getValue<string>();
          return <span className="break-all">{v}</span>;
        },
      },
      ...def.metrics.map(
        (m): ColumnDef<Ga4BreakdownRow, unknown> => ({
          id: m.name,
          header: m.header,
          accessorFn: (r) => r.metrics[m.name] ?? 0,
          cell: (info) => {
            const row = info.row.original;
            const cur = row.metrics[m.name] ?? 0;
            const prev = prevByKey.get(row.key)?.metrics[m.name];
            return (
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-medium">{fmt(cur, m.format)}</span>
                {prev != null ? (
                  <DeltaCell current={cur} previous={prev} />
                ) : null}
              </span>
            );
          },
        }),
      ),
    ];
    if (curateMode && curation) {
      cols.unshift({
        id: "__curate",
        header: () => null,
        enableSorting: false,
        meta: { tdClassName: "print:hidden w-8", thClassName: "print:hidden w-8" },
        cell: ({ row }) => {
          const key = row.original.key;
          const isHidden = hiddenKeys.has(key);
          return (
            <button
              type="button"
              onClick={() => setHidden(key, !isHidden)}
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
      });
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, prevByKey, curateMode, curation, hiddenKeys]);

  const csvRows = kept.slice(0, limit).map((r) => {
    const out: Record<string, unknown> = { key: r.key };
    for (const m of def.metrics) {
      out[m.name] = m.format === "percent" ? formatPercent(r.metrics[m.name] ?? 0) : (r.metrics[m.name] ?? 0);
    }
    return out;
  });
  const csvColumns = [
    { key: "key", header: def.keyHeader },
    ...def.metrics.map((m) => ({ key: m.name, header: m.header })),
  ];

  const filtering = (sc?.filter.text.trim().length ?? 0) > 0;

  return (
    <section data-pptx-slide>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{def.label}</h3>
          <p className="text-xs text-muted-foreground">
            Top {def.keyHeader.toLowerCase()}s over the selected period.
          </p>
        </div>
        <div className="flex items-center gap-1 print:hidden">
          {curation ? (
            <Button
              variant={curateMode ? "default" : "outline"}
              size="sm"
              onClick={() => setCurateMode((v) => !v)}
            >
              <ListFilter className="mr-1.5 h-4 w-4" />
              {curateMode ? "Done" : "Curate"}
              {sc && sc.hidden.length ? (
                <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                  {sc.hidden.length}
                </span>
              ) : null}
            </Button>
          ) : null}
          {editing && onHide ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onHide}
              aria-label="Hide section"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {curateMode && curation && sc ? (
        <div className="print:hidden mb-2 space-y-2 rounded-md border border-primary/30 bg-primary/5 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={sc.filter.mode}
              onValueChange={(v) => setFilter({ mode: v as FilterMode })}
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
                value={sc.filter.text}
                onChange={(e) => setFilter({ text: e.target.value })}
                placeholder={
                  sc.filter.mode === "regex"
                    ? `Regex for ${def.keyHeader.toLowerCase()}…`
                    : `Filter ${def.keyHeader.toLowerCase()}…`
                }
                className="h-8 pl-8"
              />
            </div>
            <Button size="sm" onClick={() => curation.onSave()} disabled={curation.saving}>
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
              {kept.length} of {rows.length} shown
              {sc.hidden.length ? ` · ${sc.hidden.length} hidden` : ""}
              {filtering ? " · filter active" : ""}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {sc.hidden.length ? (
                <button
                  type="button"
                  className="hover:text-foreground hover:underline"
                  onClick={() => setShowHidden((v) => !v)}
                >
                  {showHidden ? "Hide hidden rows" : `Show ${sc.hidden.length} hidden`}
                </button>
              ) : null}
              <button
                type="button"
                className="rounded border px-1.5 py-0.5 hover:bg-muted hover:text-foreground disabled:opacity-40"
                onClick={clearHidden}
                disabled={!sc.hidden.length}
              >
                Clear hidden
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-2 flex justify-end print:hidden">
        <CsvExportButton
          filename={`${projectName}-${def.id}`}
          rows={csvRows}
          columns={csvColumns}
        />
      </div>

      {display.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          No {def.keyHeader.toLowerCase()} data in this range.
        </Card>
      ) : (
        <SortableTable
          columns={columns}
          data={display}
          pageSize={display.length || 1}
          emptyMessage={`No ${def.keyHeader.toLowerCase()} data`}
          rowClassName={(row) =>
            hiddenKeys.has(row.key) ? "opacity-50 line-through" : undefined
          }
        />
      )}
    </section>
  );
}
