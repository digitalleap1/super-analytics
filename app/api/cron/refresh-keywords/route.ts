import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getKeywordDaily } from "@/lib/google/gsc";
import {
  fetchKeywordRankToday,
  isSeoApiConfigured,
} from "@/lib/seo-api/keyword-ranks";

function safeCompare(a: string, b: string): boolean {
  // Constant-time compare so attackers can't brute-force CRON_SECRET via
  // response-time side channel.
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Per-keyword daily refresh.
//
// Decision tree per keyword:
//   1. If DataForSEO is configured AND it returns a real SERP:
//      - Domain found in top 100 -> store rank
//      - Domain NOT in top 100   -> store nothing (notInSerp)
//      (We do NOT fall back to GSC here, because we know DataForSEO
//       authoritatively answered "no, your site isn't ranking" — we shouldn't
//       overwrite that with stub-shaped GSC data.)
//   2. If DataForSEO is not configured, OR the API call itself failed
//      (creds, network, country unsupported), fall back to GSC.
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
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (!safeCompare(headerSecret, secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const keywords = await prisma.keyword.findMany({
    include: {
      project: {
        select: {
          id: true,
          gscSiteUrl: true,
          domain: true,
          workspaceId: true,
          workspace: {
            select: {
              memberships: {
                select: { userId: true },
                orderBy: { createdAt: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const useSeoApi = isSeoApiConfigured();
  const results = {
    dataforseo: 0,
    notInSerp: 0,
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
        const result = await fetchKeywordRankToday({
          query: kw.query,
          country: kw.country,
          device: kw.device,
          domain: kw.project.domain,
        });
        const elapsed = Date.now() - t0;

        if (result?.status === "found") {
          console.log(
            `${label} → dataforseo pos ${result.row.position} (${elapsed}ms)`,
          );
          await prisma.keywordRanking.upsert({
            where: {
              keywordId_date: { keywordId: kw.id, date: today },
            },
            create: {
              keywordId: kw.id,
              date: today,
              position: result.row.position,
              clicks: result.row.clicks,
              impressions: result.row.impressions,
              ctr: result.row.ctr,
            },
            update: {
              position: result.row.position,
              clicks: result.row.clicks,
              impressions: result.row.impressions,
              ctr: result.row.ctr,
            },
          });
          results.dataforseo++;
          continue;
        }

        if (result?.status === "not_in_serp") {
          // Authoritative "not ranked in top 100" — don't store, don't fall
          // back to GSC. Table will show "—" for this keyword.
          console.log(`${label} → dataforseo not in SERP (${elapsed}ms)`);
          results.notInSerp++;
          continue;
        }

        // result === null: API call itself failed (creds, network, country).
        // Fall through to GSC below.
        console.log(`${label} → dataforseo API failed (${elapsed}ms), trying GSC`);
      }

      // For the GSC fallback we need *some* user's Google token. Use the
      // oldest member of the workspace (typically the owner). If they haven't
      // connected Google, getKeywordDaily falls through to stub anyway.
      const fallbackUserId =
        kw.project.workspace.memberships[0]?.userId ?? "";
      const rows = await getKeywordDaily({
        userId: fallbackUserId,
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
