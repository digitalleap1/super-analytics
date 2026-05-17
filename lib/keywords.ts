import { prisma } from "@/lib/prisma";
import { getKeywordDaily } from "@/lib/google/gsc";
import { fetchKeywordRank } from "@/lib/seo-api/keyword-ranks";
import { ymd } from "@/lib/date-ranges";

export type KeywordRow = {
  id: string;
  query: string;
  country: string;
  device: string;
  tag: string | null;
  currentPosition: number | null;
  startPosition: number | null;
  delta: number | null; // start - current  (positive = improved)
  clicks: number;
  impressions: number;
  bestPosition: number | null;
  history: { date: string; position: number }[];
  source: "seo_api" | "gsc" | "stub" | "persisted";
};

// Returns a snapshot per keyword for the given date range. Position deltas are
// computed over the selected window: `startPosition` is the position on/near
// `from`, `currentPosition` is the position on/near `to`. Data source order:
// 1. External SEO API (lib/seo-api/keyword-ranks.ts) if configured
// 2. Persisted KeywordRanking rows in the date range (if enough exist)
// 3. Live GSC fetch (falls back to stub internally when token/site is missing)
export async function getKeywordSnapshot(opts: {
  userId: string;
  projectId: string;
  siteUrl: string | null;
  from: Date;
  to: Date;
}): Promise<KeywordRow[]> {
  const fromIso = ymd(opts.from);
  const toIso = ymd(opts.to);

  const keywords = await prisma.keyword.findMany({
    where: { projectId: opts.projectId },
    orderBy: { createdAt: "desc" },
    include: {
      rankings: {
        where: { date: { gte: opts.from, lte: opts.to } },
        orderBy: { date: "asc" },
      },
    },
  });

  const snapshots = await Promise.all(
    keywords.map(async (kw) => {
      let history: {
        date: string;
        position: number;
        clicks: number;
        impressions: number;
        ctr: number;
      }[] = kw.rankings.map((r) => ({
        date: ymd(r.date),
        position: r.position,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
      }));

      let source: KeywordRow["source"] = "persisted";

      const persistedSpan = history.length;
      const expectedDays =
        Math.round(
          (opts.to.getTime() - opts.from.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

      if (persistedSpan < Math.max(2, Math.min(7, expectedDays / 2))) {
        // Persisted history is too thin — pull live data instead.
        const external = await fetchKeywordRank({
          query: kw.query,
          country: kw.country,
          device: kw.device,
          from: opts.from,
          to: opts.to,
        });
        if (external) {
          history = external.rows;
          source = external.source;
        } else {
          history = await getKeywordDaily({
            userId: opts.userId,
            projectId: opts.projectId,
            siteUrl: opts.siteUrl,
            query: kw.query,
            country: kw.country,
            device: kw.device,
            from: opts.from,
            to: opts.to,
          });
          source = opts.siteUrl ? "gsc" : "stub";
        }
      }

      const inRange = history.filter((h) => h.date >= fromIso && h.date <= toIso);
      const startPosition = inRange[0]?.position ?? null;
      const currentPosition = inRange[inRange.length - 1]?.position ?? null;
      const delta =
        startPosition !== null && currentPosition !== null
          ? startPosition - currentPosition
          : null;
      const clicks = inRange.reduce((s, r) => s + r.clicks, 0);
      const impressions = inRange.reduce((s, r) => s + r.impressions, 0);
      const bestPosition = inRange.reduce<number | null>(
        (best, r) => (best === null ? r.position : Math.min(best, r.position)),
        null,
      );

      return {
        id: kw.id,
        query: kw.query,
        country: kw.country,
        device: kw.device,
        tag: kw.tag,
        currentPosition,
        startPosition,
        delta,
        clicks,
        impressions,
        bestPosition,
        history: inRange.map((h) => ({ date: h.date, position: h.position })),
        source,
      } satisfies KeywordRow;
    }),
  );

  return snapshots;
}
