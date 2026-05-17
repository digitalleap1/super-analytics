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

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  gscSiteUrl: z.string().max(500).optional().nullable(),
  ga4PropertyId: z.string().max(50).optional().nullable(),
  templateId: z.string().optional().nullable(),
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
