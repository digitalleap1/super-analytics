// Shared types for our Google API wrappers. Kept neutral so the same shapes
// flow through whether the data comes from a real GSC/GA4 call or the stub
// generator in lib/google/stub.ts.

export type DateRange = {
  from: Date;
  to: Date;
};

export type DailyMetric = {
  date: string; // YYYY-MM-DD
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscOverview = {
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  series: DailyMetric[];
  source: "live" | "stub";
  // Set when source === "stub" and the cause is known (API not enabled, no
  // access, etc.). Surfaced to the user in the project banner.
  error?: string;
};

export type GscQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscQueriesResult = {
  rows: GscQueryRow[];
  source: "live" | "stub";
};

export type GscPagesResult = {
  rows: GscPageRow[];
  source: "live" | "stub";
};

export type Ga4Overview = {
  totals: {
    sessions: number;
    totalUsers: number;
    newUsers: number;
    engagementRate: number;
    eventCount: number;
    screenPageViews: number;
  };
  source: "live" | "stub";
  // Set when source === "stub" and the cause is known. Surfaced in the UI.
  error?: string;
};

export type Ga4ChannelRow = {
  channel: string;
  sessions: number;
  totalUsers: number;
  newUsers: number;
  engagementRate: number;
  eventCount: number;
};

export type Ga4ChannelsResult = {
  rows: Ga4ChannelRow[];
  source: "live" | "stub";
};

export type GscSiteListItem = {
  siteUrl: string;
  permissionLevel: string;
};

export type Ga4PropertyListItem = {
  propertyId: string;
  displayName: string;
  accountDisplayName: string;
};

export function isDemoMode(): boolean {
  return !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET;
}
