import { prisma } from "@/lib/prisma";

export type BacklinkCategory =
  | "business_listing"
  | "profile_creation"
  | "social_bookmarking"
  | "microblogs"
  | "third_party_blogs"
  | "website_blogs"
  | "other";

export type BacklinkCategoryMeta = {
  value: BacklinkCategory;
  label: string;
  // HSL string used by the pie chart. Hand-picked so 7 categories stay distinguishable
  // against the brand pink primary.
  color: string;
};

export const BACKLINK_CATEGORIES: BacklinkCategoryMeta[] = [
  { value: "business_listing", label: "Business listing", color: "hsl(338 86% 54%)" },
  { value: "profile_creation", label: "Profile creation", color: "hsl(230 52% 35%)" },
  { value: "social_bookmarking", label: "Social bookmarking", color: "hsl(180 60% 45%)" },
  { value: "microblogs", label: "Microblogs", color: "hsl(35 90% 55%)" },
  { value: "third_party_blogs", label: "Third-party blogs", color: "hsl(140 50% 45%)" },
  { value: "website_blogs", label: "Website blogs", color: "hsl(270 50% 55%)" },
  { value: "other", label: "Other", color: "hsl(0 0% 60%)" },
];

const CATEGORY_BY_VALUE = new Map(BACKLINK_CATEGORIES.map((c) => [c.value, c]));

export function categoryMeta(value: string): BacklinkCategoryMeta {
  return CATEGORY_BY_VALUE.get(value as BacklinkCategory) ?? {
    value: "other",
    label: "Other",
    color: "hsl(0 0% 60%)",
  };
}

// Maps a free-text category from CSV input to one of our enum values.
export function normalizeCategory(raw: string): BacklinkCategory {
  const s = raw.trim().toLowerCase().replace(/[^a-z]+/g, "_");
  if (CATEGORY_BY_VALUE.has(s as BacklinkCategory)) return s as BacklinkCategory;

  // Common aliases.
  if (/business|listing|directory|gmb|maps/.test(s)) return "business_listing";
  if (/profile|forum|community/.test(s)) return "profile_creation";
  if (/bookmark|pinterest|reddit/.test(s)) return "social_bookmarking";
  if (/micro|twitter|tumblr|threads/.test(s)) return "microblogs";
  if (/guest|third|3rd_party/.test(s)) return "third_party_blogs";
  if (/web_?site|blog_?post/.test(s)) return "website_blogs";
  return "other";
}

export type BacklinkRow = {
  id: string;
  category: BacklinkCategory;
  url: string;
  place: string | null;
  notes: string | null;
  submittedAt: string; // YYYY-MM-DD
  createdAt: string;
};

export async function listBacklinksInRange(opts: {
  projectId: string;
  from: Date;
  to: Date;
}): Promise<BacklinkRow[]> {
  const rows = await prisma.backlink.findMany({
    where: {
      projectId: opts.projectId,
      submittedAt: { gte: opts.from, lte: opts.to },
    },
    orderBy: { submittedAt: "desc" },
  });
  return rows.map((b) => ({
    id: b.id,
    category: b.category as BacklinkCategory,
    url: b.url,
    place: b.place,
    notes: b.notes,
    submittedAt: b.submittedAt.toISOString().slice(0, 10),
    createdAt: b.createdAt.toISOString().slice(0, 10),
  }));
}

// Tiny robust-ish CSV parser. Handles quoted fields, commas inside quotes,
// and escaped double-quotes ("").
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 0 && r.some((cell) => cell.trim() !== ""));
}

// Maps flexible header names to our internal field names.
const HEADER_ALIASES: Record<string, keyof ParsedBacklinkRow> = {
  category: "category",
  type: "category",
  "link type": "category",
  "link category": "category",
  url: "url",
  link: "url",
  backlink: "url",
  page: "url",
  website: "url",
  place: "place",
  location: "place",
  source: "place",
  domain: "place",
  notes: "notes",
  note: "notes",
  comment: "notes",
  description: "notes",
  date: "submittedAt",
  submitted: "submittedAt",
  "submission date": "submittedAt",
  "date of submission": "submittedAt",
  "submitted at": "submittedAt",
  submittedat: "submittedAt",
  created: "submittedAt",
};

type ParsedBacklinkRow = {
  category: string;
  url: string;
  place: string;
  notes: string;
  submittedAt: string;
};

export type CsvParseResult = {
  rows: Array<{
    category: BacklinkCategory;
    url: string;
    place: string | null;
    notes: string | null;
    submittedAt: Date;
  }>;
  skipped: Array<{ row: number; reason: string }>;
};

export function parseBacklinkCsv(text: string): CsvParseResult {
  const grid = parseCsv(text);
  if (grid.length === 0) return { rows: [], skipped: [] };

  const headers = grid[0].map((h) => h.trim().toLowerCase());
  const fieldIndex: Partial<Record<keyof ParsedBacklinkRow, number>> = {};
  headers.forEach((h, i) => {
    const mapped = HEADER_ALIASES[h];
    if (mapped) fieldIndex[mapped] = i;
  });

  if (fieldIndex.url === undefined) {
    throw new Error(
      "CSV is missing a URL column. Expected header: url, link, backlink, page, or website.",
    );
  }

  const result: CsvParseResult = { rows: [], skipped: [] };
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    const get = (k: keyof ParsedBacklinkRow): string =>
      fieldIndex[k] !== undefined ? (cells[fieldIndex[k]!] ?? "").trim() : "";

    const url = get("url");
    if (!url) {
      result.skipped.push({ row: r + 1, reason: "missing url" });
      continue;
    }

    const dateStr = get("submittedAt");
    let submittedAt: Date;
    if (dateStr) {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) {
        result.skipped.push({ row: r + 1, reason: `unrecognized date "${dateStr}"` });
        continue;
      }
      submittedAt = d;
    } else {
      submittedAt = new Date();
    }
    submittedAt.setHours(0, 0, 0, 0);

    const category = normalizeCategory(get("category") || "other");
    result.rows.push({
      category,
      url,
      place: get("place") || null,
      notes: get("notes") || null,
      submittedAt,
    });
  }
  return result;
}

// Extracts the spreadsheet ID from a Google Sheets share URL.
// Accepted shapes:
//   https://docs.google.com/spreadsheets/d/SHEET_ID/edit?...
//   https://docs.google.com/spreadsheets/d/SHEET_ID
//   SHEET_ID directly
export function extractSheetId(input: string): string | null {
  const trimmed = input.trim();
  const m = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  // Bare ID heuristic.
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export function sheetCsvExportUrl(sheetId: string, gid = 0): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}
