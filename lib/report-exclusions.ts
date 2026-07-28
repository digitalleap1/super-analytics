import type {
  Ga4ChannelRow,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";

// Per-project row curation, applied to the report and every export/share so a
// client only ever sees what the agency kept. Two independent controls per
// table:
//   - a GSC-style filter (Contains / Doesn't contain / Regex), and
//   - an explicit list of hidden row keys (query string / page URL / channel).
// Both are applied together: a row survives only if it passes the filter AND is
// not in the hidden list.
export type FilterMode = "contains" | "not_contains" | "regex";
export type TabFilter = { mode: FilterMode; text: string };

// Curation for one generic section (the GA4 breakdown tables): a filter + a
// hidden-row list, same idea as the GSC tables but keyed by section id.
export type SectionCuration = { hidden: string[]; filter: TabFilter };

export type ReportExclusions = {
  queries: string[];
  pages: string[];
  channels: string[];
  filters: {
    queries: TabFilter;
    pages: TabFilter;
    channels: TabFilter;
  };
  // Generic per-section curation for the GA4 breakdown tables
  // ('ga4Events', 'ga4LandingPages', 'ga4Devices', 'ga4Countries').
  dims: Record<string, SectionCuration>;
};

export function emptySectionCuration(): SectionCuration {
  return { hidden: [], filter: { mode: "contains", text: "" } };
}

const EMPTY_FILTER: TabFilter = { mode: "contains", text: "" };

export const EMPTY_EXCLUSIONS: ReportExclusions = {
  queries: [],
  pages: [],
  channels: [],
  filters: {
    queries: { ...EMPTY_FILTER },
    pages: { ...EMPTY_FILTER },
    channels: { ...EMPTY_FILTER },
  },
  dims: {},
};

function normalizeFilter(raw: unknown): TabFilter {
  const o = (raw ?? {}) as Record<string, unknown>;
  const mode: FilterMode =
    o.mode === "not_contains" || o.mode === "regex" ? o.mode : "contains";
  const text =
    typeof o.text === "string" && o.text.length <= 2000 ? o.text : "";
  return { mode, text };
}

// Coerce whatever came out of the Json column (or an API body) into a clean,
// de-duplicated ReportExclusions. Unknown/garbage shapes collapse to empty.
export function normalizeExclusions(raw: unknown): ReportExclusions {
  const pickKeys = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    const seen = new Set<string>();
    for (const item of v) {
      if (typeof item === "string" && item.length > 0 && item.length <= 2000) {
        seen.add(item);
      }
    }
    return Array.from(seen);
  };
  const obj = (raw ?? {}) as Record<string, unknown>;
  const f = (obj.filters ?? {}) as Record<string, unknown>;
  const rawDims = (obj.dims ?? {}) as Record<string, unknown>;
  const dims: Record<string, SectionCuration> = {};
  for (const [id, v] of Object.entries(rawDims)) {
    const o = (v ?? {}) as Record<string, unknown>;
    dims[id] = { hidden: pickKeys(o.hidden), filter: normalizeFilter(o.filter) };
  }
  return {
    queries: pickKeys(obj.queries),
    pages: pickKeys(obj.pages),
    channels: pickKeys(obj.channels),
    filters: {
      queries: normalizeFilter(f.queries),
      pages: normalizeFilter(f.pages),
      channels: normalizeFilter(f.channels),
    },
    dims,
  };
}

// Filter + hide one generic section's rows (GA4 breakdown tables).
export function applyDim<T>(
  rows: T[],
  keyOf: (r: T) => string,
  sc: SectionCuration | undefined,
): T[] {
  if (!sc) return rows;
  const hidden = new Set(sc.hidden);
  const match = matcherFor(sc.filter);
  return rows.filter((r) => match(keyOf(r)) && !hidden.has(keyOf(r)));
}

export function totalExcluded(ex: ReportExclusions): number {
  return ex.queries.length + ex.pages.length + ex.channels.length;
}

// True when any curation (a filter or a hidden row) is active.
export function isCurationActive(ex: ReportExclusions): boolean {
  return (
    totalExcluded(ex) > 0 ||
    ex.filters.queries.text.trim().length > 0 ||
    ex.filters.pages.text.trim().length > 0 ||
    ex.filters.channels.text.trim().length > 0
  );
}

// Compile a filter into a predicate. Invalid regex matches everything (so a
// half-typed pattern never blanks the report) — callers surface the error
// separately.
export function matcherFor(filter: TabFilter): (s: string) => boolean {
  const raw = filter.text.trim();
  if (!raw) return () => true;
  if (filter.mode === "regex") {
    try {
      const re = new RegExp(raw, "i");
      return (s) => re.test(s);
    } catch {
      return () => true;
    }
  }
  const needle = raw.toLowerCase();
  if (filter.mode === "not_contains") {
    return (s) => !s.toLowerCase().includes(needle);
  }
  return (s) => s.toLowerCase().includes(needle);
}

// Apply a tab's filter + hidden list to its rows. Filtering happens BEFORE any
// top-N slice, so dropping rows promotes the next relevant one into view.
function applyTab<T>(
  rows: T[],
  keyOf: (r: T) => string,
  hiddenKeys: string[],
  filter: TabFilter,
): T[] {
  const hidden = new Set(hiddenKeys);
  const match = matcherFor(filter);
  return rows.filter((r) => {
    const key = keyOf(r);
    return match(key) && !hidden.has(key);
  });
}

export function applyExclusions<
  Q extends GscQueryRow,
  P extends GscPageRow,
  C extends Ga4ChannelRow,
>(
  rows: { queries: Q[]; pages: P[]; channels: C[] },
  ex: ReportExclusions,
): { queries: Q[]; pages: P[]; channels: C[] } {
  return {
    queries: applyTab(rows.queries, (r) => r.query, ex.queries, ex.filters.queries),
    pages: applyTab(rows.pages, (r) => r.page, ex.pages, ex.filters.pages),
    channels: applyTab(
      rows.channels,
      (r) => r.channel,
      ex.channels,
      ex.filters.channels,
    ),
  };
}
