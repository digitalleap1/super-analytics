import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getKeywordDaily } from "@/lib/google/gsc";
import {
  fetchKeywordRankToday,
  isSeoApiConfigured,
} from "@/lib/seo-api/keyword-ranks";

// Per-keyword daily refresh.
//
// Priority order for each keyword:
//   1. DataForSEO SERP Live (when DATAFORSEO_LOGIN/PASSWORD set) — real organic
//      position from a live SERP scrape; stored as TODAY's date.
//   2. GSC searchanalytics.query — yesterday's data from Search Console (only
//      returns positions for queries that actually drove impressions).
//
// Protected by CRON_SECRET. Designed for nightly invocation via Vercel Cron,
// a node-cron script, or a manual hit while developing.
//
// curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/refresh-keywords

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not set" },
      { status: 500 },
    );
  }

  const headerSecret =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (headerSecret !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const keywords = await prisma.keyword.findMany({
    include: {
      project: {
        select: { id: true, userId: true, gscSiteUrl: true, domain: true },
      },
    },
  });

  const useSeoApi = isSeoApiConfigured();
  const results = {
    dataforseo: 0,
    gsc: 0,
    skipped: 0,
    errors: 0,
  };

  console.log(
    `[cron] refresh-keywords: ${keywords.length} keywords, primary source = ${useSeoApi ? "dataforseo" : "gsc"}`,
  );

  let idx = 0;
  for (const kw of keywords) {
    idx++;
    const label = `[cron ${idx}/${keywords.length}] "${kw.query}" (${kw.country}/${kw.device}) for ${kw.project.domain}`;
    try {
      if (useSeoApi) {
        const t0 = Date.now();
        const rank = await fetchKeywordRankToday({
          query: kw.query,
          country: kw.country,
          device: kw.device,
          domain: kw.project.domain,
        });
        console.log(
          `${label} → dataforseo ${rank ? `pos ${rank.row.position}` : "not in SERP"} (${Date.now() - t0}ms)`,
        );
        if (rank) {
          await prisma.keywordRanking.upsert({
            where: {
              keywordId_date: { keywordId: kw.id, date: today },
            },
            create: {
              keywordId: kw.id,
              date: today,
              position: rank.row.position,
              clicks: rank.row.clicks,
              impressions: rank.row.impressions,
              ctr: rank.row.ctr,
            },
            update: {
              position: rank.row.position,
              clicks: rank.row.clicks,
              impressions: rank.row.impressions,
              ctr: rank.row.ctr,
            },
          });
          results.dataforseo++;
          continue;
        }
        // Fell through (domain not in SERP, country unsupported, API error) —
        // try GSC if a site is connected.
      }

      const rows = await getKeywordDaily({
        userId: kw.project.userId,
        projectId: kw.project.id,
        siteUrl: kw.project.gscSiteUrl,
        query: kw.query,
        country: kw.country,
        device: kw.device,
        from: yesterday,
        to: yesterday,
      });
      const row = rows[0];
      if (!row) {
        console.log(`${label} → no GSC data, skipped`);
        results.skipped++;
        continue;
      }
      console.log(`${label} → gsc pos ${row.position}`);
      await prisma.keywordRanking.upsert({
        where: {
          keywordId_date: { keywordId: kw.id, date: yesterday },
        },
        create: {
          keywordId: kw.id,
          date: yesterday,
          position: row.position,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
        },
        update: {
          position: row.position,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
        },
      });
      results.gsc++;
    } catch (err) {
      console.error(`${label} → error:`, err);
      results.errors++;
    }
  }

  console.log(`[cron] done`, results);

  return NextResponse.json({
    ok: true,
    keywords: keywords.length,
    primarySource: useSeoApi ? "dataforseo" : "gsc",
    results,
  });
}
