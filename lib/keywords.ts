import { prisma } from "@/lib/prisma";
import { getKeywordDaily } from "@/lib/google/gsc";
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
  source: "dataforseo" | "gsc" | "stub" | "persisted";
};

// Returns a snapshot per keyword for the given date range. Position deltas are
// computed over the selected window: `startPosition` is the position on/near
// `from`, `currentPosition` is the position on/near `to`. Data source order:
// 1. Persisted KeywordRanking rows in the date range (filled nightly by cron
//    via DataForSEO SERP API or GSC, depending on which is configured)
// 2. Live GSC fetch as a one-shot when history is thin
// 3. Stub (deterministic) when no GSC site is configured
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

      // Only fall back to GSC/stub when we have NO persisted data for this
      // keyword in the range. One day of real cron data is still real data —
      // it just means startPosition === currentPosition and Δ = 0 until the
      // cron has run for more days.
      if (history.length === 0) {
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
