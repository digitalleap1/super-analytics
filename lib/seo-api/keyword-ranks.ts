// External rank-tracking integration.
//
// Currently wired to DataForSEO SERP API (Live / Google / Organic / Regular).
// Each call returns today's SERP for one keyword in one location/device combo,
// and we extract the organic position for the project's domain. The cron route
// invokes this once per keyword per day and upserts into KeywordRanking, so
// daily history builds up from real SERP data.
//
// To swap to a different provider (SerpAPI, Semrush, Ahrefs, etc.), replace
// the body of `fetchKeywordRankToday` and keep the same return shape.

import type { DailyMetric } from "@/lib/google/types";

export type RankSource = "dataforseo" | "stub";

export function isSeoApiConfigured(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

// ISO-3 lowercase -> DataForSEO location_code
const LOCATION_CODES: Record<string, number> = {
  usa: 2840,
  gbr: 2826,
  can: 2124,
  aus: 2036,
  ind: 2356,
  deu: 2276,
  fra: 2250,
  esp: 2724,
  ita: 2380,
  nld: 2528,
};

function normalizeDomain(d: string): string {
  return d
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type SerpItem = {
  type?: string;
  rank_group?: number;
  rank_absolute?: number;
  domain?: string;
  url?: string;
};

type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: Array<{
      items?: SerpItem[];
    }>;
  }>;
};

export type RankLookupResult =
  | { status: "found"; source: RankSource; row: DailyMetric }
  | { status: "not_in_serp"; source: RankSource } // SERP returned, domain wasn't there
  | null; // null = API itself failed (creds, network, unsupported country)

// Returns today's organic position for the given keyword on the given domain.
//   - "found"       -> rank stored
//   - "not_in_serp" -> SERP came back but domain isn't ranked in top 100
//   - null          -> API failed; caller may fall back to a secondary source
export async function fetchKeywordRankToday(opts: {
  query: string;
  country: string;
  device: string;
  domain: string;
}): Promise<RankLookupResult> {
  if (!isSeoApiConfigured()) return null;

  const locationCode = LOCATION_CODES[opts.country];
  if (!locationCode) return null;

  const login = process.env.DATAFORSEO_LOGIN!;
  const password = process.env.DATAFORSEO_PASSWORD!;
  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  const device =
    opts.device === "mobile" || opts.device === "tablet" ? "mobile" : "desktop";

  const body = [
    {
      keyword: opts.query,
      location_code: locationCode,
      language_code: "en",
      device,
      os: device === "mobile" ? "android" : "windows",
      depth: 100,
    },
  ];

  let json: DataForSeoResponse;
  try {
    const res = await fetch(
      "https://api.dataforseo.com/v3/serp/google/organic/live/regular",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.error(
        `[dataforseo] HTTP ${res.status} for "${opts.query}"`,
      );
      return null;
    }
    json = (await res.json()) as DataForSeoResponse;
  } catch (err) {
    console.error(`[dataforseo] fetch failed for "${opts.query}":`, err);
    return null;
  }

  if (json.status_code !== 20000) {
    console.error(
      `[dataforseo] status ${json.status_code}: ${json.status_message}`,
    );
    return null;
  }

  const task = json.tasks?.[0];
  if (task?.status_code !== 20000) {
    console.error(
      `[dataforseo] task status ${task?.status_code}: ${task?.status_message}`,
    );
    return null;
  }

  const items = task.result?.[0]?.items ?? [];
  const target = normalizeDomain(opts.domain);

  const match = items.find((it) => {
    if (it.type !== "organic") return false;
    const itemDomain = normalizeDomain(it.domain ?? "");
    return itemDomain === target || itemDomain.endsWith(`.${target}`);
  });

  if (!match || match.rank_group == null) {
    return { status: "not_in_serp", source: "dataforseo" };
  }

  return {
    status: "found",
    source: "dataforseo",
    row: {
      date: ymd(new Date()),
      position: match.rank_group,
      // DataForSEO Live SERP doesn't return clicks/impressions — those are
      // GSC-only metrics. We leave them zero and let GSC fill them in.
      clicks: 0,
      impressions: 0,
      ctr: 0,
    },
  };
}
