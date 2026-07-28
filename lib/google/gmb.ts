import { resolveGoogleAccessToken } from "./project-tokens";
import { GMB_METRICS } from "./gmb-metrics";
import { stubGmbPerformance, stubGmbLocations } from "./stub";
import type { GmbLocationItem, GmbPerformance } from "./types";

const ALL_API_METRICS = Array.from(
  new Set(GMB_METRICS.flatMap((m) => m.api)),
);

function parseGbpError(status: number, message: string): string {
  if (/has not been used|disabled|SERVICE_DISABLED/i.test(message)) {
    return "The Business Profile APIs aren't enabled for this Google Cloud project. Enable 'Business Profile Performance API', 'My Business Account Management API' and 'My Business Business Information API' in the Cloud Console, and make sure the project has been granted Business Profile API access.";
  }
  if (status === 403 || /permission|PERMISSION_DENIED/i.test(message)) {
    return "The connected Google account can't access this Business Profile, or the project hasn't been allow-listed for the Business Profile APIs yet (Google requires a one-time access request).";
  }
  if (status === 401) {
    return "Google Business Profile credentials expired — reconnect it for this project.";
  }
  return `Business Profile API error: ${message}`;
}

type LocationOpts = {
  userId: string;
  projectId?: string | null;
  strict?: boolean;
};

// Lists the connected account's Business Profile locations (account + location
// ids + name/address) for the settings picker.
export async function listGmbLocations(
  opts: LocationOpts,
): Promise<GmbLocationItem[]> {
  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId ?? null,
    userId: opts.strict ? null : opts.userId,
    service: "business_profile",
  });
  const seed = opts.projectId ?? opts.userId;
  if (!token) return stubGmbLocations(seed);

  try {
    const accRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=100",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!accRes.ok) return stubGmbLocations(seed);
    const accJson = (await accRes.json()) as {
      accounts?: Array<{ name?: string }>;
    };
    const out: GmbLocationItem[] = [];
    for (const acc of accJson.accounts ?? []) {
      const accountId = acc.name ?? "";
      if (!accountId) continue;
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress&pageSize=100`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!locRes.ok) continue;
      const locJson = (await locRes.json()) as {
        locations?: Array<{
          name?: string;
          title?: string;
          storefrontAddress?: { addressLines?: string[]; locality?: string };
        }>;
      };
      for (const l of locJson.locations ?? []) {
        if (!l.name) continue;
        const addr = [
          ...(l.storefrontAddress?.addressLines ?? []),
          l.storefrontAddress?.locality,
        ]
          .filter(Boolean)
          .join(", ");
        out.push({
          accountId,
          locationId: l.name.startsWith("locations/")
            ? l.name
            : `locations/${l.name}`,
          title: l.title ?? l.name,
          address: addr,
        });
      }
    }
    return out.length ? out : stubGmbLocations(seed);
  } catch {
    return stubGmbLocations(seed);
  }
}

function ymdParts(d: Date) {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

type PerfOpts = {
  userId: string;
  projectId: string;
  locationId: string | null;
  from: Date;
  to: Date;
};

// Sums each Business Profile Performance metric over the range and aggregates
// into the GMB_METRICS display keys.
export async function getGmbPerformance(
  opts: PerfOpts,
): Promise<GmbPerformance> {
  const seed = `${opts.projectId}:gmb`;
  if (!opts.locationId) return stubGmbPerformance(seed);

  const token = await resolveGoogleAccessToken({
    projectId: opts.projectId,
    userId: opts.userId,
    service: "business_profile",
  });
  if (!token) return stubGmbPerformance(seed);

  const loc = opts.locationId.startsWith("locations/")
    ? opts.locationId
    : `locations/${opts.locationId}`;
  const start = ymdParts(opts.from);
  const end = ymdParts(opts.to);
  const params = new URLSearchParams();
  for (const m of ALL_API_METRICS) params.append("dailyMetrics", m);
  params.set("dailyRange.start_date.year", String(start.year));
  params.set("dailyRange.start_date.month", String(start.month));
  params.set("dailyRange.start_date.day", String(start.day));
  params.set("dailyRange.end_date.year", String(end.year));
  params.set("dailyRange.end_date.month", String(end.month));
  params.set("dailyRange.end_date.day", String(end.day));

  try {
    const res = await fetch(
      `https://businessprofileperformance.googleapis.com/v1/${loc}:fetchMultiDailyMetricsTimeSeries?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        /* keep */
      }
      console.error("[gmb] getGmbPerformance failed:", res.status, message);
      return { ...stubGmbPerformance(seed), error: parseGbpError(res.status, message) };
    }
    const json = (await res.json()) as {
      multiDailyMetricTimeSeries?: Array<{
        dailyMetricTimeSeries?: Array<{
          dailyMetric?: string;
          timeSeries?: { datedValues?: Array<{ value?: string }> };
        }>;
      }>;
    };
    const perApi: Record<string, number> = {};
    for (const multi of json.multiDailyMetricTimeSeries ?? []) {
      for (const s of multi.dailyMetricTimeSeries ?? []) {
        const metric = s.dailyMetric ?? "";
        const sum = (s.timeSeries?.datedValues ?? []).reduce(
          (acc, dv) => acc + Number(dv.value ?? 0),
          0,
        );
        perApi[metric] = (perApi[metric] ?? 0) + sum;
      }
    }
    const totals: Record<string, number> = {};
    for (const m of GMB_METRICS) {
      totals[m.key] = m.api.reduce((acc, a) => acc + (perApi[a] ?? 0), 0);
    }
    return { totals, source: "live" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[gmb] getGmbPerformance exception:", message);
    return { ...stubGmbPerformance(seed), error: `Could not reach Business Profile API (${message}).` };
  }
}
