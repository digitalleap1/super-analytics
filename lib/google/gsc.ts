import { google } from "googleapis";

import { resolveGoogleAccessToken } from "./project-tokens";
import {
  stubGscOverview,
  stubGscPages,
  stubGscQueries,
  stubGscSites,
} from "./stub";
import type {
  GscOverview,
  GscPagesResult,
  GscQueriesResult,
  GscSiteListItem,
} from "./types";

function client(accessToken: string) {
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.searchconsole({ version: "v1", auth: oauth2 });
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type FetchOpts = {
  userId: string;
  projectId: string;
  siteUrl: string | null;
  from: Date;
  to: Date;
};

export async function getGscOverview(opts: FetchOpts): Promise<GscOverview> {
  const stubSeed = `${opts.projectId}`;
  if (!opts.siteUrl) return stubGscOverview(stubSeed, opts.from, opts.to);

  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId,
    userId: opts.userId,
    service: "search_console",
  });
  if (!token) return stubGscOverview(stubSeed, opts.from, opts.to);

  try {
    const sc = client(token);
    const [totalsRes, seriesRes] = await Promise.all([
      sc.searchanalytics.query({
        siteUrl: opts.siteUrl,
        requestBody: {
          startDate: ymd(opts.from),
          endDate: ymd(opts.to),
          dimensions: [],
          rowLimit: 1,
        },
      }),
      sc.searchanalytics.query({
        siteUrl: opts.siteUrl,
        requestBody: {
          startDate: ymd(opts.from),
          endDate: ymd(opts.to),
          dimensions: ["date"],
          rowLimit: 1000,
        },
      }),
    ]);

    const t = totalsRes.data.rows?.[0];
    const totals = {
      clicks: t?.clicks ?? 0,
      impressions: t?.impressions ?? 0,
      ctr: t?.ctr ?? 0,
      position: t?.position ?? 0,
    };
    const series = (seriesRes.data.rows ?? []).map((r) => ({
      date: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));
    return { totals, series, source: "live" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[gsc] getGscOverview failed for ${opts.siteUrl}:`,
      message,
    );
    let parsed = `Search Console API error: ${message}`;
    if (/has not been used|disabled/i.test(message)) {
      parsed =
        "Google Search Console API isn't enabled in this Google Cloud project. Enable it at console.cloud.google.com/apis/library/searchconsole.googleapis.com, wait ~30 seconds, then reload.";
    } else if (/permission|forbidden|403/i.test(message)) {
      parsed =
        "The connected Google account doesn't have access to this Search Console property. In Search Console → Settings → Users and permissions, add this account.";
    }
    return { ...stubGscOverview(stubSeed, opts.from, opts.to), error: parsed };
  }
}

export async function getGscQueries(opts: FetchOpts): Promise<GscQueriesResult> {
  const stubSeed = `${opts.projectId}`;
  if (!opts.siteUrl) return { rows: stubGscQueries(stubSeed), source: "stub" };

  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId,
    userId: opts.userId,
    service: "search_console",
  });
  if (!token) return { rows: stubGscQueries(stubSeed), source: "stub" };

  try {
    const sc = client(token);
    const res = await sc.searchanalytics.query({
      siteUrl: opts.siteUrl,
      requestBody: {
        startDate: ymd(opts.from),
        endDate: ymd(opts.to),
        dimensions: ["query"],
        rowLimit: 250,
      },
    });
    const rows = (res.data.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));
    return { rows, source: "live" };
  } catch {
    return { rows: stubGscQueries(stubSeed), source: "stub" };
  }
}

export async function getGscPages(
  opts: FetchOpts & { domain: string },
): Promise<GscPagesResult> {
  const stubSeed = `${opts.projectId}`;
  if (!opts.siteUrl) {
    return { rows: stubGscPages(stubSeed, opts.domain), source: "stub" };
  }
  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId,
    userId: opts.userId,
    service: "search_console",
  });
  if (!token) {
    return { rows: stubGscPages(stubSeed, opts.domain), source: "stub" };
  }

  try {
    const sc = client(token);
    const res = await sc.searchanalytics.query({
      siteUrl: opts.siteUrl,
      requestBody: {
        startDate: ymd(opts.from),
        endDate: ymd(opts.to),
        dimensions: ["page"],
        rowLimit: 250,
      },
    });
    const rows = (res.data.rows ?? []).map((r) => ({
      page: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));
    return { rows, source: "live" };
  } catch {
    return { rows: stubGscPages(stubSeed, opts.domain), source: "stub" };
  }
}

export async function listGscSites(opts: {
  userId: string;
  projectId?: string | null;
}): Promise<GscSiteListItem[]> {
  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId ?? null,
    userId: opts.userId,
    service: "search_console",
  });
  const stubSeed = opts.projectId ?? opts.userId;
  if (!token) return stubGscSites(stubSeed);
  try {
    const sc = client(token);
    const res = await sc.sites.list();
    return (res.data.siteEntry ?? []).map((s) => ({
      siteUrl: s.siteUrl ?? "",
      permissionLevel: s.permissionLevel ?? "unknown",
    }));
  } catch {
    return stubGscSites(stubSeed);
  }
}

export async function getKeywordDaily(opts: {
  userId: string;
  projectId: string;
  siteUrl: string | null;
  query: string;
  country: string;
  device: string;
  from: Date;
  to: Date;
}) {
  const stubSeed = `${opts.projectId}`;
  if (!opts.siteUrl) {
    const { stubKeywordDaily } = await import("./stub");
    return stubKeywordDaily(stubSeed, opts.query, opts.from, opts.to);
  }
  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId,
    userId: opts.userId,
    service: "search_console",
  });
  if (!token) {
    const { stubKeywordDaily } = await import("./stub");
    return stubKeywordDaily(stubSeed, opts.query, opts.from, opts.to);
  }

  try {
    const sc = client(token);
    const filters: Array<{ dimension: string; operator: string; expression: string }> = [
      { dimension: "query", operator: "equals", expression: opts.query },
    ];
    if (opts.country !== "all") {
      filters.push({ dimension: "country", operator: "equals", expression: opts.country });
    }
    if (opts.device !== "all") {
      filters.push({ dimension: "device", operator: "equals", expression: opts.device.toUpperCase() });
    }
    const res = await sc.searchanalytics.query({
      siteUrl: opts.siteUrl,
      requestBody: {
        startDate: ymd(opts.from),
        endDate: ymd(opts.to),
        dimensions: ["date"],
        rowLimit: 1000,
        dimensionFilterGroups: [{ filters }],
      },
    });
    return (res.data.rows ?? []).map((r) => ({
      date: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));
  } catch {
    const { stubKeywordDaily } = await import("./stub");
    return stubKeywordDaily(stubSeed, opts.query, opts.from, opts.to);
  }
}
