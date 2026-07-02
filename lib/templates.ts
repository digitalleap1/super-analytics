import { prisma } from "@/lib/prisma";

export type SectionKey =
  | "summary"
  | "kpis"
  | "analysis"
  | "chartClicksImpressions"
  | "chartPositionTrend"
  | "keywords"
  | "backlinks"
  | "topQueries"
  | "topPages"
  | "ga4Channels"
  | "otherTasks";

export type Density = "compact" | "comfortable" | "spacious";
export type KpiColumns = 3 | 4 | 5 | 6;
export type TableLimit = 5 | 10 | 15 | 20 | 25 | 50 | 100;

export type ReportTemplateConfig = {
  sections: Record<SectionKey, boolean>;
  layout: {
    kpiColumns: KpiColumns;
    density: Density;
    tableLimit: TableLimit;
  };
  branding: {
    headerText: string | null;
    footerText: string | null;
  };
};

export const DEFAULT_TEMPLATE_CONFIG: ReportTemplateConfig = {
  sections: {
    summary: true,
    kpis: true,
    analysis: true,
    chartClicksImpressions: true,
    chartPositionTrend: true,
    // Off by default — agencies typically link a Google Sheet of rankings in the
    // "Other tasks" field instead. Toggle on per template if you want it.
    keywords: false,
    backlinks: true,
    topQueries: true,
    topPages: true,
    ga4Channels: true,
    otherTasks: true,
  },
  layout: {
    kpiColumns: 5,
    density: "comfortable",
    tableLimit: 25,
  },
  branding: {
    headerText: null,
    footerText: null,
  },
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Executive summary (auto-generated)",
  kpis: "KPI cards",
  analysis: "Analysis (free-text)",
  chartClicksImpressions: "Clicks & impressions chart",
  chartPositionTrend: "Position trend chart",
  keywords: "Tracked keywords",
  backlinks: "Backlinks (pie chart + table)",
  topQueries: "Top queries table",
  topPages: "Top pages table",
  ga4Channels: "GA4 channels table",
  otherTasks: "Other tasks (free-text)",
};

// Defensive parse: accepts partial/legacy configs, fills missing fields with
// the default. Returns the same shape every time.
export function parseTemplateConfig(raw: string | null | undefined): ReportTemplateConfig {
  if (!raw) return DEFAULT_TEMPLATE_CONFIG;
  let obj: Partial<ReportTemplateConfig> = {};
  try {
    obj = JSON.parse(raw);
  } catch {
    return DEFAULT_TEMPLATE_CONFIG;
  }
  return {
    sections: {
      ...DEFAULT_TEMPLATE_CONFIG.sections,
      ...(obj.sections ?? {}),
    },
    layout: {
      ...DEFAULT_TEMPLATE_CONFIG.layout,
      ...(obj.layout ?? {}),
    },
    branding: {
      ...DEFAULT_TEMPLATE_CONFIG.branding,
      ...(obj.branding ?? {}),
    },
  };
}

export function densityClass(d: Density): {
  card: string;
  gap: string;
} {
  switch (d) {
    case "compact":
      return { card: "p-3", gap: "gap-2" };
    case "spacious":
      return { card: "p-7", gap: "gap-5" };
    case "comfortable":
    default:
      return { card: "p-5", gap: "gap-4" };
  }
}

export function kpiGridClass(cols: KpiColumns): string {
  switch (cols) {
    case 3:
      return "grid grid-cols-2 md:grid-cols-3";
    case 4:
      return "grid grid-cols-2 md:grid-cols-4";
    case 6:
      return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6";
    case 5:
    default:
      return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
  }
}

// Ensures a workspace has at least one template, marked as default. Idempotent.
export async function ensureWorkspaceDefaultTemplate(workspaceId: string) {
  const existing = await prisma.reportTemplate.findFirst({
    where: { workspaceId, isDefault: true },
  });
  if (existing) return existing;

  // No default yet — create the built-in Standard template.
  return prisma.reportTemplate.create({
    data: {
      workspaceId,
      name: "Standard report",
      description: "All sections, 5 KPI columns, top 25 rows per table.",
      isDefault: true,
      config: JSON.stringify(DEFAULT_TEMPLATE_CONFIG),
    },
  });
}

// Returns the resolved config for a project — its assigned template, falling
// back to the workspace default, falling back to DEFAULT_TEMPLATE_CONFIG.
export async function loadTemplateForProject(opts: {
  projectId: string;
  workspaceId: string;
  templateId: string | null;
}): Promise<{
  config: ReportTemplateConfig;
  template: { id: string; name: string } | null;
}> {
  if (opts.templateId) {
    const t = await prisma.reportTemplate.findFirst({
      where: { id: opts.templateId, workspaceId: opts.workspaceId },
    });
    if (t) {
      return {
        config: parseTemplateConfig(t.config),
        template: { id: t.id, name: t.name },
      };
    }
  }
  const def = await prisma.reportTemplate.findFirst({
    where: { workspaceId: opts.workspaceId, isDefault: true },
  });
  if (def) {
    return {
      config: parseTemplateConfig(def.config),
      template: { id: def.id, name: def.name },
    };
  }
  return { config: DEFAULT_TEMPLATE_CONFIG, template: null };
}
