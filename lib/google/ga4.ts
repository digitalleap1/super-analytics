import { google } from "googleapis";

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

export type Ga4PropertiesResult = {
  properties: Ga4PropertyListItem[];
  // "live" = these are the user's real GA4 properties.
  // "stub" = we fell back to demo data; `error` explains why.
  source: "live" | "stub";
  error?: string;
};

export async function listGa4Properties(opts: {
  userId: string;
  projectId?: string | null;
}): Promise<Ga4PropertiesResult> {
  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId ?? null,
    userId: opts.userId,
  });
  const stubSeed = opts.projectId ?? opts.userId;
  if (!token) {
    return {
      properties: stubGa4Properties(stubSeed),
      source: "stub",
      error:
        "Google isn't connected for this project yet — click 'Connect Google' above to authorise GA4 access.",
    };
  }

  try {
    const res = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      // Try to surface Google's actual error message so the user knows what to do.
      let message = `Google Analytics Admin API returned ${res.status}`;
      try {
        const errBody = (await res.json()) as {
          error?: { message?: string; status?: string };
        };
        if (errBody.error?.message) {
          message = errBody.error.message;
          // The Admin API needs to be explicitly enabled in the GCP console.
          // Detect that specific case and rewrite the message.
          if (
            /api has not been used|disabled/i.test(message) ||
            errBody.error.status === "PERMISSION_DENIED"
          ) {
            message =
              "Google Analytics Admin API isn't enabled for this project. Go to Google Cloud Console → APIs & Services → Library, search for 'Google Analytics Admin API', and click Enable. Then refresh this page.";
          }
        }
      } catch {
        /* keep the generic message */
      }
      console.error("[ga4] listGa4Properties failed:", res.status, message);
      return {
        properties: stubGa4Properties(stubSeed),
        source: "stub",
        error: message,
      };
    }
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
    if (out.length === 0) {
      return {
        properties: stubGa4Properties(stubSeed),
        source: "stub",
        error:
          "Connected Google account has access to GA4, but no properties were returned. Confirm the account is a property user/admin in Analytics → Admin → Property access management.",
      };
    }
    return { properties: out, source: "live" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ga4] listGa4Properties exception:", message);
    return {
      properties: stubGa4Properties(stubSeed),
      source: "stub",
      error: `Could not reach Google Analytics Admin API (${message}).`,
    };
  }
}
