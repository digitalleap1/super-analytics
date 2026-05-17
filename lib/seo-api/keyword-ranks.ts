// Placeholder for an external SEO API integration (e.g. SerpApi, DataForSEO,
// Ahrefs, Semrush) that does pure rank tracking — not limited to GSC's
// impression-driven query set.
//
// To wire your provider:
// 1. Add provider creds to .env (e.g. SEO_API_KEY, SEO_API_PROVIDER).
// 2. Replace the body of `fetchKeywordRank` with a real call.
// 3. lib/keywords.ts will pick this up automatically as the preferred source,
//    falling back to GSC (and then to stub) when this returns null.

import { stubKeywordDaily } from "@/lib/google/stub";
import type { DailyMetric } from "@/lib/google/types";

export type RankProvider = "seo_api" | "gsc" | "stub";

export function isSeoApiConfigured(): boolean {
  return !!process.env.SEO_API_KEY;
}

export async function fetchKeywordRank(_opts: {
  query: string;
  country: string;
  device: string;
  from: Date;
  to: Date;
}): Promise<{ source: RankProvider; rows: DailyMetric[] } | null> {
  if (!isSeoApiConfigured()) return null;

  // TODO: replace this stub with your SEO API request.
  // Example shape for SerpAPI / DataForSEO:
  //
  //   const res = await fetch(`https://api.provider.com/v1/keyword?...`, {
  //     headers: { Authorization: `Bearer ${process.env.SEO_API_KEY}` }
  //   });
  //   const data = await res.json();
  //   return { source: "seo_api", rows: data.history.map(normalize) };
  //
  // For now, when SEO_API_KEY is set we fall through to deterministic stub data
  // so the UI is still demoable. Remove this fallback once the real call is in.
  return {
    source: "stub",
    rows: stubKeywordDaily(
      `seo-api:${_opts.query}`,
      _opts.query,
      _opts.from,
      _opts.to,
    ),
  };
}
