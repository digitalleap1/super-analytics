import { NextResponse } from "next/server";

import { getApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { projectCreateSchema } from "@/lib/validators";

export async function GET() {
  const { workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      domain: true,
      logoUrl: true,
      gscSiteUrl: true,
      ga4PropertyId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const { workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: parsed.data.name,
      domain: parsed.data.domain,
      logoUrl: parsed.data.logoUrl ?? null,
    },
    select: { id: true, name: true, domain: true },
  });

  return NextResponse.json({ project }, { status: 201 });
}
