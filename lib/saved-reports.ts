import { randomBytes } from "node:crypto";

import type { ReportTemplateConfig } from "@/lib/templates";
import type {
  Ga4ChannelRow,
  Ga4Overview,
  GscOverview,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";
import type { KeywordRow } from "@/lib/keywords";
import type { BacklinkMonthBucket, BacklinkRow } from "@/lib/backlinks";
import type { ReportSummary } from "@/lib/report-summary";

// Frozen-in-time picture of everything <EditableProjectReport> renders.
// Stored as a single JSON string on SavedReport.snapshot.
export type SavedReportSnapshot = {
  version: 1;
  projectName: string;
  projectDomain: string;
  projectLogoUrl?: string | null;
  rangeLabel: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;
  compare: boolean;
  isStub: boolean;
  pdfFilename: string;
  config: ReportTemplateConfig;
  template: { id: string; name: string } | null;
  overview: GscOverview;
  prevOverview: GscOverview | null;
  ga4Overview: Ga4Overview;
  prevGa4: Ga4Overview | null;
  queries: GscQueryRow[];
  pages: GscPageRow[];
  channels: Ga4ChannelRow[];
  keywords: KeywordRow[];
  backlinks: BacklinkRow[];
  backlinkMonthly: BacklinkMonthBucket[];
  // Added in template v2: top-of-report summary + the two free-text sections.
  summary?: ReportSummary;
  analysisNotes?: string | null;
  otherTasks?: string | null;
};

export function parseSnapshot(raw: string): SavedReportSnapshot | null {
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && obj.version === 1) {
      return obj as SavedReportSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}
