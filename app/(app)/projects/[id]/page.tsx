import { requireProject } from "@/lib/projects";
import { EditableProjectReport } from "@/components/reports/editable-project-report";
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
import { listBacklinkMonthlyStats, listBacklinksInRange } from "@/lib/backlinks";
import { loadTemplateForProject } from "@/lib/templates";

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

  const { config, template } = await loadTemplateForProject({
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

  const [
    overview,
    queries,
    pages,
    ga4Overview,
    ga4Channels,
    keywords,
    backlinks,
    backlinkMonthly,
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

  return (
    <EditableProjectReport
      project={{
        id: project.id,
        name: project.name,
        domain: project.domain,
      }}
      template={template}
      initialConfig={config}
      rangeLabel={formatRangeLabel(range)}
      compare={compare}
      isStub={isStub}
      pdfFilename={pdfFilename}
      overview={overview}
      prevOverview={prevOverview}
      ga4Overview={ga4Overview}
      prevGa4={prevGa4}
      queries={queries.rows}
      pages={pages.rows}
      channels={ga4Channels.rows}
      keywords={keywords}
      backlinks={backlinks}
      backlinkMonthly={backlinkMonthly}
      fromDate={ymd(range.from)}
      toDate={ymd(range.to)}
      mode="live"
    />
  );
}
