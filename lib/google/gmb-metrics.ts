// Client-safe Google Business Profile metric definitions (no server imports),
// so both the fetch layer (gmb.ts) and the report UI can use them.
export type GmbMetricDef = { key: string; label: string; api: string[] };

export const GMB_METRICS: GmbMetricDef[] = [
  {
    key: "impressionsSearch",
    label: "Search impressions",
    api: [
      "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
      "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    ],
  },
  {
    key: "impressionsMaps",
    label: "Maps impressions",
    api: [
      "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
      "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
    ],
  },
  { key: "calls", label: "Calls", api: ["CALL_CLICKS"] },
  { key: "websiteClicks", label: "Website clicks", api: ["WEBSITE_CLICKS"] },
  {
    key: "directions",
    label: "Direction requests",
    api: ["BUSINESS_DIRECTION_REQUESTS"],
  },
  { key: "conversations", label: "Messages", api: ["BUSINESS_CONVERSATIONS"] },
  { key: "bookings", label: "Bookings", api: ["BUSINESS_BOOKINGS"] },
];
