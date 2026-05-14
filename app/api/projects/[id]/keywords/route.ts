import { NextResponse } from "next/server";

import { getApiProject } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { keywordsBulkSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  const keywords = await prisma.keyword.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ keywords });
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

  const parsed = keywordsBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { queries, country, device, tag } = parsed.data;
  const uniqueQueries = Array.from(
    new Set(queries.map((q) => q.trim()).filter(Boolean)),
  );

  const data = uniqueQueries.map((q) => ({
    projectId: project.id,
    query: q,
    country,
    device,
    tag: tag ?? null,
  }));

  // SQLite + Prisma: createMany doesn't support skipDuplicates on some versions.
  // Loop with upsert-style handling so re-adding existing keywords doesn't error.
  let created = 0;
  for (const row of data) {
    try {
      await prisma.keyword.create({ data: row });
      created++;
    } catch (err) {
      // Unique constraint hit — keyword already exists for this project/country/device. Skip.
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }

  return NextResponse.json(
    { added: created, requested: data.length },
    { status: 201 },
  );
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
  const result = await prisma.keyword.deleteMany({
    where: { projectId: project.id, id: { in: ids } },
  });
  return NextResponse.json({ deleted: result.count });
}
