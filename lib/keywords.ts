import { prisma } from "@/lib/prisma";
import { getKeywordDaily } from "@/lib/google/gsc";
import { presetRange, previousPeriod } from "@/lib/date-ranges";

export type KeywordRow = {
  id: string;
  query: string;
  country: string;
  device: string;
  tag: string | null;
  currentPosition: number | null;
  delta7d: number | null;
  delta28d: number | null;
  clicks28d: number;
  impressions28d: number;
  bestPosition: number | null;
  history: { date: string; position: number }[];
};

// Returns a snapshot per keyword. Uses persisted KeywordRanking history when
// available; falls back to live (or stub) GSC fetch on the fly.
export async function getKeywordSnapshot(opts: {
  userId: string;
  projectId: string;
  siteUrl: string | null;
}): Promise<KeywordRow[]> {
  const keywords = await prisma.keyword.findMany({
    where: { projectId: opts.projectId },
    orderBy: { createdAt: "desc" },
    include: {
      rankings: {
        orderBy: { date: "desc" },
        take: 90,
      },
    },
  });

  const range = presetRange("last28");
  const prev = previousPeriod(range);
  const last7 = presetRange("last7");

  const snapshots = await Promise.all(
    keywords.map(async (kw) => {
      let history = kw.rankings
        .slice()
        .reverse()
        .map((r) => ({
          date: r.date.toISOString().slice(0, 10),
          position: r.position,
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
        }));

      if (history.length < 7) {
        // Pull live (or stub) daily series for the last 28 days.
        const live = await getKeywordDaily({
          userId: opts.userId,
          projectId: opts.projectId,
          siteUrl: opts.siteUrl,
          query: kw.query,
          country: kw.country,
          device: kw.device,
          from: range.from,
          to: range.to,
        });
        history = live;
      }

      const positionAt = (cutoffISO: string) => {
        const row = history.find((h) => h.date >= cutoffISO);
        return row?.position ?? null;
      };

      const currentPosition = history.length
        ? history[history.length - 1].position
        : null;
      const startOf28 = range.from.toISOString().slice(0, 10);
      const startOf7 = last7.from.toISOString().slice(0, 10);
      const startOfPrev28 = prev.from.toISOString().slice(0, 10);

      const pos28Start = positionAt(startOf28);
      const pos7Start = positionAt(startOf7);
      const posPrev28 = positionAt(startOfPrev28);

      const last28 = history.filter((h) => h.date >= startOf28);
      const clicks28d = last28.reduce((s, r) => s + r.clicks, 0);
      const impressions28d = last28.reduce((s, r) => s + r.impressions, 0);
      const bestPosition = history.reduce<number | null>(
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
        delta7d:
          currentPosition !== null && pos7Start !== null
            ? pos7Start - currentPosition
            : null,
        delta28d:
          currentPosition !== null && pos28Start !== null
            ? pos28Start - currentPosition
            : null,
        clicks28d,
        impressions28d,
        bestPosition,
        history: history.map((h) => ({ date: h.date, position: h.position })),
      } satisfies KeywordRow;
    }),
  );

  return snapshots;
}
