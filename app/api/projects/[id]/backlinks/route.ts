import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiProject } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { normalizeCategory } from "@/lib/backlinks";
import { parseRangeFromSearchParams } from "@/lib/date-ranges";

const createSchema = z.object({
  category: z.string().min(1),
  url: z.string().url(),
  place: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  submittedAt: z.string().min(1), // YYYY-MM-DD or ISO
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const url = new URL(request.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const { range } = parseRangeFromSearchParams(sp);

  const backlinks = await prisma.backlink.findMany({
    where: {
      projectId: project.id,
      submittedAt: { gte: range.from, lte: range.to },
    },
    orderBy: { submittedAt: "desc" },
  });
  return NextResponse.json({ backlinks });
}

export async function POST(
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const submittedAt = new Date(parsed.data.submittedAt);
  if (Number.isNaN(submittedAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  submittedAt.setHours(0, 0, 0, 0);

  const created = await prisma.backlink.create({
    data: {
      projectId: project.id,
      category: normalizeCategory(parsed.data.category),
      url: parsed.data.url.trim(),
      place: parsed.data.place?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      submittedAt,
    },
  });
  return NextResponse.json({ backlink: created }, { status: 201 });
}

// Update a single backlink. `id` in the body identifies the row; it's scoped to
// this project so one workspace can't edit another's rows.
const updateSchema = createSchema.partial().extend({ id: z.string().min(1) });

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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.backlink.findFirst({
    where: { id: parsed.data.id, projectId: project.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Backlink not found" }, { status: 404 });
  }

  let submittedAt: Date | undefined;
  if (parsed.data.submittedAt !== undefined) {
    const d = new Date(parsed.data.submittedAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    d.setHours(0, 0, 0, 0);
    submittedAt = d;
  }

  const updated = await prisma.backlink.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.category !== undefined && {
        category: normalizeCategory(parsed.data.category),
      }),
      ...(parsed.data.url !== undefined && { url: parsed.data.url.trim() }),
      ...(parsed.data.place !== undefined && {
        place: parsed.data.place?.trim() || null,
      }),
      ...(parsed.data.notes !== undefined && {
        notes: parsed.data.notes?.trim() || null,
      }),
      ...(submittedAt !== undefined && { submittedAt }),
    },
  });
  return NextResponse.json({ backlink: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const url = new URL(request.url);
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (!ids.length) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }
  const result = await prisma.backlink.deleteMany({
    where: { projectId: project.id, id: { in: ids } },
  });
  return NextResponse.json({ deleted: result.count });
}
