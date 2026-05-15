import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { withCache } from "@/lib/cache";
import { getGscPages } from "@/lib/google/gsc";
import { parseRangeFromSearchParams, ymd } from "@/lib/date-ranges";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { user, project, response } = await getApiProject(params.id);
  if (!project || !user) return response;

  const url = new URL(request.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const { range } = parseRangeFromSearchParams(sp);

  const data = await withCache(
    project.id,
    "gsc_pages",
    { from: ymd(range.from), to: ymd(range.to), suffix: "api" },
    () =>
      getGscPages({
        userId: user.id,
        projectId: project.id,
        siteUrl: project.gscSiteUrl,
        from: range.from,
        to: range.to,
        domain: project.domain,
      }),
  );

  return NextResponse.json(data);
}
