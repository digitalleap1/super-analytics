import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getKeywordDaily } from "@/lib/google/gsc";

// Hits GSC once per tracked keyword for "yesterday" and upserts into
// KeywordRanking. Protected by CRON_SECRET. Designed for nightly invocation
// via Vercel Cron, a node-cron script, or just a manual hit while developing.
//
// Curl: curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/refresh-keywords

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

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const keywords = await prisma.keyword.findMany({
    include: {
      project: {
        select: { id: true, userId: true, gscSiteUrl: true },
      },
    },
  });

  let upserts = 0;
  for (const kw of keywords) {
    try {
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
      if (!row) continue;
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
      upserts++;
    } catch (err) {
      console.error(`Failed to refresh keyword ${kw.id}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    keywords: keywords.length,
    upserts,
    date: yesterday.toISOString().slice(0, 10),
  });
}
