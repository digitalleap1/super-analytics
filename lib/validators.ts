import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  domain: z
    .string()
    .min(3, "Enter a domain like example.com")
    .max(255)
    .transform((raw) => {
      let s = raw.trim().toLowerCase();
      s = s.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
      return s;
    })
    .refine((s) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s), {
      message: "Enter a valid domain (e.g. example.com)",
    }),
  logoUrl: z.string().max(2_000_000).optional().nullable(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

const reportFilterSchema = z.object({
  mode: z.enum(["contains", "not_contains", "regex"]).default("contains"),
  text: z.string().max(2000).default(""),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  gscSiteUrl: z.string().max(500).optional().nullable(),
  ga4PropertyId: z.string().max(50).optional().nullable(),
  gmbAccountId: z.string().max(120).optional().nullable(),
  gmbLocationId: z.string().max(120).optional().nullable(),
  templateId: z.string().optional().nullable(),
  analysisNotes: z.string().max(10000).optional().nullable(),
  // Structured tasks are stored as a JSON array, which costs more characters
  // than the old free text — give it headroom.
  otherTasks: z.string().max(30000).optional().nullable(),
  // Row curation applied to the report + every export: per-table hidden row
  // keys plus a per-table Contains/Regex filter. Bounded to keep the JSON
  // column sane.
  reportExclusions: z
    .object({
      queries: z.array(z.string().max(2000)).max(2000).default([]),
      pages: z.array(z.string().max(2000)).max(2000).default([]),
      channels: z.array(z.string().max(2000)).max(500).default([]),
      filters: z
        .object({
          queries: reportFilterSchema,
          pages: reportFilterSchema,
          channels: reportFilterSchema,
        })
        .optional(),
      dims: z
        .record(
          z.string(),
          z.object({
            hidden: z.array(z.string().max(2000)).max(2000).default([]),
            filter: reportFilterSchema,
          }),
        )
        .optional(),
      hiddenSections: z.array(z.string().max(60)).max(50).optional(),
    })
    .optional()
    .nullable(),
});

export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export const keywordCountrySchema = z
  .string()
  .min(3)
  .max(3)
  .regex(/^[a-z]{3}$/, "Country must be a 3-letter ISO code (e.g. usa)");

export const keywordDeviceSchema = z.enum([
  "all",
  "desktop",
  "mobile",
  "tablet",
]);

export const keywordsBulkSchema = z.object({
  queries: z
    .array(z.string().min(1).max(200))
    .min(1, "Add at least one keyword")
    .max(500),
  country: keywordCountrySchema.default("usa"),
  device: keywordDeviceSchema.default("all"),
  tag: z.string().max(50).optional().nullable(),
});

export type KeywordsBulkInput = z.infer<typeof keywordsBulkSchema>;
