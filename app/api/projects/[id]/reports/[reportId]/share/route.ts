import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateShareToken } from "@/lib/saved-reports";
import { shareBaseUrl } from "@/lib/share-url";

// POST: create-or-rotate a shareable token for this report.
// DELETE: revoke the existing token (anyone holding the link gets a 404).

export async function POST(
  _request: Request,
  { params }: { params: { id: string; reportId: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const report = await prisma.savedReport.findFirst({
    where: { id: params.reportId, projectId: project.id },
    select: { id: true },
  });
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let token = "";
  // Retry on the astronomically unlikely collision
  for (let i = 0; i < 5; i++) {
    token = generateShareToken();
    const collision = await prisma.savedReport.findUnique({
      where: { shareToken: token },
      select: { id: true },
    });
    if (!collision) break;
  }

  const updated = await prisma.savedReport.update({
    where: { id: report.id },
    data: { shareToken: token },
    select: { shareToken: true },
  });

  return NextResponse.json({
    token: updated.shareToken,
    url: `${shareBaseUrl()}/r/${updated.shareToken}`,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; reportId: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const report = await prisma.savedReport.findFirst({
    where: { id: params.reportId, projectId: project.id },
    select: { id: true },
  });
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.savedReport.update({
    where: { id: report.id },
    data: { shareToken: null },
  });

  return NextResponse.json({ ok: true });
}
