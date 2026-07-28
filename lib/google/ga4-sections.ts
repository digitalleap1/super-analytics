import type { CacheType } from "@/lib/cache";
import type { SectionKey } from "@/lib/templates";

// One shared definition per GA4 breakdown section. Drives the GA4 Data API
// query (dimension + metrics), the report table columns, the report-config
// toggle key, the curation key, and the cache key — so adding another GA4
// section later is a single entry here plus a fetch call.
export type MetricFormat = "number" | "percent";

export type Ga4MetricCol = {
  name: string; // GA4 metric id, e.g. "eventCount"
  header: string; // column header
  format: MetricFormat;
};

export type Ga4SectionDef = {
  id: string; // curation key + stable id, e.g. "ga4Events"
  sectionKey: SectionKey; // report-config toggle key
  cacheType: CacheType;
  label: string; // section heading
  keyHeader: string; // first-column header (the dimension)
  dimension: string; // GA4 dimension id
  metrics: Ga4MetricCol[]; // ordered; metrics[0] is the sort/primary metric
};

export const GA4_SECTIONS: Ga4SectionDef[] = [
  {
    id: "ga4Events",
    sectionKey: "ga4Events",
    cacheType: "ga4_events",
    label: "GA4 events",
    keyHeader: "Event",
    dimension: "eventName",
    metrics: [
      { name: "eventCount", header: "Count", format: "number" },
      { name: "totalUsers", header: "Users", format: "number" },
    ],
  },
  {
    id: "ga4LandingPages",
    sectionKey: "ga4LandingPages",
    cacheType: "ga4_landing",
    label: "GA4 landing pages",
    keyHeader: "Landing page",
    dimension: "landingPage",
    metrics: [
      { name: "sessions", header: "Sessions", format: "number" },
      { name: "totalUsers", header: "Users", format: "number" },
      { name: "engagementRate", header: "Engagement", format: "percent" },
      { name: "keyEvents", header: "Key events", format: "number" },
    ],
  },
  {
    id: "ga4Devices",
    sectionKey: "ga4Devices",
    cacheType: "ga4_devices",
    label: "GA4 devices",
    keyHeader: "Device",
    dimension: "deviceCategory",
    metrics: [
      { name: "sessions", header: "Sessions", format: "number" },
      { name: "totalUsers", header: "Users", format: "number" },
      { name: "engagementRate", header: "Engagement", format: "percent" },
      { name: "eventCount", header: "Events", format: "number" },
    ],
  },
  {
    id: "ga4Countries",
    sectionKey: "ga4Countries",
    cacheType: "ga4_countries",
    label: "GA4 countries",
    keyHeader: "Country",
    dimension: "country",
    metrics: [
      { name: "sessions", header: "Sessions", format: "number" },
      { name: "totalUsers", header: "Users", format: "number" },
      { name: "engagementRate", header: "Engagement", format: "percent" },
      { name: "eventCount", header: "Events", format: "number" },
    ],
  },
];

export const GA4_SECTION_BY_ID = new Map(GA4_SECTIONS.map((s) => [s.id, s]));
