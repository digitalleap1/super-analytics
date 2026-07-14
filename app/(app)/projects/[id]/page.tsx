import { requireProject } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { EditableProjectReport } from "@/components/reports/editable-project-report";
import {
  formatRangeLabel,
  parseRangeFromSearchParams,
  previousPeriod,
  reportPeriodLabel,
  ymd,
} from "@/lib/date-ranges";
import { withCache } from "@/lib/cache";
import { getGa4Channels, getGa4Overview } from "@/lib/google/ga4";
import { getGscOverview, getGscPages, getGscQueries } from "@/lib/google/gsc";
import { getKeywordSnapshot } from "@/lib/keywords";
import {
  listAllBacklinks,
  listBacklinkMonthlyStats,
  listBacklinksInRange,
} from "@/lib/backlinks";
import { buildReportSummary } from "@/lib/report-summary";
import { loadTemplateForProject } from "@/lib/templates";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const { project } = await requireProject(params.id);
  return { title: `${project.name} — Super Analytics` };
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

  const [{ config, template }, allTemplates] = await Promise.all([
    loadTemplateForProject({
      projectId: project.id,
      workspaceId: workspace.id,
      templateId: project.templateId,
    }),
    prisma.reportTemplate.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isDefault: true },
    }),
  ]);

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

  const [
    overview,
    queries,
    pages,
    ga4Overview,
    ga4Channels,
    keywords,
    backlinks,
    backlinkMonthly,
    allBacklinks,
  ] = await Promise.all([
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
      listBacklinksInRange({
        projectId: project.id,
        from: range.from,
        to: range.to,
      }),
      listBacklinkMonthlyStats({
        projectId: project.id,
        monthsBack: 6,
      }),
      // Every backlink, so entries dated outside the report range (e.g. one
      // logged today, while the range lags) can still be seen and edited.
      listAllBacklinks(project.id),
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

  const [prevGa4, prevQueries, prevPages, prevChannels] = prev
    ? await Promise.all([
        withCache(
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
        ),
        withCache(
          project.id,
          "gsc_queries",
          { from: ymd(prev.from), to: ymd(prev.to), suffix: "prev" },
          () =>
            getGscQueries({
              ...baseOpts,
              from: prev.from,
              to: prev.to,
            }),
        ),
        withCache(
          project.id,
          "gsc_pages",
          { from: ymd(prev.from), to: ymd(prev.to), suffix: "prev" },
          () =>
            getGscPages({
              ...baseOpts,
              domain: project.domain,
              from: prev.from,
              to: prev.to,
            }),
        ),
        withCache(
          project.id,
          "ga4_channels",
          { from: ymd(prev.from), to: ymd(prev.to), suffix: "prev" },
          () =>
            getGa4Channels({
              userId: user.id,
              projectId: project.id,
              propertyId: project.ga4PropertyId,
              from: prev.from,
              to: prev.to,
            }),
        ),
      ])
    : [null, null, null, null];

  // The stub banner reflects the project's connection state, NOT the live API
  // result. If the project IS connected (GSC site URL + GA4 property both set)
  // we treat the numbers as live, even if a token blip caused a stub fallback
  // this request — that's a transient error, not a "sample data" situation.
  const hasGsc = !!project.gscSiteUrl;
  const hasGa4 = !!project.ga4PropertyId;
  const isStub = !hasGsc && !hasGa4;

  const pdfFilename = `${project.name
    .replace(/[^\w-]+/g, "-")
    .toLowerCase()}-${ymd(range.from)}-to-${ymd(range.to)}`;

  const summary = buildReportSummary({
    gsc: overview,
    prevGsc: prevOverview,
    ga4: ga4Overview,
    prevGa4,
    hasGsc,
    hasGa4,
  });

  return (
    <EditableProjectReport
      project={{
        id: project.id,
        name: project.name,
        domain: project.domain,
        logoUrl: project.logoUrl,
      }}
      template={template}
      initialConfig={config}
      rangeLabel={formatRangeLabel(range)}
      compare={compare}
      isStub={isStub}
      hasGsc={hasGsc}
      hasGa4={hasGa4}
      pdfFilename={pdfFilename}
      overview={overview}
      prevOverview={prevOverview}
      ga4Overview={ga4Overview}
      prevGa4={prevGa4}
      queries={queries.rows}
      prevQueries={prevQueries?.rows ?? null}
      pages={pages.rows}
      prevPages={prevPages?.rows ?? null}
      channels={ga4Channels.rows}
      prevChannels={prevChannels?.rows ?? null}
      keywords={keywords}
      backlinks={backlinks}
      allBacklinks={allBacklinks}
      backlinkMonthly={backlinkMonthly}
      fromDate={ymd(range.from)}
      toDate={ymd(range.to)}
      reportPeriodLabel={reportPeriodLabel(range)}
      mode="live"
      summary={summary}
      analysisNotes={project.analysisNotes}
      otherTasks={project.otherTasks}
      availableTemplates={allTemplates}
      currentTemplateId={project.templateId}
    />
  );
}
