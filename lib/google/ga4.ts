import { google } from "googleapis";

import { getValidGoogleAccessToken } from "./tokens";
import { resolveGoogleAccessToken } from "./project-tokens";
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
  "keyEvents",
  "eventCount",
  "screenPageViews",
] as const;

export async function getGa4Overview(opts: FetchOpts): Promise<Ga4Overview> {
  const stubSeed = `${opts.projectId}`;
  if (!opts.propertyId) return stubGa4Overview(stubSeed, opts.from, opts.to);

  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId,
    userId: opts.userId,
  });
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
        keyEvents: get(4),
        eventCount: get(5),
        screenPageViews: get(6),
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
  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId,
    userId: opts.userId,
  });
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
          { name: "keyEvents" },
          { name: "eventCount" },
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
      keyEvents: Number(r.metricValues?.[4]?.value ?? 0),
      eventCount: Number(r.metricValues?.[5]?.value ?? 0),
    }));
    return { rows, source: "live" };
  } catch {
    return {
      rows: stubGa4Channels(stubSeed, opts.from, opts.to),
      source: "stub",
    };
  }
}

export async function listGa4Properties(opts: {
  userId: string;
  projectId?: string | null;
}): Promise<Ga4PropertyListItem[]> {
  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId ?? null,
    userId: opts.userId,
  });
  const stubSeed = opts.projectId ?? opts.userId;
  if (!token) return stubGa4Properties(stubSeed);

  try {
    const res = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return stubGa4Properties(stubSeed);
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
    return out.length ? out : stubGa4Properties(stubSeed);
  } catch {
    return stubGa4Properties(stubSeed);
  }
}
