"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber, formatPosition } from "@/lib/utils";
import type {
  Ga4ChannelRow,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";
import type { ReportExclusions } from "@/lib/report-exclusions";

export type CurationTab = "queries" | "pages" | "channels";
type FilterMode = "contains" | "not_contains" | "regex";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: CurationTab;
  onActiveTabChange: (tab: CurationTab) => void;
  queries: GscQueryRow[];
  pages: GscPageRow[];
  channels: Ga4ChannelRow[];
  exclusions: ReportExclusions;
  onChange: (next: ReportExclusions) => void;
  onSave: () => Promise<void>;
  saving?: boolean;
};

// Compile a GSC-style filter into a predicate. Invalid regex is reported so the
// user can fix it rather than silently matching nothing.
function useMatcher(mode: FilterMode, text: string) {
  return useMemo(() => {
    const raw = text.trim();
    if (!raw) return { test: () => true, error: null as string | null };
    if (mode === "regex") {
      try {
        const re = new RegExp(raw, "i");
        return { test: (s: string) => re.test(s), error: null };
      } catch (err) {
        return {
          test: () => true,
          error: err instanceof Error ? err.message : "Invalid regex",
        };
      }
    }
    const needle = raw.toLowerCase();
    if (mode === "not_contains") {
      return {
        test: (s: string) => !s.toLowerCase().includes(needle),
        error: null,
      };
    }
    return { test: (s: string) => s.toLowerCase().includes(needle), error: null };
  }, [mode, text]);
}

// A checklist of every fetched row, with a GSC-style Contains / Doesn't contain
// / Regex filter and bulk "apply to matching" actions. Unchecking a row hides
// it from the report and every export; selections persist per project.
export function RowCurationDialog({
  open,
  onOpenChange,
  activeTab,
  onActiveTabChange,
  queries,
  pages,
  channels,
  exclusions,
  onChange,
  onSave,
  saving = false,
}: Props) {
  const [mode, setMode] = useState<FilterMode>("contains");
  const [text, setText] = useState("");
  const matcher = useMatcher(mode, text);

  // Clear the filter box each time the dialog opens so a stale regex doesn't
  // silently hide rows the next time around.
  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const excluded = useMemo(
    () => ({
      queries: new Set(exclusions.queries),
      pages: new Set(exclusions.pages),
      channels: new Set(exclusions.channels),
    }),
    [exclusions],
  );

  function toggle(kind: CurationTab, key: string, include: boolean) {
    const set = new Set(exclusions[kind]);
    if (include) set.delete(key);
    else set.add(key);
    onChange({ ...exclusions, [kind]: Array.from(set) });
  }

  // Bulk: include/exclude every key in `keys` at once (used by both the
  // whole-list buttons and the "apply to matching" buttons).
  function applyBulk(kind: CurationTab, keys: string[], include: boolean) {
    const set = new Set(exclusions[kind]);
    for (const k of keys) {
      if (include) set.delete(k);
      else set.add(k);
    }
    onChange({ ...exclusions, [kind]: Array.from(set) });
  }

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
    kind: CurationTab;
    rows: T[];
    keyOf: (r: T) => string;
    label: (r: T) => string;
    metric: (r: T) => string;
  }) {
    const allKeys = rows.map(keyOf);
    // A row matches if its label OR its raw key matches the filter.
    const matched = rows.filter(
      (r) => matcher.test(label(r)) || matcher.test(keyOf(r)),
    );
    const matchedKeys = matched.map(keyOf);
    const includedCount = allKeys.filter((k) => !excluded[kind].has(k)).length;
    const filtering = text.trim().length > 0;

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {includedCount} of {allKeys.length} included
            {filtering ? ` · ${matched.length} match` : ""}
          </span>
          <div className="flex flex-wrap gap-2">
            {filtering ? (
              <>
                <button
                  type="button"
                  className="rounded border px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
                  onClick={() => applyBulk(kind, matchedKeys, false)}
                >
                  Deselect {matched.length} matching
                </button>
                <button
                  type="button"
                  className="rounded border px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
                  onClick={() => applyBulk(kind, matchedKeys, true)}
                >
                  Select {matched.length} matching
                </button>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <button
              type="button"
              className="hover:text-foreground hover:underline"
              onClick={() => applyBulk(kind, allKeys, true)}
            >
              Select all
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              className="hover:text-foreground hover:underline"
              onClick={() => applyBulk(kind, allKeys, false)}
            >
              Deselect all
            </button>
          </div>
        </div>
        <div className="max-h-[44vh] space-y-0.5 overflow-y-auto rounded-md border p-1">
          {matched.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              No rows match this filter.
            </p>
          ) : (
            matched.map((r) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Filter &amp; select rows</DialogTitle>
          <DialogDescription>
            Filter like Search Console (Contains / Doesn&apos;t contain / Regex),
            then choose exactly which rows the client sees. Deselected rows are
            removed from the report and every export (PDF, PPT, PNG, CSV, shared
            link) and stay hidden next period.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as FilterMode)}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="not_contains">Doesn&apos;t contain</SelectItem>
              <SelectItem value="regex">Custom regex</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                mode === "regex"
                  ? "e.g. taxidermy|dead|dying"
                  : "Type to filter…"
              }
              className="pl-8"
            />
          </div>
        </div>
        {matcher.error ? (
          <p className="text-xs text-destructive">
            Invalid regex: {matcher.error}
          </p>
        ) : null}

        <Tabs
          value={activeTab}
          onValueChange={(v) => onActiveTabChange(v as CurationTab)}
        >
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
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                await onSave();
                onOpenChange(false);
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
