import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { clearProjectCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { projectUpdateSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;
  return NextResponse.json({ project });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.domain !== undefined && { domain: parsed.data.domain }),
      ...(parsed.data.logoUrl !== undefined && {
        logoUrl: parsed.data.logoUrl,
      }),
      ...(parsed.data.gscSiteUrl !== undefined && {
        gscSiteUrl: parsed.data.gscSiteUrl,
      }),
      ...(parsed.data.ga4PropertyId !== undefined && {
        ga4PropertyId: parsed.data.ga4PropertyId,
      }),
      ...(parsed.data.templateId !== undefined && {
        templateId: parsed.data.templateId,
      }),
      // Free-text report fields. These were validated but never written, so
      // "Save" reported success while the value was silently dropped.
      ...(parsed.data.analysisNotes !== undefined && {
        analysisNotes: parsed.data.analysisNotes,
      }),
      ...(parsed.data.otherTasks !== undefined && {
        otherTasks: parsed.data.otherTasks,
      }),
    },
  });

  // Connection changed → drop cached GSC/GA4 payloads so the next page render
  // refetches against the new site/property instead of showing stale data.
  const connectionChanged =
    parsed.data.gscSiteUrl !== undefined ||
    parsed.data.ga4PropertyId !== undefined;
  if (connectionChanged) {
    await clearProjectCache(project.id);
  }

  return NextResponse.json({ project: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  await prisma.project.delete({ where: { id: project.id } });
  return NextResponse.json({ ok: true });
}
