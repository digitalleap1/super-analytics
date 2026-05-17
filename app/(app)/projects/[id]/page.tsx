import Link from "next/link";
import { ExternalLink, Settings } from "lucide-react";

import { requireProject } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { DownloadPdfButton } from "@/components/reports/download-pdf-button";
import { KpiCard } from "@/components/reports/kpi-card";
import { ClicksImpressionsChart } from "@/components/charts/clicks-impressions-chart";
import { PositionTrendChart } from "@/components/charts/position-trend-chart";
import { ReportTables } from "@/components/reports/report-tables";
import {
  formatRangeLabel,
  parseRangeFromSearchParams,
  previousPeriod,
  ymd,
} from "@/lib/date-ranges";
import { withCache } from "@/lib/cache";
import { getGa4Channels, getGa4Overview } from "@/lib/google/ga4";
import { getGscOverview, getGscPages, getGscQueries } from "@/lib/google/gsc";
import { getKeywordSnapshot } from "@/lib/keywords";
import { KeywordsSummary } from "@/components/reports/keywords-summary";
import {
  densityClass,
  kpiGridClass,
  loadTemplateForProject,
} from "@/lib/templates";
import { cn, formatNumber, formatPosition } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const { project } = await requireProject(params.id);
  return { title: `${project.name} — SEO Dashboard` };
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const { user, workspace, project } = await requireProject(params.id);
  const { range, compare } = parseRangeFromSearchParams(searchParams);
  const prev = compare ? previousPeriod(range) : null;

  const { config: tpl, template } = await loadTemplateForProject({
    projectId: project.id,
    workspaceId: workspace.id,
    templateId: project.templateId,
  });

  const baseOpts = {
    userId: user.id,
    projectId: project.id,
    siteUrl: project.gscSiteUrl,
    from: range.from,
    to: range.to,
  };

  const cacheKey = (suffix: string) => ({
    from: ymd(range.from),
    to: ymd(range.to),
    suffix,
  });

  const [overview, queries, pages, ga4Overview, ga4Channels, keywords] =
    await Promise.all([
      withCache(project.id, "gsc_overview", cacheKey("current"), () =>
        getGscOverview(baseOpts),
      ),
      withCache(project.id, "gsc_queries", cacheKey("current"), () =>
        getGscQueries(baseOpts),
      ),
      withCache(project.id, "gsc_pages", cacheKey("current"), () =>
        getGscPages({ ...baseOpts, domain: project.domain }),
      ),
      withCache(project.id, "ga4_overview", cacheKey("current"), () =>
        getGa4Overview({
          userId: user.id,
          projectId: project.id,
          propertyId: project.ga4PropertyId,
          from: range.from,
          to: range.to,
        }),
      ),
      withCache(project.id, "ga4_channels", cacheKey("current"), () =>
        getGa4Channels({
          userId: user.id,
          projectId: project.id,
          propertyId: project.ga4PropertyId,
          from: range.from,
          to: range.to,
        }),
      ),
      getKeywordSnapshot({
        userId: user.id,
        projectId: project.id,
        siteUrl: project.gscSiteUrl,
        from: range.from,
        to: range.to,
      }),
    ]);

  const prevOverview = prev
    ? await withCache(
        project.id,
        "gsc_overview",
        { from: ymd(prev.from), to: ymd(prev.to), suffix: "prev" },
        () =>
          getGscOverview({
            ...baseOpts,
            from: prev.from,
            to: prev.to,
          }),
      )
    : null;

  const prevGa4 = prev
    ? await withCache(
        project.id,
        "ga4_overview",
        { from: ymd(prev.from), to: ymd(prev.to), suffix: "prev" },
        () =>
          getGa4Overview({
            userId: user.id,
            projectId: project.id,
            propertyId: project.ga4PropertyId,
            from: prev.from,
            to: prev.to,
          }),
      )
    : null;

  const isStub = overview.source === "stub" || ga4Overview.source === "stub";

  const pdfFilename = `${project.name
    .replace(/[^\w-]+/g, "-")
    .toLowerCase()}-${ymd(range.from)}-to-${ymd(range.to)}`;

  const density = densityClass(tpl.layout.density);
  const showAnyTable =
    tpl.sections.topQueries || tpl.sections.topPages || tpl.sections.ga4Channels;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <a
            href={`https://${project.domain}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {project.domain}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {template ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Template:{" "}
              <Link
                href={`/settings/templates/${template.id}`}
                className="text-primary hover:underline"
              >
                {template.name}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker />
          <DownloadPdfButton filename={pdfFilename} targetId="report-pdf" />
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${project.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      <div id="report-pdf" className={cn("bg-background space-y-6", density.gap)}>
        <div className="hidden border-b pb-3 print:block">
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.domain} · {formatRangeLabel(range)}
            {compare ? " · vs. previous period" : ""}
          </p>
          {tpl.branding.headerText ? (
            <p className="mt-1 text-sm">{tpl.branding.headerText}</p>
          ) : null}
        </div>

        {isStub ? (
          <Card className="border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 print:hidden">
            Showing <strong>sample data</strong> — connect this project to
            Google Search Console and Analytics in project settings (or set
            Google OAuth credentials in <code>.env</code>) to load live numbers.
          </Card>
        ) : null}

        {tpl.sections.kpis ? (
          <div className={cn(kpiGridClass(tpl.layout.kpiColumns), density.gap)}>
            <KpiCard
              label="Clicks"
              value={formatNumber(overview.totals.clicks)}
              current={overview.totals.clicks}
              previous={prevOverview?.totals.clicks}
            />
            <KpiCard
              label="Impressions"
              value={formatNumber(overview.totals.impressions)}
              current={overview.totals.impressions}
              previous={prevOverview?.totals.impressions}
            />
            <KpiCard
              label="Avg position"
              value={formatPosition(overview.totals.position)}
              current={overview.totals.position}
              previous={prevOverview?.totals.position}
              invertDelta
            />
            <KpiCard
              label="Users"
              value={formatNumber(ga4Overview.totals.totalUsers)}
              current={ga4Overview.totals.totalUsers}
              previous={prevGa4?.totals.totalUsers}
            />
            <KpiCard
              label="Key events"
              value={formatNumber(ga4Overview.totals.keyEvents)}
              current={ga4Overview.totals.keyEvents}
              previous={prevGa4?.totals.keyEvents}
            />
          </div>
        ) : null}

        {tpl.sections.chartClicksImpressions ||
        tpl.sections.chartPositionTrend ? (
          <div className={cn("grid grid-cols-1 lg:grid-cols-2", density.gap)}>
            {tpl.sections.chartClicksImpressions ? (
              <Card className={density.card}>
                <h3 className="text-sm font-medium">Clicks &amp; impressions</h3>
                <p className="text-xs text-muted-foreground">
                  Daily totals across the selected range.
                </p>
                <div className="mt-4">
                  <ClicksImpressionsChart data={overview.series} />
                </div>
              </Card>
            ) : null}
            {tpl.sections.chartPositionTrend ? (
              <Card className={density.card}>
                <h3 className="text-sm font-medium">Position trend</h3>
                <p className="text-xs text-muted-foreground">
                  Average position — lower is better.
                </p>
                <div className="mt-4">
                  <PositionTrendChart data={overview.series} />
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}

        {tpl.sections.keywords ? (
          <KeywordsSummary
            projectId={project.id}
            projectName={project.name}
            rows={keywords}
            limit={tpl.layout.tableLimit}
          />
        ) : null}

        {showAnyTable ? (
          <ReportTables
            projectName={project.name}
            queries={tpl.sections.topQueries ? queries.rows : []}
            pages={tpl.sections.topPages ? pages.rows : []}
            channels={tpl.sections.ga4Channels ? ga4Channels.rows : []}
            showQueries={tpl.sections.topQueries}
            showPages={tpl.sections.topPages}
            showChannels={tpl.sections.ga4Channels}
            rowLimit={tpl.layout.tableLimit}
          />
        ) : null}

        {tpl.branding.footerText ? (
          <p className="border-t pt-4 text-center text-xs text-muted-foreground">
            {tpl.branding.footerText}
          </p>
        ) : null}
      </div>
    </div>
  );
}
