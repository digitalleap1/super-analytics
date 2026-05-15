import { google } from "googleapis";

import { getValidGoogleAccessToken } from "./tokens";
import { stubGa4Channels, stubGa4Overview, stubGa4Properties } from "./stub";
import type {
  Ga4ChannelsResult,
  Ga4Overview,
  Ga4PropertyListItem,
} from "./types";

function client(accessToken: string) {
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.analyticsdata({ version: "v1beta", auth: oauth2 });
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type FetchOpts = {
  userId: string;
  projectId: string;
  propertyId: string | null;
  from: Date;
  to: Date;
};

const OVERVIEW_METRICS = [
  "sessions",
  "totalUsers",
  "engagementRate",
  "conversions",
  "screenPageViews",
] as const;

export async function getGa4Overview(opts: FetchOpts): Promise<Ga4Overview> {
  const stubSeed = `${opts.projectId}`;
  if (!opts.propertyId) return stubGa4Overview(stubSeed, opts.from, opts.to);

  const token = await getValidGoogleAccessToken(opts.userId);
  if (!token) return stubGa4Overview(stubSeed, opts.from, opts.to);

  try {
    const ga4 = client(token);
    const res = await ga4.properties.runReport({
      property: `properties/${opts.propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: ymd(opts.from), endDate: ymd(opts.to) }],
        metrics: OVERVIEW_METRICS.map((name) => ({ name })),
      },
    });
    const values = res.data.rows?.[0]?.metricValues ?? [];
    const get = (i: number) => Number(values[i]?.value ?? 0);
    return {
      totals: {
        sessions: get(0),
        totalUsers: get(1),
        engagementRate: get(2),
        conversions: get(3),
        screenPageViews: get(4),
      },
      source: "live",
    };
  } catch {
    return stubGa4Overview(stubSeed, opts.from, opts.to);
  }
}

export async function getGa4Channels(opts: FetchOpts): Promise<Ga4ChannelsResult> {
  const stubSeed = `${opts.projectId}`;
  if (!opts.propertyId) {
    return { rows: stubGa4Channels(stubSeed, opts.from, opts.to), source: "stub" };
  }
  const token = await getValidGoogleAccessToken(opts.userId);
  if (!token) {
    return { rows: stubGa4Channels(stubSeed, opts.from, opts.to), source: "stub" };
  }

  try {
    const ga4 = client(token);
    const res = await ga4.properties.runReport({
      property: `properties/${opts.propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: ymd(opts.from), endDate: ymd(opts.to) }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagementRate" },
          { name: "conversions" },
        ],
        limit: "20",
      },
    });
    const rows = (res.data.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? "(unknown)",
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      totalUsers: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0),
      conversions: Number(r.metricValues?.[3]?.value ?? 0),
    }));
    return { rows, source: "live" };
  } catch {
    return {
      rows: stubGa4Channels(stubSeed, opts.from, opts.to),
      source: "stub",
    };
  }
}

export async function listGa4Properties(
  userId: string,
): Promise<Ga4PropertyListItem[]> {
  const token = await getValidGoogleAccessToken(userId);
  if (!token) return stubGa4Properties(userId);

  try {
    // Admin API is needed for property listing; minimal call via REST
    const res = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return stubGa4Properties(userId);
    const json = (await res.json()) as {
      accountSummaries?: Array<{
        displayName?: string;
        propertySummaries?: Array<{ property?: string; displayName?: string }>;
      }>;
    };
    const out: Ga4PropertyListItem[] = [];
    for (const acc of json.accountSummaries ?? []) {
      for (const p of acc.propertySummaries ?? []) {
        const propertyId = (p.property ?? "").replace("properties/", "");
        if (!propertyId) continue;
        out.push({
          propertyId,
          displayName: p.displayName ?? propertyId,
          accountDisplayName: acc.displayName ?? "",
        });
      }
    }
    return out.length ? out : stubGa4Properties(userId);
  } catch {
    return stubGa4Properties(userId);
  }
}
