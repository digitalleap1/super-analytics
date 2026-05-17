import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiProject } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  snapshot: z.string().min(2), // pre-stringified JSON
  fromDate: z.string().min(8),
  toDate: z.string().min(8),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const reports = await prisma.savedReport.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fromDate: true,
      toDate: true,
      shareToken: true,
      createdById: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ reports });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { user, project, response } = await getApiProject(params.id);
  if (!project || !user) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Validate the snapshot is parseable JSON (we don't enforce shape since
  // schema is internal; clients just round-trip it).
  try {
    JSON.parse(parsed.data.snapshot);
  } catch {
    return NextResponse.json(
      { error: "Snapshot is not valid JSON" },
      { status: 400 },
    );
  }

  const fromDate = new Date(parsed.data.fromDate);
  const toDate = new Date(parsed.data.toDate);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const created = await prisma.savedReport.create({
    data: {
      projectId: project.id,
      name: parsed.data.name.trim(),
      fromDate,
      toDate,
      snapshot: parsed.data.snapshot,
      createdById: user.id,
    },
    select: { id: true, name: true, createdAt: true },
  });
  return NextResponse.json({ report: created }, { status: 201 });
}
