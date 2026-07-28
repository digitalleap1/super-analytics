import type {
  Ga4ChannelRow,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";

// Per-project curation: rows the user has deselected so they never appear in
// the report or any export. Stored as plain keys (the query string, page URL,
// channel name) on Project.reportExclusions.
export type ReportExclusions = {
  queries: string[];
  pages: string[];
  channels: string[];
};

export const EMPTY_EXCLUSIONS: ReportExclusions = {
  queries: [],
  pages: [],
  channels: [],
};

// Coerce whatever came out of the Json column (or an API body) into a clean,
// de-duplicated ReportExclusions. Unknown/garbage shapes collapse to empty.
export function normalizeExclusions(raw: unknown): ReportExclusions {
  const pick = (v: unknown): string[] => {
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
  return {
    queries: pick(obj.queries),
    pages: pick(obj.pages),
    channels: pick(obj.channels),
  };
}

export function totalExcluded(ex: ReportExclusions): number {
  return ex.queries.length + ex.pages.length + ex.channels.length;
}

// Apply exclusions to the raw rows. Filtering happens BEFORE any top-N slice,
// so dropping a junk row promotes the next relevant one into view.
export function applyExclusions<
  Q extends GscQueryRow,
  P extends GscPageRow,
  C extends Ga4ChannelRow,
>(
  rows: { queries: Q[]; pages: P[]; channels: C[] },
  ex: ReportExclusions,
): { queries: Q[]; pages: P[]; channels: C[] } {
  const q = new Set(ex.queries);
  const p = new Set(ex.pages);
  const c = new Set(ex.channels);
  return {
    queries: rows.queries.filter((r) => !q.has(r.query)),
    pages: rows.pages.filter((r) => !p.has(r.page)),
    channels: rows.channels.filter((r) => !c.has(r.channel)),
  };
}
