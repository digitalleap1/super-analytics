import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string; reportId: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;
  const report = await prisma.savedReport.findFirst({
    where: { id: params.reportId, projectId: project.id },
  });
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ report });
}

export async function DELETE(
  _req: Request,
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
  await prisma.savedReport.delete({ where: { id: report.id } });
  return NextResponse.json({ ok: true });
}
