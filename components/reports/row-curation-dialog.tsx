"use client";

import { useMemo, useState } from "react";
import { ListFilter, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber, formatPosition } from "@/lib/utils";
import type {
  Ga4ChannelRow,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";
import type { ReportExclusions } from "@/lib/report-exclusions";

type Kind = "queries" | "pages" | "channels";

type Props = {
  queries: GscQueryRow[];
  pages: GscPageRow[];
  channels: Ga4ChannelRow[];
  exclusions: ReportExclusions;
  onChange: (next: ReportExclusions) => void;
  // Persist current selection; returns when done so we can stop the spinner.
  onSave: () => Promise<void>;
  saving?: boolean;
};

// A checklist of every fetched row across the three tables. Unchecking a row
// excludes it from the report and all exports. "Save selections" persists so
// the same junk never comes back next period.
export function RowCurationDialog({
  queries,
  pages,
  channels,
  exclusions,
  onChange,
  onSave,
  saving = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const excluded = useMemo(
    () => ({
      queries: new Set(exclusions.queries),
      pages: new Set(exclusions.pages),
      channels: new Set(exclusions.channels),
    }),
    [exclusions],
  );

  function toggle(kind: Kind, key: string, include: boolean) {
    const set = new Set(exclusions[kind]);
    if (include) set.delete(key);
    else set.add(key);
    onChange({ ...exclusions, [kind]: Array.from(set) });
  }

  function setAll(kind: Kind, keys: string[], include: boolean) {
    onChange({
      ...exclusions,
      [kind]: include ? [] : Array.from(new Set(keys)),
    });
  }

  const needle = q.trim().toLowerCase();
  const match = (s: string) => !needle || s.toLowerCase().includes(needle);

  const totalExcluded =
    exclusions.queries.length +
    exclusions.pages.length +
    exclusions.channels.length;

  const rowClass =
    "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60";

  function List<T>({
    kind,
    rows,
    keyOf,
    label,
    metric,
  }: {
    kind: Kind;
    rows: T[];
    keyOf: (r: T) => string;
    label: (r: T) => string;
    metric: (r: T) => string;
  }) {
    const keys = rows.map(keyOf);
    const visible = rows.filter((r) => match(label(r)) || match(keyOf(r)));
    const includedCount = keys.filter((k) => !excluded[kind].has(k)).length;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {includedCount} of {keys.length} included
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="hover:text-foreground hover:underline"
              onClick={() => setAll(kind, keys, true)}
            >
              Select all
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              className="hover:text-foreground hover:underline"
              onClick={() => setAll(kind, keys, false)}
            >
              Deselect all
            </button>
          </div>
        </div>
        <div className="max-h-[46vh] space-y-0.5 overflow-y-auto rounded-md border p-1">
          {visible.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matching rows.</p>
          ) : (
            visible.map((r) => {
              const key = keyOf(r);
              const include = !excluded[kind].has(key);
              return (
                <label key={key} className={rowClass}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-primary"
                    checked={include}
                    onChange={(e) => toggle(kind, key, e.target.checked)}
                  />
                  <span
                    className={
                      include
                        ? "min-w-0 flex-1 truncate"
                        : "min-w-0 flex-1 truncate text-muted-foreground line-through"
                    }
                    title={label(r)}
                  >
                    {label(r)}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {metric(r)}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ListFilter className="mr-1.5 h-4 w-4" />
          Choose rows
          {totalExcluded > 0 ? (
            <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-xs text-primary">
              {totalExcluded} hidden
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose rows to include</DialogTitle>
          <DialogDescription>
            Uncheck any query, page or channel you don&apos;t want the client to
            see. Deselected rows are removed from the report and every export
            (PDF, PPT, PNG, CSV, shared link). Saved per project, so recurring
            junk stays hidden next period.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter rows…"
            className="pl-8"
          />
        </div>

        <Tabs defaultValue="queries">
          <TabsList>
            <TabsTrigger value="queries">Queries ({queries.length})</TabsTrigger>
            <TabsTrigger value="pages">Pages ({pages.length})</TabsTrigger>
            <TabsTrigger value="channels">
              Channels ({channels.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="queries" className="mt-3">
            <List
              kind="queries"
              rows={queries}
              keyOf={(r) => r.query}
              label={(r) => r.query}
              metric={(r) =>
                `${formatNumber(r.clicks)} clk · ${formatPosition(r.position)}`
              }
            />
          </TabsContent>
          <TabsContent value="pages" className="mt-3">
            <List
              kind="pages"
              rows={pages}
              keyOf={(r) => r.page}
              label={(r) => r.page.replace(/^https?:\/\//, "")}
              metric={(r) =>
                `${formatNumber(r.clicks)} clk · ${formatPosition(r.position)}`
              }
            />
          </TabsContent>
          <TabsContent value="channels" className="mt-3">
            <List
              kind="channels"
              rows={channels}
              keyOf={(r) => r.channel}
              label={(r) => r.channel}
              metric={(r) => `${formatNumber(r.sessions)} sess`}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="self-center text-xs text-muted-foreground">
            {totalExcluded} row{totalExcluded === 1 ? "" : "s"} hidden
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                await onSave();
                setOpen(false);
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save selections
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
