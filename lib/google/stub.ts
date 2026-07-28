// Deterministic fake-data generators used when there's no live Google
// connection. Same input -> same output, so charts/tables look stable across
// reloads. Numbers are believable (smooth trend + small noise), not random.

import type { Ga4SectionDef } from "./ga4-sections";
import type {
  DailyMetric,
  Ga4BreakdownRow,
  Ga4ChannelRow,
  Ga4Overview,
  Ga4PropertyListItem,
  GmbLocationItem,
  GmbPerformance,
  GscOverview,
  GscPageRow,
  GscQueryRow,
  GscSiteListItem,
} from "./types";

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRng(seed: number): () => number {
  let s = (seed + 1) & 0x7fffffff;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function stubGscOverview(
  seed: string,
  from: Date,
  to: Date,
): GscOverview {
  const days = eachDay(from, to);
  const rng = seededRng(hashString(`${seed}:overview`));
  const baseClicks = 60 + rng() * 240;
  const baseImpr = baseClicks * (12 + rng() * 18);
  const basePos = 8 + rng() * 18;

  const series: DailyMetric[] = days.map((d, i) => {
    const trend = Math.sin((i / Math.max(1, days.length)) * Math.PI * 2) * 0.25;
    const noise = (rng() - 0.5) * 0.25;
    const dayMul = 1 + trend + noise;
    const clicks = Math.max(0, Math.round(baseClicks * dayMul));
    const impressions = Math.max(
      clicks,
      Math.round(baseImpr * (1 + trend * 0.7 + (rng() - 0.5) * 0.3)),
    );
    const ctr = impressions ? clicks / impressions : 0;
    const position = Math.max(
      1,
      basePos + Math.sin((i / Math.max(1, days.length)) * Math.PI) * 3 +
        (rng() - 0.5) * 1.5,
    );
    return { date: ymd(d), clicks, impressions, ctr, position };
  });

  const totalClicks = series.reduce((s, x) => s + x.clicks, 0);
  const totalImpr = series.reduce((s, x) => s + x.impressions, 0);
  const ctr = totalImpr ? totalClicks / totalImpr : 0;
  const position =
    series.reduce((s, x) => s + x.position * x.impressions, 0) /
    Math.max(1, totalImpr);

  return {
    totals: { clicks: totalClicks, impressions: totalImpr, ctr, position },
    series,
    source: "stub",
  };
}

export function stubGscQueries(seed: string, limit = 50): GscQueryRow[] {
  const rng = seededRng(hashString(`${seed}:queries`));
  const buckets = [
    "buy",
    "best",
    "review",
    "vs",
    "near me",
    "guide",
    "pricing",
    "alternatives",
    "how to",
    "what is",
  ];
  const nouns = [
    "widgets",
    "saas",
    "boots",
    "marketing tools",
    "crm",
    "agency",
    "software",
    "platforms",
    "automation",
    "analytics",
  ];

  const rows: GscQueryRow[] = [];
  for (let i = 0; i < limit; i++) {
    const a = buckets[Math.floor(rng() * buckets.length)];
    const b = nouns[Math.floor(rng() * nouns.length)];
    const tail = i % 3 === 0 ? "" : ` ${Math.floor(rng() * 100)}`;
    const impressions = Math.floor(800 / (i + 1) + rng() * 200);
    const ctr = Math.min(0.35, 0.02 + rng() * 0.08);
    const clicks = Math.floor(impressions * ctr);
    const position = 1 + i * 0.4 + (rng() - 0.5) * 1.5;
    rows.push({
      query: `${a} ${b}${tail}`.trim(),
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position: Math.max(1, position),
    });
  }
  return rows.sort((a, b) => b.clicks - a.clicks);
}

export function stubGscPages(seed: string, domain: string, limit = 50): GscPageRow[] {
  const rng = seededRng(hashString(`${seed}:pages`));
  const slugs = [
    "/",
    "/pricing",
    "/blog",
    "/features",
    "/docs",
    "/about",
    "/contact",
    "/integrations",
    "/changelog",
    "/customers",
    "/security",
    "/blog/seo-checklist",
    "/blog/tracking-clicks",
    "/blog/agency-tips",
    "/blog/conversion-rate",
  ];
  const rows: GscPageRow[] = [];
  for (let i = 0; i < limit; i++) {
    const slug = slugs[i % slugs.length] + (i >= slugs.length ? `-${i}` : "");
    const impressions = Math.floor(1200 / (i + 1) + rng() * 300);
    const ctr = Math.min(0.4, 0.02 + rng() * 0.1);
    const clicks = Math.floor(impressions * ctr);
    const position = 1 + i * 0.3 + (rng() - 0.5) * 1.5;
    rows.push({
      page: `https://${domain}${slug}`,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position: Math.max(1, position),
    });
  }
  return rows.sort((a, b) => b.clicks - a.clicks);
}

export function stubGa4Overview(
  seed: string,
  from: Date,
  to: Date,
): Ga4Overview {
  const days = eachDay(from, to).length;
  const rng = seededRng(hashString(`${seed}:ga4`));
  const sessions = Math.round((40 + rng() * 80) * days);
  const totalUsers = Math.round(sessions * (0.62 + rng() * 0.18));
  const engagementRate = 0.45 + rng() * 0.25;
  const eventCount = Math.round(sessions * (4 + rng() * 6));
  const screenPageViews = Math.round(sessions * (1.8 + rng() * 1.4));
  return {
    totals: {
      sessions,
      totalUsers,
      engagementRate,
      eventCount,
      screenPageViews,
    },
    source: "stub",
  };
}

export function stubGa4Channels(seed: string, from: Date, to: Date): Ga4ChannelRow[] {
  const rng = seededRng(hashString(`${seed}:channels`));
  const total = stubGa4Overview(seed, from, to).totals;
  const splits = [
    { channel: "Organic Search", w: 0.42 },
    { channel: "Direct", w: 0.21 },
    { channel: "Referral", w: 0.13 },
    { channel: "Paid Search", w: 0.1 },
    { channel: "Organic Social", w: 0.08 },
    { channel: "Email", w: 0.04 },
    { channel: "Unassigned", w: 0.02 },
  ];
  return splits.map((s) => {
    const sessions = Math.round(total.sessions * s.w);
    const totalUsers = Math.round(sessions * (0.6 + rng() * 0.2));
    const engagementRate = 0.35 + rng() * 0.35;
    const eventCount = Math.round(sessions * (3 + rng() * 6));
    return {
      channel: s.channel,
      sessions,
      totalUsers,
      engagementRate,
      eventCount,
    };
  });
}

const STUB_BREAKDOWN_KEYS: Record<string, string[]> = {
  ga4Events: [
    "page_view",
    "session_start",
    "user_engagement",
    "scroll",
    "click",
    "form_start",
    "form_submit",
    "file_download",
  ],
  ga4LandingPages: [
    "/",
    "/services",
    "/about",
    "/contact",
    "/pricing",
    "/blog/getting-started",
    "/blog/case-study",
  ],
  ga4Devices: ["mobile", "desktop", "tablet"],
  ga4Countries: [
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "India",
    "Germany",
  ],
};

export function stubGa4Breakdown(
  seed: string,
  def: Ga4SectionDef,
): Ga4BreakdownRow[] {
  const rng = seededRng(hashString(`${seed}:${def.id}`));
  const keys = STUB_BREAKDOWN_KEYS[def.id] ?? ["(sample a)", "(sample b)", "(sample c)"];
  const base = 1200;
  return keys.map((key, i) => {
    const scale = Math.max(1, base * (1 - i * 0.13) * (0.7 + rng() * 0.5));
    const metrics: Record<string, number> = {};
    for (const m of def.metrics) {
      if (m.format === "percent") metrics[m.name] = 0.35 + rng() * 0.5;
      else if (m.name === "totalUsers")
        metrics[m.name] = Math.round(scale * (0.6 + rng() * 0.3));
      else if (m.name === "eventCount")
        metrics[m.name] = Math.round(scale * (3 + rng() * 5));
      else metrics[m.name] = Math.round(scale);
    }
    return { key, metrics };
  });
}

export function stubGmbLocations(seed: string): GmbLocationItem[] {
  const rng = seededRng(hashString(`${seed}:gmbloc`));
  const names = ["Downtown Studio", "Main Street Clinic", "Uptown Branch"];
  return names.map((title, i) => ({
    accountId: "accounts/000000000000",
    locationId: `locations/${1000000 + Math.floor(rng() * 8999999)}`,
    title: `${title} (sample)`,
    address: `${100 + i * 40} Example Ave, Sampletown`,
  }));
}

export function stubGmbPerformance(seed: string): GmbPerformance {
  const rng = seededRng(hashString(`${seed}:gmbperf`));
  const r = (base: number) => Math.round(base * (0.7 + rng() * 0.6));
  return {
    totals: {
      impressionsSearch: r(4200),
      impressionsMaps: r(2600),
      calls: r(48),
      websiteClicks: r(160),
      directions: r(120),
      conversations: r(14),
      bookings: r(6),
    },
    source: "stub",
  };
}

export function stubKeywordDaily(
  seed: string,
  query: string,
  from: Date,
  to: Date,
): DailyMetric[] {
  const days = eachDay(from, to);
  const rng = seededRng(hashString(`${seed}:${query}`));
  const basePos = 4 + rng() * 30;
  const baseImpr = 20 + rng() * 200;
  return days.map((d, i) => {
    const wobble = Math.sin((i / Math.max(1, days.length)) * Math.PI * 2) * 2;
    const noise = (rng() - 0.5) * 2;
    const position = Math.max(1, basePos + wobble + noise);
    const impressions = Math.max(0, Math.round(baseImpr * (1 + (rng() - 0.5) * 0.4)));
    const ctr = Math.max(0, Math.min(0.5, 0.18 / Math.max(1, position * 0.5)));
    const clicks = Math.round(impressions * ctr);
    return {
      date: ymd(d),
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position,
    };
  });
}

export function stubGscSites(userId: string): GscSiteListItem[] {
  const rng = seededRng(hashString(`${userId}:sites`));
  const examples = [
    "example.com",
    "demo-shop.com",
    "agency-portfolio.com",
    "another-client.io",
  ];
  const count = 2 + Math.floor(rng() * 2);
  return examples.slice(0, count).flatMap((d) => [
    { siteUrl: `sc-domain:${d}`, permissionLevel: "siteOwner" },
    { siteUrl: `https://${d}/`, permissionLevel: "siteFullUser" },
  ]);
}

export function stubGa4Properties(userId: string): Ga4PropertyListItem[] {
  const rng = seededRng(hashString(`${userId}:ga4`));
  const names = ["Main Site", "Demo Shop", "Agency Portfolio", "Another Client"];
  return names.slice(0, 2 + Math.floor(rng() * 2)).map((name, i) => ({
    propertyId: String(300000000 + Math.floor(rng() * 99999999)),
    displayName: name,
    accountDisplayName: `Demo Account ${i + 1}`,
  }));
}
