"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  ExternalLink,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CsvExportButton } from "@/components/reports/csv-export-button";
import { EditBacklinkDialog } from "@/components/backlinks/edit-backlink-dialog";
import {
  BACKLINK_CATEGORIES,
  categoryMeta,
  type BacklinkRow,
} from "@/lib/backlinks";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  projectName: string;
  rows: BacklinkRow[];
  // Every backlink regardless of the report's date range. A link logged today
  // sits outside the (lagged) range, so without this it can't be seen or edited.
  allRows?: BacklinkRow[];
  rangeLabel?: string;
  readOnly?: boolean;
};

type SortKey = "submittedAt" | "category" | "place" | "url";
type SortDir = "asc" | "desc";
const ALL = "__all__";

export function BacklinksTable({
  projectId,
  projectName,
  rows,
  allRows,
  rangeLabel,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  // Row currently open in the edit dialog (null = closed).
  const [editRow, setEditRow] = useState<BacklinkRow | null>(null);
  // Show every backlink (ignoring the report's date range) so out-of-range
  // entries can still be edited or deleted.
  const [showAll, setShowAll] = useState(false);

  const source = showAll && allRows ? allRows : rows;
  const outOfRange = allRows ? Math.max(0, allRows.length - rows.length) : 0;

  // Filters
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("submittedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "submittedAt" ? "desc" : "asc");
    }
  }

  function SortIcon({ for: f }: { for: SortKey }) {
    if (sortKey !== f)
      return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    let out = source.filter((r) => {
      if (category !== ALL && r.category !== category) return false;
      if (fromDate && new Date(r.submittedAt) < fromDate) return false;
      if (toDate && new Date(r.submittedAt) > toDate) return false;
      if (q) {
        const blob =
          `${r.url} ${r.place ?? ""} ${r.notes ?? ""} ${categoryMeta(r.category).label}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    out = [...out].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "submittedAt":
          av = a.submittedAt;
          bv = b.submittedAt;
          break;
        case "category":
          av = categoryMeta(a.category).label;
          bv = categoryMeta(b.category).label;
          break;
        case "place":
          av = (a.place ?? "").toLowerCase();
          bv = (b.place ?? "").toLowerCase();
          break;
        case "url":
          av = a.url.toLowerCase();
          bv = b.url.toLowerCase();
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [source, category, query, from, to, sortKey, sortDir]);

  const hasFilters =
    category !== ALL || query !== "" || from !== "" || to !== "";

  function clearFilters() {
    setCategory(ALL);
    setQuery("");
    setFrom("");
    setTo("");
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  function del() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} backlink(s)?`)) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/backlinks?ids=${Array.from(selected).join(",")}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Could not delete");
        return;
      }
      const body = (await res.json()) as { deleted: number };
      toast.success(`Deleted ${body.deleted} backlink${body.deleted === 1 ? "" : "s"}`);
      setSelected(new Set());
      router.refresh();
    });
  }

  // Delete a single row from its own row action.
  function delOne(row: BacklinkRow) {
    if (!confirm(`Delete this backlink?\n\n${row.url}`)) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/backlinks?ids=${row.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Could not delete");
        return;
      }
      toast.success("Backlink deleted");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {/* Backlinks dated outside the report range (e.g. logged today, while the
          range lags a few days) would otherwise be invisible — surface them. */}
      {!readOnly && outOfRange > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 print:hidden">
          <span>
            <strong>{outOfRange}</strong> backlink{outOfRange === 1 ? "" : "s"}{" "}
            {outOfRange === 1 ? "is" : "are"} dated outside{" "}
            {rangeLabel ? <strong>{rangeLabel}</strong> : "this date range"}, so{" "}
            {outOfRange === 1 ? "it isn't" : "they aren't"} counted in this
            report.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 bg-background"
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll ? "Show in-range only" : "Show all dates"}
          </Button>
        </div>
      ) : null}

      {/* Filters row */}
      {source.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2.5 print:hidden">
          <div className="min-w-[180px] flex-1 space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="URL, place, notes…"
                className="h-8 pl-7 text-sm"
              />
            </div>
          </div>
          <div className="min-w-[160px] space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {BACKLINK_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              From
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              To
            </label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 self-end"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Empty state — show only when nothing matches OR no rows at all. */}
      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card/40 p-8 text-center text-sm text-muted-foreground">
          {source.length === 0
            ? "No backlinks logged in this date range yet."
            : "No backlinks match the current filters."}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {!readOnly && selected.size > 0 ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selected.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={del}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                    )}
                    Delete
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {filtered.length} backlink{filtered.length === 1 ? "" : "s"}
                  {hasFilters ? ` of ${source.length}` : ""}
                  {showAll ? " · all dates" : ""}
                </span>
              )}
            </div>
            <CsvExportButton
              filename={`${projectName}-backlinks`}
              rows={
                filtered.map((r) => ({
                  category: categoryMeta(r.category).label,
                  url: r.url,
                  place: r.place ?? "",
                  date: r.submittedAt,
                  notes: r.notes ?? "",
                })) as Record<string, unknown>[]
              }
              columns={[
                { key: "category", header: "Category" },
                { key: "url", header: "URL" },
                { key: "place", header: "Place" },
                { key: "date", header: "Date of submission" },
                { key: "notes", header: "Notes" },
              ]}
            />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {!readOnly ? (
                    <th className="w-8 px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label="Select all backlinks"
                        checked={
                          selected.size === filtered.length &&
                          filtered.length > 0
                        }
                        onChange={toggleAll}
                        className="accent-primary"
                      />
                    </th>
                  ) : null}
                  <th
                    className="w-40 cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    onClick={() => toggleSort("category")}
                  >
                    Category
                    <SortIcon for="category" />
                  </th>
                  <th
                    className="cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    onClick={() => toggleSort("url")}
                  >
                    URL
                    <SortIcon for="url" />
                  </th>
                  <th
                    className="w-28 cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    onClick={() => toggleSort("place")}
                  >
                    Place
                    <SortIcon for="place" />
                  </th>
                  <th
                    className="w-28 cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    onClick={() => toggleSort("submittedAt")}
                  >
                    Date
                    <SortIcon for="submittedAt" />
                  </th>
                  {!readOnly ? (
                    <th className="w-20 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground print:hidden">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = categoryMeta(r.category);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-t",
                        selected.has(r.id) && "bg-primary/5",
                      )}
                    >
                      {!readOnly ? (
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select backlink ${r.url}`}
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                            className="accent-primary"
                          />
                        </td>
                      ) : null}
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          title={r.url}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <span className="min-w-0 truncate">
                            {r.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.place ?? "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {r.submittedAt}
                      </td>
                      {!readOnly ? (
                        <td className="px-3 py-2 print:hidden">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditRow(r)}
                              disabled={isPending}
                              title="Edit backlink"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => delOne(r)}
                              disabled={isPending}
                              title="Delete backlink"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!readOnly ? (
        <EditBacklinkDialog
          projectId={projectId}
          backlink={editRow}
          onOpenChange={(open) => {
            if (!open) setEditRow(null);
          }}
        />
      ) : null}
    </div>
  );
}
